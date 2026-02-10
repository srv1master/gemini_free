const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const SCRIPT_DIR = __dirname;
const CREDS_FILE = path.join(SCRIPT_DIR, 'oauth_creds.json');
const INSTALL_ID_FILE = path.join(SCRIPT_DIR, 'installation_id');
const SECRETS_FILE = path.join(SCRIPT_DIR, 'secrets.json');
const HISTORY_FILE = path.join(SCRIPT_DIR, 'history.json');
const CONFIG_FILE = path.join(SCRIPT_DIR, 'config.json');
const CHATS_DIR = path.join(SCRIPT_DIR, 'chats');

// Sicherstellen, dass Chats-Verzeichnis existiert
if (!fs.existsSync(CHATS_DIR)) fs.mkdirSync(CHATS_DIR);

// Konfiguration laden
const config = fs.existsSync(CONFIG_FILE)
    ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
    : { 
        PORT: 3000, 
        MODEL_NAME: "gemini-3-flash-preview", 
        MAX_RETRIES: 5, 
        HISTORY_LIMIT: 40,
        RETRY_DELAY_MS: 1000,
        TIMEZONE: "Europe/Berlin",
        LOCALE: "de-DE",
        APP_NAME: "MyAI Control Panel",
        LOADING_TEXT: "KI analysiert"
      };

// OAuth Konfiguration laden
const secrets = fs.existsSync(SECRETS_FILE) 
    ? JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf8')) 
    : { CLIENT_ID: 'YOUR_CLIENT_ID', CLIENT_SECRET: 'YOUR_CLIENT_SECRET' };

