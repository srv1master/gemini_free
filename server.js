const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const SCRIPT_DIR = __dirname;
const CREDS_FILE = path.join(SCRIPT_DIR, 'oauth_creds.json');
const INSTALL_ID_FILE = path.join(SCRIPT_DIR, 'installation_id');
const SECRETS_FILE = path.join(SCRIPT_DIR, 'secrets.json');

// OAuth Konfiguration laden
const secrets = fs.existsSync(SECRETS_FILE) 
    ? JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf8')) 
    : { CLIENT_ID: 'YOUR_CLIENT_ID', CLIENT_SECRET: 'YOUR_CLIENT_SECRET' };

const CLIENT_ID = secrets.CLIENT_ID;
const CLIENT_SECRET = secrets.CLIENT_SECRET;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function refreshAccessToken() {
    console.log('Versuche Access Token zu erneuern...');
    if (!fs.existsSync(CREDS_FILE)) throw new Error('Keine Credentials zum Refresh gefunden.');
    
    const creds = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
    if (!creds.refresh_token) throw new Error('Kein Refresh Token vorhanden. Bitte manuell neu einloggen (node standalone.js).');

    const postData = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: creds.refresh_token,
        grant_type: 'refresh_token'
    }).toString();

    const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: postData
    });

    const data = await resp.json();
    if (data.access_token) {
        creds.access_token = data.access_token;
        if (data.refresh_token) creds.refresh_token = data.refresh_token;
        fs.writeFileSync(CREDS_FILE, JSON.stringify(creds, null, 2));
        console.log('Access Token erfolgreich erneuert.');
        return data.access_token;
    } else {
        throw new Error(`Refresh fehlgeschlagen: ${JSON.stringify(data)}`);
    }
}

// Helper: Serviert statische Dateien (HTML)
const serveFile = (res, filePath, contentType) => {
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500);
            res.end(`Fehler beim Laden der Datei: ${err.code}`);
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
};

// Helper: Logik aus gemini-direct.js
async function askGemini(userPrompt, retryCount = 0) {
    const MAX_RETRIES = 3;
    if (!fs.existsSync(CREDS_FILE)) {
        throw new Error('Credentials (oauth_creds.json) nicht gefunden. Bitte zuerst login ausführen.');
    }
    if (!fs.existsSync(INSTALL_ID_FILE)) {
        throw new Error('installation_id Datei nicht gefunden.');
    }

    let creds = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
    const installId = fs.readFileSync(INSTALL_ID_FILE, 'utf8').replace(/[\r\n]/g, '').trim();
    let accessToken = creds.access_token;

    const getHeaders = (token) => ({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.85.1 Chrome/114.0.5735.289 Electron/25.9.7 Safari/537.36',
        'x-gemini-api-privileged-user-id': installId,
        'x-goog-api-client': 'vscode-extension/gemini'
    });

    try {
        // 1. Project ID abrufen
        let loadResp = await fetch('https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist', {
            method: 'POST',
            headers: getHeaders(accessToken),
            body: JSON.stringify({
                metadata: { ideType: "IDE_UNSPECIFIED", platform: "PLATFORM_UNSPECIFIED", pluginType: "GEMINI" }
            })
        });

        if (loadResp.status === 401 && retryCount === 0) {
            accessToken = await refreshAccessToken();
            return askGemini(userPrompt, retryCount + 1);
        }

        if (loadResp.status === 429 && retryCount < MAX_RETRIES) {
            console.log(`API Limit (429) bei Init. Warte 3s... (${retryCount + 1}/${MAX_RETRIES})`);
            await sleep(3000);
            return askGemini(userPrompt, retryCount + 1);
        }

        if (!loadResp.ok) throw new Error(`Init Fehler: ${loadResp.statusText} (${loadResp.status})`);
        
        const loadData = await loadResp.json();
        const projectId = loadData.cloudaicompanionProject;
        
        if (!projectId) throw new Error("Keine Project ID gefunden.");

        // 2. Anfrage an Gemini
        const genResp = await fetch('https://cloudcode-pa.googleapis.com/v1internal:generateContent', {
            method: 'POST',
            headers: getHeaders(accessToken),
            body: JSON.stringify({
                model: "gemini-3-flash-preview", 
                project: projectId,
                request: {
                    contents: [{ role: "user", parts: [{ text: userPrompt }] }]
                }
            })
        });

        if (genResp.status === 429 && retryCount < MAX_RETRIES) {
            console.log(`API Limit (429) bei Generierung. Warte 3s... (${retryCount + 1}/${MAX_RETRIES})`);
            await sleep(3000);
            return askGemini(userPrompt, retryCount + 1);
        }

        if (!genResp.ok) {
            const errorText = await genResp.text();
            throw new Error(`Gemini API Fehler: ${genResp.statusText} (${genResp.status}) - ${errorText}`);
        }

        const genData = await genResp.json();
        if (genData.response && genData.response.candidates) {
            return genData.response.candidates[0].content.parts[0].text;
        } else {
            throw new Error("Unerwartete Antwortstruktur von der API");
        }
    } catch (err) {
        if (err.message.includes('401') && retryCount === 0) {
            await refreshAccessToken();
            return askGemini(userPrompt, retryCount + 1);
        }
        if (err.message.includes('429') && retryCount < MAX_RETRIES) {
            console.log(`Limit (429) erkannt. Warte 3s...`);
            await sleep(3000);
            return askGemini(userPrompt, retryCount + 1);
        }
        throw err;
    }
}

const server = http.createServer(async (req, res) => {
    // CORS Header für alle Fälle
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Route: GET / -> Zeige UI
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
        serveFile(res, path.join(SCRIPT_DIR, 'index.html'), 'text/html');
        return;
    }

    // Route: POST /api/chat -> Gemini Anfrage
    if (req.method === 'POST' && req.url === '/api/chat') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { prompt } = JSON.parse(body);
                if (!prompt) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Kein Prompt angegeben" }));
                    return;
                }

                const answer = await askGemini(prompt);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ answer }));
            } catch (err) {
                console.error(err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // 404
    res.writeHead(404);
    res.end('Nicht gefunden');
});

server.listen(PORT, () => {
    console.log(`
🚀 Gemini WebUI läuft auf: http://localhost:${PORT}`);
    console.log(`Drücke Strg+C zum Beenden.`);
});
