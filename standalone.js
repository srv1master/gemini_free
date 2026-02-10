const http = require('http');
const https = require('https');
const url = require('url');
const crypto = require('crypto');
const fs = require('fs');
const { exec } = require('child_process');

const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const SCOPES = [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];
const PORT = 8080;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/oauth2callback`;

async function main() {
    const state = crypto.randomBytes(32).toString('hex');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(SCOPES.join(' '))}&` +
        `state=${state}&` +
        `access_type=offline&prompt=consent`;

    console.log('--- Gemini CLI Login ---');
    console.log('\nFalls der Browser nicht automatisch öffnet, kopiere diese URL:\n');
    console.log(authUrl);
    console.log('\nWarte auf Authentifizierung...\n');
    
    // Browser öffnen (Windows/macOS/Linux Support)
    if (process.platform === 'win32') {
        // Unter Windows braucht 'start' oft ein leeres erstes Argument für den Titel, wenn Pfade Anführungszeichen enthalten
        exec(`start "" "${authUrl.replace(/&/g, '^&')}"`);
    } else {
        const start = (process.platform === 'darwin' ? 'open' : 'xdg-open');
        exec(`${start} "${authUrl}"`);
    }

    const server = http.createServer(async (req, res) => {
        if (req.url.startsWith('/oauth2callback')) {
            const queryObject = url.parse(req.url, true).query;
            
            if (queryObject.state !== state) {
                res.end('State mismatch error.');
                process.exit(1);
            }

            if (queryObject.code) {
                console.log('Code erhalten, tausche gegen Tokens aus...');
                
                const tokenResponse = await fetchTokens(queryObject.code);
                fs.writeFileSync('oauth_creds.json', JSON.stringify(tokenResponse, null, 2));
                
                console.log('Rufe Benutzerinformationen ab...');
                const userInfo = await fetchUserInfo(tokenResponse.access_token);
                fs.writeFileSync('account.json', JSON.stringify(userInfo, null, 2));
                
                res.end(`Login erfolgreich als ${userInfo.email}! Du kannst dieses Fenster nun schliessen.`);
                console.log(`Erfolg! Angemeldet als: ${userInfo.email}`);
                console.log('oauth_creds.json und account.json wurden erstellt/aktualisiert.');
                server.close();
                process.exit(0);
            }
        }
    }).listen(PORT);
}

async function fetchUserInfo(accessToken) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'www.googleapis.com',
            path: '/oauth2/v2/userinfo',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}

async function fetchTokens(code) {
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams({
            code: code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code'
        }).toString();

        const options = {
            hostname: 'oauth2.googleapis.com',
            path: '/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });

        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
    });
}

main().catch(console.error);
