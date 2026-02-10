const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const SCRIPT_DIR = __dirname;
const ROOT_DIR = path.join(SCRIPT_DIR, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const CREDS_FILE = path.join(DATA_DIR, 'oauth_creds.json');
const INSTALL_ID_FILE = path.join(DATA_DIR, 'installation_id');
const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const CHATS_DIR = path.join(DATA_DIR, 'chats');
const MASTER_PROMPT_FILE = path.join(DATA_DIR, 'master_prompt.md');

// Sicherstellen, dass Verzeichnisse existieren
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(CHATS_DIR)) fs.mkdirSync(CHATS_DIR);
if (!fs.existsSync(MASTER_PROMPT_FILE)) fs.writeFileSync(MASTER_PROMPT_FILE, "");

// Konfiguration laden
let config = fs.existsSync(CONFIG_FILE)
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
        LOADING_TEXT: "KI analysiert",
        GLOBAL_SYSTEM_PROMPT: "",
        LAST_CHAT_ID: "" // Neu: Verfolgung des letzten Chats
      };

function saveConfig() {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Initialer Check
if (fs.readdirSync(CHATS_DIR).length === 0) {
    const id = "Mein_erster_Chat";
    config.LAST_CHAT_ID = id;
    saveConfig();
    const dir = path.join(CHATS_DIR, id);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'history.json'), JSON.stringify({ history: [] }, null, 2));
}

function getChatDir(chatId) {
    const dir = path.join(CHATS_DIR, chatId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function getGlobalPrompt() {
    return fs.existsSync(MASTER_PROMPT_FILE) ? fs.readFileSync(MASTER_PROMPT_FILE, 'utf8') : "";
}

function getAgentPrompt(chatId) {
    const p = path.join(getChatDir(chatId), 'agent_prompt.md');
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : "";
}

function loadSessionData(chatId) {
    if (!chatId) return { history: [] };
    const historyPath = path.join(getChatDir(chatId), 'history.json');
    if (fs.existsSync(historyPath)) {
        try { 
            const data = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
            return { history: Array.isArray(data) ? data : (data.history || []) };
        } catch (e) { return { history: [] }; }
    }
    return { history: [] };
}

function saveSessionHistory(chatId, history) {
    if (!chatId) return;
    const historyPath = path.join(getChatDir(chatId), 'history.json');
    fs.writeFileSync(historyPath, JSON.stringify({ history }, null, 2));
    // Setze als letzten Chat
    if (config.LAST_CHAT_ID !== chatId) {
        config.LAST_CHAT_ID = chatId;
        saveConfig();
    }
}

async function refreshAccessToken() {
    if (!fs.existsSync(CREDS_FILE)) throw new Error('Credentials missing');
    const creds = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
    const secrets = fs.existsSync(SECRETS_FILE) ? JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf8')) : {};
    const postData = new URLSearchParams({
        client_id: secrets.CLIENT_ID, client_secret: secrets.CLIENT_SECRET,
        refresh_token: creds.refresh_token, grant_type: 'refresh_token'
    }).toString();
    const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: postData
    });
    const data = await resp.json();
    if (data.access_token) {
        creds.access_token = data.access_token;
        fs.writeFileSync(CREDS_FILE, JSON.stringify(creds, null, 2));
        return data.access_token;
    }
    throw new Error('Refresh failed');
}

