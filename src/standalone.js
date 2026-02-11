const http = require('http');
const https = require('https');
const url = require('url');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { DATA_DIR } = require('./lib/config-manager');

const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');
const CREDS_FILE = path.join(DATA_DIR, 'oauth_creds.json');
const ACCOUNT_FILE = path.join(DATA_DIR, 'account.json');

// Lade Secrets falls vorhanden, sonst Platzhalter
let secrets = { CLIENT_ID: 'YOUR_CLIENT_ID', CLIENT_SECRET: 'YOUR_CLIENT_SECRET' };
if (fs.existsSync(SECRETS_FILE)) {
    secrets = JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf8'));
}

const SCOPES = [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];
const PORT = 8080;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/oauth2callback`;

async function main() {
    if (secrets.CLIENT_ID === 'YOUR_CLIENT_ID') {
        console.error('Bitte trage zuerst deine CLIENT_ID und CLIENT_SECRET in data/secrets.json ein!');
        process.exit(1);
    }

    const state = crypto.randomBytes(32).toString('hex');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${secrets.CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(SCOPES.join(' '))}&` +
        `state=${state}&` +
        `access_type=offline&prompt=consent`;

    console.log('--- MyAI Login Tool ---');
    console.log('\nKopiere diese URL in deinen Browser:\n');
    console.log(authUrl);
    
    if (process.platform === 'win32') exec(`start "" "${authUrl.replace(/&/g, '^&')}"`);
    else exec(`${(process.platform === 'darwin' ? 'open' : 'xdg-open')} "${authUrl}"`);

    const server = http.createServer(async (req, res) => {
        if (req.url.startsWith('/oauth2callback')) {
            const queryObject = url.parse(req.url, true).query;
            if (queryObject.state !== state) return res.end('State mismatch error.');

            if (queryObject.code) {
                console.log('Code erhalten, tausche Tokens aus...');
                const tokenResponse = await fetchTokens(queryObject.code);
                fs.writeFileSync(CREDS_FILE, JSON.stringify(tokenResponse, null, 2));
                
                const userInfo = await fetchUserInfo(tokenResponse.access_token);
                fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(userInfo, null, 2));
                
                res.end(`Login erfolgreich als ${userInfo.email}! Du kannst dieses Fenster nun schliessen.`);
                console.log(`Erfolg! Angemeldet als: ${userInfo.email}`);
                server.close();
                process.exit(0);
            }
        }
    }).listen(PORT);
}

function fetchUserInfo(accessToken) {
    return new Promise((resolve, reject) => {
        https.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        }, (res) => {
            let data = ''; res.on('data', c => data += c);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

function fetchTokens(code) {
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams({
            code, client_id: secrets.CLIENT_ID, client_secret: secrets.CLIENT_SECRET,
            redirect_uri: REDIRECT_URI, grant_type: 'authorization_code'
        }).toString();
        const req = https.request('https://oauth2.googleapis.com/token', {
            method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }, (res) => {
            let data = ''; res.on('data', c => data += c);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject); req.write(postData); req.end();
    });
}

main().catch(console.error);