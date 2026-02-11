const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./config-manager');
const historyManager = require('./history-manager');
const configManager = require('./config-manager');

const CREDS_FILE = path.join(DATA_DIR, 'oauth_creds.json');
const INSTALL_ID_FILE = path.join(DATA_DIR, 'installation_id');
const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');

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

async function askGeminiStream(userPrompt, chatId = "default", onChunk, imageParts = [], retryCount = 0) {
    const config = configManager.loadConfig();
    const installId = fs.readFileSync(INSTALL_ID_FILE, 'utf8').trim();
    let creds = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
    let session = historyManager.loadSessionData(chatId);
    const globalPrompt = configManager.getGlobalPrompt();
    const agentPrompt = historyManager.getAgentPrompt(chatId);
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
        // Filter out images from history to save space/bandwidth, or keep them if needed. 
        // For now, we only keep text in history for context to keep it lightweight.
        // If we want multi-turn image context, we need to store images in history.
        // Let's store a placeholder for images in history.
        const textParts = msg.parts.filter(p => p.text).map(p => p.text).join('\n');
        contents.push({ role: msg.role, parts: [{ text: `[Zeitstempel: ${msg.timestamp}] ${textParts}` }] });
    });

    // Current User Message
    const currentParts = [{ text: `[Zeitstempel: ${now}] ${userPrompt}` }];
    
    // Add images to current message
    if (imageParts && imageParts.length > 0) {
        imageParts.forEach(img => {
            currentParts.push({
                inlineData: {
                    mimeType: img.mimeType,
                    data: img.data
                }
            });
        });
    }
    
    contents.push({ role: "user", parts: currentParts });

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
            return askGeminiStream(userPrompt, chatId, onChunk, retryCount + 1);
        }
        
        const { cloudaicompanionProject: projectId } = await loadResp.json();
        
        // Nutze streamGenerateContent für Echtzeit-Antworten
        const genResp = await fetch('https://cloudcode-pa.googleapis.com/v1internal:streamGenerateContent', {
            method: 'POST', headers, body: JSON.stringify({ model: config.MODEL_NAME, project: projectId, request: { contents } })
        });

        if (genResp.status === 429 && retryCount < config.MAX_RETRIES) {
            await new Promise(r => setTimeout(r, Math.pow(2, retryCount) * 1000));
            return askGeminiStream(userPrompt, chatId, onChunk, retryCount + 1);
        }

        if (!genResp.ok) {
            const errData = await genResp.text();
            throw new Error(`API Error (${genResp.status}): ${errData}`);
        }

        const reader = genResp.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // Verarbeite Chunks (Google sendet oft mehrere JSON-Objekte in einem Stream)
            let boundary = buffer.lastIndexOf('}');
            if (boundary !== -1) {
                let validPart = buffer.substring(0, boundary + 1);
                buffer = buffer.substring(boundary + 1);
                
                // Wir müssen hier vorsichtig sein, da Google oft ein Array von Objekten oder einzelne Objekte sendet
                // Ein einfacher Weg: Versuche das Ganze als ein JSON-Fragment zu parsen oder nutze Regex
                const parts = validPart.split('}{').map((p, i, a) => {
                    if (a.length === 1) return p;
                    if (i === 0) return p + '}';
                    if (i === a.length - 1) return '{' + p;
                    return '{' + p + '}';
                });

                for (const part of parts) {
                    try {
                        const json = JSON.parse(part);
                        if (json.candidates && json.candidates[0].content && json.candidates[0].content.parts) {
                            const chunkText = json.candidates[0].content.parts[0].text;
                            fullText += chunkText;
                            if (onChunk) onChunk(chunkText);
                        }
                    } catch (e) { /* Incomplete JSON, skip and wait for next chunk */ }
                }
            }
        }

        const botNow = new Date().toLocaleString(config.LOCALE, { timeZone: config.TIMEZONE });
        
        // Historie erst am Ende speichern
        session.history.push({ role: "user", parts: [{ text: userPrompt }], timestamp: now });
        session.history.push({ role: "model", parts: [{ text: fullText }], timestamp: botNow });
        if (session.history.length > config.HISTORY_LIMIT) session.history = session.history.slice(-config.HISTORY_LIMIT);
        
        historyManager.saveSessionHistory(chatId, session.history);
        return { text: fullText, timestamp: botNow };
    } catch (err) { throw err; }
}

module.exports = {
    askGeminiStream,
    refreshAccessToken
};