async function askGeminiExtended(userPrompt, chatId = "default", retryCount = 0) {
    const installId = fs.readFileSync(INSTALL_ID_FILE, 'utf8').trim();
    let creds = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
    let session = loadSessionData(chatId);
    const globalPrompt = getGlobalPrompt();
    const agentPrompt = getAgentPrompt(chatId);
    const now = new Date().toLocaleString(config.LOCALE, { timeZone: config.TIMEZONE });
    const contents = [];
    
    if (globalPrompt.trim() !== "") {
        contents.push({ role: "user", parts: [{ text: `MASTER-DIREKTIVE:\n${globalPrompt}` }] });
        contents.push({ role: "model", parts: [{ text: "Master-Direktive akzeptiert." }] });
    }
    if (agentPrompt.trim() !== "") {
        contents.push({ role: "user", parts: [{ text: `AGENTEN-PROMPT:\n${agentPrompt}` }] });
        contents.push({ role: "model", parts: [{ text: "Agenten-Rolle verstanden." }] });
    }
    session.history.forEach(msg => {
        contents.push({ role: msg.role, parts: [{ text: `[Zeitstempel: ${msg.timestamp}] ${msg.parts[0].text}` }] });
    });
    contents.push({ role: "user", parts: [{ text: `[Zeitstempel: ${now}] ${userPrompt}` }] });

    const headers = {
        'Authorization': `Bearer ${creds.access_token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 Code/1.85.1',
        'x-gemini-api-privileged-user-id': installId,
        'x-goog-api-client': 'vscode-extension/gemini'
    };

    try {
        let loadResp = await fetch('https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist', {
            method: 'POST', headers, body: JSON.stringify({ metadata: { ideType: "IDE_UNSPECIFIED", platform: "PLATFORM_UNSPECIFIED", pluginType: "GEMINI" } })
        });
        if (loadResp.status === 401 && retryCount === 0) {
            headers.Authorization = `Bearer ${await refreshAccessToken()}`;
            return askGeminiExtended(userPrompt, chatId, retryCount + 1);
        }
        const { cloudaicompanionProject: projectId } = await loadResp.json();
        const genResp = await fetch('https://cloudcode-pa.googleapis.com/v1internal:generateContent', {
            method: 'POST', headers, body: JSON.stringify({ model: config.MODEL_NAME, project: projectId, request: { contents } })
        });
        if (genResp.status === 429 && retryCount < config.MAX_RETRIES) {
            await new Promise(r => setTimeout(r, Math.pow(2, retryCount) * 1000));
            return askGeminiExtended(userPrompt, chatId, retryCount + 1);
        }
        const genData = await genResp.json();
        const botText = genData.response.candidates[0].content.parts[0].text;
        const botNow = new Date().toLocaleString(config.LOCALE, { timeZone: config.TIMEZONE });
        session.history.push({ role: "user", parts: [{ text: userPrompt }], timestamp: now });
        session.history.push({ role: "model", parts: [{ text: botText }], timestamp: botNow });
        if (session.history.length > config.HISTORY_LIMIT) session.history = session.history.slice(-config.HISTORY_LIMIT);
        saveSessionHistory(chatId, session.history);
        return { text: botText, timestamp: botNow };
    } catch (err) { throw err; }
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const chatId = urlObj.searchParams.get('chatId') || "default";

    if (req.method === 'GET' && req.url === '/api/config') {
        res.end(JSON.stringify({...config, GLOBAL_SYSTEM_PROMPT: getGlobalPrompt()})); return;
    }

    if (req.method === 'POST' && req.url === '/api/select-chat') {
        let body = ''; req.on('data', c => body += c);
        req.on('end', () => {
            const { chatId: cid } = JSON.parse(body);
            if (fs.existsSync(path.join(CHATS_DIR, cid))) {
                config.LAST_CHAT_ID = cid;
                saveConfig();
                res.end(JSON.stringify({ success: true }));
            } else {
                res.writeHead(404); res.end(JSON.stringify({ error: "Chat nicht gefunden" }));
            }
        }); return;
    }

    if (req.method === 'POST' && req.url === '/api/global-prompt') {
        let body = ''; req.on('data', c => body += c);
        req.on('end', () => {
            const { globalPrompt } = JSON.parse(body);
            fs.writeFileSync(MASTER_PROMPT_FILE, globalPrompt);
            res.end(JSON.stringify({ success: true }));
        }); return;
    }

    if (req.method === 'POST' && req.url === '/api/system-prompt') {
        let body = ''; req.on('data', c => body += c);
        req.on('end', () => {
            const { chatId: cid, systemPrompt } = JSON.parse(body);
            fs.writeFileSync(path.join(getChatDir(cid), 'agent_prompt.md'), systemPrompt);
            res.end(JSON.stringify({ success: true }));
        }); return;
    }

    if (req.method === 'GET' && req.url.startsWith('/api/history')) {
        const s = loadSessionData(chatId);
        res.end(JSON.stringify({ history: s.history, systemPrompt: getAgentPrompt(chatId), globalPrompt: getGlobalPrompt() })); return;
    }

    if (req.method === 'GET' && req.url === '/api/chats') {
        const chats = fs.readdirSync(CHATS_DIR).filter(f => fs.statSync(path.join(CHATS_DIR, f)).isDirectory());
        res.end(JSON.stringify({ chats, lastChatId: config.LAST_CHAT_ID })); return;
    }

    if (req.method === 'POST' && req.url === '/api/chats') {
        const id = "Chat_" + Date.now();
        getChatDir(id);
        saveSessionHistory(id, []);
        config.LAST_CHAT_ID = id;
        saveConfig();
        res.end(JSON.stringify({ chatId: id })); return;
    }

    if (req.method === 'POST' && req.url === '/api/rename') {
        let body = ''; req.on('data', c => body += c);
        req.on('end', () => {
            const { chatId: oldId, newName } = JSON.parse(body);
            const oldPath = path.join(CHATS_DIR, oldId);
            const newPath = path.join(CHATS_DIR, newName);
            if (fs.existsSync(newPath)) { res.writeHead(409); return res.end(JSON.stringify({ error: "Existiert bereits." })); }
            fs.renameSync(oldPath, newPath);
            if (config.LAST_CHAT_ID === oldId) {
                config.LAST_CHAT_ID = newName;
                saveConfig();
            }
            res.end(JSON.stringify({ success: true, newChatId: newName }));
        }); return;
    }

    if (req.method === 'POST' && req.url === '/api/delete') {
        let body = ''; req.on('data', c => body += c);
        req.on('end', () => {
            const { chatId: cid } = JSON.parse(body);
            fs.rmSync(path.join(CHATS_DIR, cid), { recursive: true, force: true });
            const remaining = fs.readdirSync(CHATS_DIR).filter(f => fs.statSync(path.join(CHATS_DIR, f)).isDirectory());
            if (remaining.length === 0) {
                const id = "Mein_erster_Chat"; getChatDir(id); saveSessionHistory(id, []);
                config.LAST_CHAT_ID = id;
            } else if (config.LAST_CHAT_ID === cid) {
                config.LAST_CHAT_ID = remaining[0];
            }
            saveConfig();
            res.end(JSON.stringify({ success: true }));
        }); return;
    }

    if (req.method === 'POST' && req.url === '/api/clear') {
        let body = ''; req.on('data', c => body += c);
        req.on('end', () => {
            const { chatId: cid } = JSON.parse(body);
            saveSessionHistory(cid, []);
            res.end(JSON.stringify({ success: true }));
        }); return;
    }

    if (req.method === 'POST' && req.url === '/api/chat') {
        let body = ''; req.on('data', c => body += c);
        req.on('end', async () => {
            try {
                const { prompt, index, chatId: cid } = JSON.parse(body);
                if (typeof index === 'number') {
                    let s = loadSessionData(cid);
                    saveSessionHistory(cid, s.history.slice(0, index));
                }
                const answer = await askGeminiExtended(prompt, cid);
                res.end(JSON.stringify({ answer }));
            } catch (err) { res.writeHead(500); res.end(JSON.stringify({ error: err.message })); }
        }); return;
    }

    if (req.method === 'GET') {
        let urlPath = req.url === '/' ? '/index.html' : req.url;
        let filePath = path.join(PUBLIC_DIR, urlPath);
        let ct = 'text/html';
        const ext = path.extname(filePath);
        if (ext === '.js') ct = 'text/javascript'; else if (ext === '.css') ct = 'text/css';
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.setHeader('Content-Type', ct);
            fs.createReadStream(filePath).pipe(res);
            return;
        }
    }
    res.writeHead(404); res.end('Not Found');
});

server.listen(config.PORT, () => {
    console.log(`\n🚀 ${config.APP_NAME} läuft auf: http://localhost:${config.PORT}\nSession-Persistenz aktiv.`);
});