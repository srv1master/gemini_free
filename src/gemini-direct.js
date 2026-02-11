#!/usr/bin/env node
const apiClient = require('./lib/api-client');
const configManager = require('./lib/config-manager');

async function run() {
    const userPrompt = process.argv.slice(2).join(' ');
    if (!userPrompt) {
        console.log("Nutzung: gemini-direct \"Deine Frage hier\"");
        process.exit(0);
    }

    const config = configManager.loadConfig();
    const chatId = config.LAST_CHAT_ID || "CLI_Session";

    try {
        const response = await apiClient.askGemini(userPrompt, chatId);
        console.log(response.text);
    } catch (err) {
        console.error("Fehler:", err.message);
        process.exit(1);
    }
}
run();