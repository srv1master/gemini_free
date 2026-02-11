const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const MASTER_PROMPT_FILE = path.join(DATA_DIR, 'master_prompt.md');

let config = { 
    PORT: 3000, 
    MODEL_NAME: "gemini-3-flash-preview", 
    MAX_RETRIES: 5, 
    HISTORY_LIMIT: 40,
    RETRY_DELAY_MS: 1000,
    TIMEZONE: "Europe/Berlin",
    LOCALE: "de-DE",
    APP_NAME: "MyAI Control Panel",
    LOADING_TEXT: "KI analysiert",
    LAST_CHAT_ID: ""
};

function loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
    }
    return config;
}

function saveConfig(newConfig) {
    config = { ...config, ...newConfig };
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getGlobalPrompt() {
    return fs.existsSync(MASTER_PROMPT_FILE) ? fs.readFileSync(MASTER_PROMPT_FILE, 'utf8') : "";
}

function saveGlobalPrompt(prompt) {
    fs.writeFileSync(MASTER_PROMPT_FILE, prompt);
}

module.exports = {
    loadConfig,
    saveConfig,
    getGlobalPrompt,
    saveGlobalPrompt,
    DATA_DIR,
    ROOT_DIR
};
