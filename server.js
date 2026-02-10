const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const SCRIPT_DIR = __dirname;
const CREDS_FILE = path.join(SCRIPT_DIR, 'oauth_creds.json');
const INSTALL_ID_FILE = path.join(SCRIPT_DIR, 'installation_id');

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
async function askGemini(userPrompt) {
    if (!fs.existsSync(CREDS_FILE)) {
        throw new Error('Credentials (oauth_creds.json) nicht gefunden. Bitte zuerst login ausführen.');
    }
    if (!fs.existsSync(INSTALL_ID_FILE)) {
        throw new Error('installation_id Datei nicht gefunden.');
    }

    const creds = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
    const installId = fs.readFileSync(INSTALL_ID_FILE, 'utf8').replace(/[\r\n]/g, '').trim();
    const accessToken = creds.access_token;

    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.85.1 Chrome/114.0.5735.289 Electron/25.9.7 Safari/537.36',
        'x-gemini-api-privileged-user-id': installId,
        'x-goog-api-client': 'vscode-extension/gemini'
    };

    // 1. Project ID abrufen
    const loadResp = await fetch('https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            metadata: { ideType: "IDE_UNSPECIFIED", platform: "PLATFORM_UNSPECIFIED", pluginType: "GEMINI" }
        })
    });

    if (!loadResp.ok) throw new Error(`Init Fehler: ${loadResp.statusText}`);
    
    const loadData = await loadResp.json();
    const projectId = loadData.cloudaicompanionProject;
    
    if (!projectId) throw new Error("Keine Project ID gefunden.");

    // 2. Anfrage an Gemini
    const genResp = await fetch('https://cloudcode-pa.googleapis.com/v1internal:generateContent', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            model: "gemini-3-flash-preview", 
            project: projectId,
            request: {
                contents: [{ role: "user", parts: [{ text: userPrompt }] }]
            }
        })
    });

    if (!genResp.ok) {
        const errorText = await genResp.text();
        console.error(`\n--- API FEHLER DETAILS ---`);
        console.error(`Status: ${genResp.status} ${genResp.statusText}`);
        console.error(`Body: ${errorText}`);
        console.error(`--------------------------\n`);
        throw new Error(`Gemini API Fehler: ${genResp.statusText} (${genResp.status})`);
    }

    const genData = await genResp.json();
    if (genData.response && genData.response.candidates) {
        return genData.response.candidates[0].content.parts[0].text;
    } else {
        throw new Error("Unerwartete Antwortstruktur von der API");
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
