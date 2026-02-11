const http = require('http');
const fs = require('fs');
const path = require('path');
const configManager = require('./lib/config-manager');
const historyManager = require('./lib/history-manager');
const apiClient = require('./lib/api-client');

const PUBLIC_DIR = path.join(configManager.ROOT_DIR, 'public');

// Initialisierung
let config = configManager.loadConfig();

// Erster Chat Check
if (historyManager.listChats().length === 0) {
    const id = "Mein_erster_Chat";
    historyManager.getChatDir(id);
    historyManager.saveSessionHistory(id, []);
    configManager.saveConfig({ LAST_CHAT_ID: id });
}

const server = http.createServer(async (req, res) => {
    // Sicherheits-Header
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const chatId = urlObj.searchParams.get('chatId') || config.LAST_CHAT_ID;

    // API Routen
    if (req.method === 'GET' && req.url === '/api/config') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({...config, GLOBAL_SYSTEM_PROMPT: configManager.getGlobalPrompt()}));
        return;
    }

    if (req.method === 'POST' && req.url === '/api/select-chat') {
        let body = ''; req.on('data', c => body += c);
        req.on('end', () => {
            const { chatId: cid } = JSON.parse(body);
            configManager.saveConfig({ LAST_CHAT_ID: cid });
            res.end(JSON.stringify({ success: true }));
        }); return;
    }

    if (req.method === 'POST' && req.url === '/api/global-prompt') {
        let body = ''; req.on('data', c => body += c);
        req.on('end', () => {
            configManager.saveGlobalPrompt(JSON.parse(body).globalPrompt);
            res.end(JSON.stringify({ success: true }));
        }); return;
    }

    if (req.method === 'POST' && req.url === '/api/system-prompt') {
        let body = ''; req.on('data', c => body += c);
        req.on('end', () => {
            const { chatId: cid, systemPrompt } = JSON.parse(body);
            historyManager.saveAgentPrompt(cid, systemPrompt);
            res.end(JSON.stringify({ success: true }));
        }); return;
    }

    if (req.method === 'GET' && req.url.startsWith('/api/history')) {
        const s = historyManager.loadSessionData(chatId);
        res.end(JSON.stringify({ 
            history: s.history, 
            systemPrompt: historyManager.getAgentPrompt(chatId), 
            globalPrompt: configManager.getGlobalPrompt() 
        })); return;
    }

    if (req.method === 'GET' && req.url === '/api/chats') {
        res.end(JSON.stringify({ chats: historyManager.listChats(), lastChatId: config.LAST_CHAT_ID })); return;
    }

    if (req.method === 'POST' && req.url === '/api/chats') {
        const id = "Chat_" + Date.now();
        historyManager.saveSessionHistory(id, []);
        configManager.saveConfig({ LAST_CHAT_ID: id });
        res.end(JSON.stringify({ chatId: id })); return;
    }

    if (req.method === 'POST' && req.url === '/api/rename') {
        let body = ''; req.on('data', c => body += c);
        req.on('end', () => {
            const { chatId: oldId, newName } = JSON.parse(body);
            try {
                historyManager.renameChat(oldId, newName);
                if (config.LAST_CHAT_ID === oldId) configManager.saveConfig({ LAST_CHAT_ID: newName });
                res.end(JSON.stringify({ success: true, newChatId: newName }));
            } catch (e) { res.writeHead(409); res.end(JSON.stringify({ error: e.message })); }
        }); return;
    }

    if (req.method === 'POST' && req.url === '/api/delete') {
        let body = ''; req.on('data', c => body += c);
        req.on('end', () => {
            const { chatId: cid } = JSON.parse(body);
            historyManager.deleteChat(cid);
            const remaining = historyManager.listChats();
            let nextId = remaining[0] || "Mein_erster_Chat";
            if (!remaining[0]) { historyManager.getChatDir(nextId); historyManager.saveSessionHistory(nextId, []); }
            configManager.saveConfig({ LAST_CHAT_ID: nextId });
            res.end(JSON.stringify({ success: true }));
        }); return;
    }

    if (req.method === 'POST' && req.url === '/api/clear') {
        let body = ''; req.on('data', c => body += c);
        req.on('end', () => {
            historyManager.saveSessionHistory(JSON.parse(body).chatId, []);
            res.end(JSON.stringify({ success: true }));
        }); return;
    }

    if (req.method === 'POST' && req.url === '/api/chat') {
        let body = ''; req.on('data', c => body += c);
        req.on('end', async () => {
            try {
                const { prompt, index, chatId: cid, images } = JSON.parse(body);
                
                // Truncate history if editing
                if (typeof index === 'number') {
                    let s = historyManager.loadSessionData(cid);
                    historyManager.saveSessionHistory(cid, s.history.slice(0, index));
                }

                // Header für SSE
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                });

                // Streaming anfordern
                await apiClient.askGeminiStream(prompt, cid, (chunk) => {
                    res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
                }, images);

                const botNow = new Date().toLocaleString(config.LOCALE, { timeZone: config.TIMEZONE });
                res.write(`data: ${JSON.stringify({ done: true, timestamp: botNow })}\n\n`);
                res.end();
            } catch (err) { 
                console.error("Chat Error:", err);
                if (!res.headersSent) res.writeHead(500);
                res.end(JSON.stringify({ error: err.message })); 
            }
        }); return;
    }

    // Static Files
    let urlPath = req.url === '/' ? '/index.html' : req.url;
    let filePath = path.join(PUBLIC_DIR, urlPath.split('?')[0]);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const ct = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' }[ext] || 'text/plain';
        res.setHeader('Content-Type', ct);
        fs.createReadStream(filePath).pipe(res);
        return;
    }

    res.writeHead(404); res.end('Not Found');
});

server.listen(config.PORT, () => {
    console.log(`\n🚀 ${config.APP_NAME} läuft auf: http://localhost:${config.PORT}`);
});
