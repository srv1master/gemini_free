#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

async function run() {
    const userPrompt = process.argv.slice(2).join(' ');
    if (!userPrompt) {
        console.log("Nutzung: gemini-direct \"Deine Frage hier\"");
        process.exit(0);
    }

    const scriptDir = __dirname;
    const credsField = path.join(scriptDir, 'oauth_creds.json');
    const installIdFile = path.join(scriptDir, 'installation_id');
    
    try {
        if (!fs.existsSync(credsField)) {
            throw new Error(`Credentials nicht gefunden unter: ${credsField}`);
        }

        const creds = JSON.parse(fs.readFileSync(credsField, 'utf8'));
        const installId = fs.readFileSync(installIdFile, 'utf8').trim();
        const accessToken = creds.access_token;

        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'GeminiCLI/0.27.3',
            'x-gemini-api-privileged-user-id': installId
        };

        // Project ID abrufen
        const loadResp = await fetch('https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                metadata: { ideType: "IDE_UNSPECIFIED", platform: "PLATFORM_UNSPECIFIED", pluginType: "GEMINI" }
            })
        });

        const loadData = await loadResp.json();
        const projectId = loadData.cloudaicompanionProject;
        if (!projectId) {
            console.error("DEBUG: loadCodeAssist Antwort:", JSON.stringify(loadData, null, 2));
            throw new Error("Keine Project ID gefunden.");
        }

        // Anfrage an Gemini
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

        const genData = await genResp.json();
        if (genData.response && genData.response.candidates) {
            console.log(genData.response.candidates[0].content.parts[0].text);
        } else {
            console.error("API Fehler:", JSON.stringify(genData, null, 2));
        }
    } catch (err) {
        console.error("Fehler:", err.message);
        process.exit(1);
    }
}
run();
