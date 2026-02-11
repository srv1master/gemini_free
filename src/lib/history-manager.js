const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./config-manager');

const CHATS_DIR = path.join(DATA_DIR, 'chats');

if (!fs.existsSync(CHATS_DIR)) fs.mkdirSync(CHATS_DIR, { recursive: true });

function getChatDir(chatId) {
    const dir = path.join(CHATS_DIR, chatId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
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
    const historyPath = path.join(getChatDir(chatId), 'history.json');
    fs.writeFileSync(historyPath, JSON.stringify({ history }, null, 2));
}

function getAgentPrompt(chatId) {
    const p = path.join(getChatDir(chatId), 'agent_prompt.md');
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : "";
}

function saveAgentPrompt(chatId, prompt) {
    fs.writeFileSync(path.join(getChatDir(chatId), 'agent_prompt.md'), prompt);
}

function listChats() {
    return fs.readdirSync(CHATS_DIR).filter(f => fs.statSync(path.join(CHATS_DIR, f)).isDirectory());
}

function deleteChat(chatId) {
    fs.rmSync(path.join(CHATS_DIR, chatId), { recursive: true, force: true });
}

function renameChat(oldId, newName) {
    const oldPath = path.join(CHATS_DIR, oldId);
    const newPath = path.join(CHATS_DIR, newName);
    if (fs.existsSync(newPath)) throw new Error("Existiert bereits.");
    fs.renameSync(oldPath, newPath);
}

module.exports = {
    loadSessionData,
    saveSessionHistory,
    getAgentPrompt,
    saveAgentPrompt,
    listChats,
    deleteChat,
    renameChat,
    getChatDir
};