const CLIENT_ID = secrets.CLIENT_ID;
const CLIENT_SECRET = secrets.CLIENT_SECRET;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Historie laden/speichern (Multi-Chat Support)
function getChatDir(chatId) {
    const dir = path.join(CHATS_DIR, chatId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function loadHistory(chatId = "default") {
    const historyPath = path.join(getChatDir(chatId), 'history.json');
    if (fs.existsSync(historyPath)) {
        try { return JSON.parse(fs.readFileSync(historyPath, 'utf8')); } catch (e) { return []; }
    }
    return [];
}

function saveHistory(history, chatId = "default") {
    const historyPath = path.join(getChatDir(chatId), 'history.json');
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
}

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
async function askGeminiExtended(userPrompt, chatId = "default", retryCount = 0) {
    const MAX_RETRIES = config.MAX_RETRIES;
    if (!fs.existsSync(CREDS_FILE)) {
        throw new Error('Credentials (oauth_creds.json) nicht gefunden. Bitte zuerst login ausführen.');
    }
    if (!fs.existsSync(INSTALL_ID_FILE)) {
        throw new Error('installation_id Datei nicht gefunden.');
    }

    let creds = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
    const installId = fs.readFileSync(INSTALL_ID_FILE, 'utf8').replace(/[\r\n]/g, '').trim();
    let accessToken = creds.access_token;

    // Historie für spezifischen Chat laden
    let history = loadHistory(chatId);
    const now = new Date().toLocaleString(config.LOCALE, { timeZone: config.TIMEZONE });
    
    // Aktuelle Nachricht mit Zeitstempel erstellen
    const currentMessage = { 
        role: "user", 
        parts: [{ text: userPrompt }],
        timestamp: now 
    };
    
    // Anfrage-Array für Gemini aufbauen (Zeitstempel in den Text injizieren)
    const contents = history.map(msg => ({
        role: msg.role,
        parts: [{ text: `[Zeitstempel: ${msg.timestamp}] ${msg.parts[0].text}` }]
    }));
    contents.push({
        role: "user",
        parts: [{ text: `[Zeitstempel: ${now}] ${userPrompt}` }]
    });

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
            return askGeminiExtended(userPrompt, chatId, retryCount + 1);
        }

        if (loadResp.status === 429 && retryCount < MAX_RETRIES) {
            const waitTime = Math.pow(2, retryCount) * config.RETRY_DELAY_MS + Math.random() * 1000;
            console.log(`[${chatId}] API Limit (429) bei Init. Warte ${Math.round(waitTime/1000)}s... (${retryCount + 1}/${MAX_RETRIES})`);
            await sleep(waitTime);
            return askGeminiExtended(userPrompt, chatId, retryCount + 1);
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
                model: config.MODEL_NAME, 
                project: projectId,
                request: {
                    contents: contents
                }
            })
        });

        if (genResp.status === 429 && retryCount < MAX_RETRIES) {
            const waitTime = Math.pow(2, retryCount) * config.RETRY_DELAY_MS + Math.random() * 1000;
            console.log(`[${chatId}] API Limit (429) bei Generierung. Warte ${Math.round(waitTime/1000)}s... (${retryCount + 1}/${MAX_RETRIES})`);
            await sleep(waitTime);
            return askGeminiExtended(userPrompt, chatId, retryCount + 1);
        }

        if (!genResp.ok) {
            const errorText = await genResp.text();
            throw new Error(`Gemini API Fehler: ${genResp.statusText} (${genResp.status}) - ${errorText}`);
        }

        const genData = await genResp.json();
        if (genData.response && genData.response.candidates) {
            const botText = genData.response.candidates[0].content.parts[0].text;
            const botNow = new Date().toLocaleString(config.LOCALE, { timeZone: config.TIMEZONE });
            
            // Historie aktualisieren und speichern
            history.push(currentMessage);
            history.push({ 
                role: "model", 
                parts: [{ text: botText }],
                timestamp: botNow
            });
            
            if (history.length > config.HISTORY_LIMIT) history = history.slice(-config.HISTORY_LIMIT);
            saveHistory(history, chatId);
            
            return { text: botText, timestamp: botNow, userTimestamp: now };
        } else {
            throw new Error("Unerwartete Antwortstruktur von der API");
        }
    } catch (err) {
        if (err.message.includes('401') && retryCount === 0) {
            await refreshAccessToken();
            return askGeminiExtended(userPrompt, chatId, retryCount + 1);
        }
        if (err.message.includes('429') && retryCount < MAX_RETRIES) {
            const waitTime = Math.pow(2, retryCount) * config.RETRY_DELAY_MS + Math.random() * 1000;
            console.log(`[${chatId}] Limit (429) erkannt. Warte ${Math.round(waitTime/1000)}s...`);
            await sleep(waitTime);
            return askGeminiExtended(userPrompt, chatId, retryCount + 1);
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

    // Route: GET /api/history -> Historie abrufen
    if (req.method === 'GET' && req.url.startsWith('/api/history')) {
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const chatId = urlObj.searchParams.get('chatId') || "default";
        const history = loadHistory(chatId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ history }));
        return;
    }

    // Route: GET /api/chats -> Alle Chats auflisten
    if (req.method === 'GET' && req.url === '/api/chats') {
        const chats = fs.readdirSync(CHATS_DIR).filter(file => {
            return fs.statSync(path.join(CHATS_DIR, file)).isDirectory();
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ chats }));
        return;
    }

    // Route: POST /api/chats -> Neuen Chat erstellen
    if (req.method === 'POST' && req.url === '/api/chats') {
        const chatId = "Chat_" + Date.now();
        getChatDir(chatId);
        saveHistory([], chatId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ chatId }));
        return;
    }

    // Route: GET /api/config -> Konfiguration abrufen
    if (req.method === 'GET' && req.url === '/api/config') {
        const publicConfig = {
            APP_NAME: config.APP_NAME,
            LOADING_TEXT: config.LOADING_TEXT
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(publicConfig));
        return;
    }

    // Route: POST /api/clear -> Historie löschen
    if (req.method === 'POST' && req.url === '/api/clear') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const { chatId } = JSON.parse(body || '{}');
            saveHistory([], chatId || "default");
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
        return;
    }

    // Route: POST /api/chat -> MyAI Anfrage
    if (req.method === 'POST' && req.url === '/api/chat') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { prompt, index, chatId } = JSON.parse(body);
                const id = chatId || "default";
                
                if (!prompt) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Kein Prompt angegeben" }));
                    return;
                }

                // Falls ein Index übergeben wurde (Edit-Modus), Historie SOFORT kürzen
                if (typeof index === 'number') {
                    let history = loadHistory(id);
                    if (index >= 0 && index < history.length) {
                        console.log(`[EDIT] [${id}] Kürze Historie: Entferne alles ab Index ${index}`);
                        history = history.slice(0, index);
                        saveHistory(history, id);
                    }
                }

                // Hier muss askGemini angepasst werden, um die chatId zu verwenden
                const answer = await askGeminiExtended(prompt, id);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ answer }));
            } catch (err) {
                console.error("[API ERROR]", err);
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

server.listen(config.PORT, () => {
    console.log(`
🚀 ${config.APP_NAME} läuft auf: http://localhost:${config.PORT}`);
    console.log(`Drücke Strg+C zum Beenden.`);
});

