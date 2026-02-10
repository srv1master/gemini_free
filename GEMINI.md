# MyAI - Private Intelligence Project Context

## 🚀 Project Overview
Dieses Projekt ist eine hochgradig optimierte, anonymisierte Implementierung zur Interaktion mit der Google Cloud Code API. Die Architektur ist modular, portabel und für maximale Privatsphäre ausgelegt.

### Core Technologies
- **Runtime:** Node.js (v18+)
- **API:** Google Cloud Code Internal API
- **UI:** Modern HTML5/CSS3/JS (Custom Modals, Sidebar, Multi-Chat)

## 📁 Optimized Structure (v1.5.0)
- **`/src`**: Enthält die Programmlogik.
  - `server.js`: Der portable Proxy-Server.
  - `standalone.js`: OAuth2-Authentifizierungs-Tool.
  - `gemini-direct.js`: CLI-Schnittstelle.
- **`/public`**: Enthält die Frontend-Dateien.
  - `index.html`: Das MyAI Control Panel.
- **`/data`**: Zentraler Speicher für Konfiguration und Benutzerdaten.
  - `chats/`: Unterverzeichnisse für jede Chat-Session.
  - `config.json`: Dynamische UI- und Server-Einstellungen.
  - `secrets.json`: API-Credentials.
  - `oauth_creds.json` / `account.json`: Authentifizierungsdaten.
  - `installation_id`: API-Hardware-ID.

## 🛠 Features & Logic
... (bestehende Funktionen: Stealth, Historie, Zeitstempel, Resilienz) ...

## 📦 Portabilität & Deployment
Die Architektur nutzt rein relative Pfade basierend auf den Modulstandorten in `/src`. Das gesamte Projektverzeichnis kann verschoben werden, solange die interne Struktur gewahrt bleibt.

## 🛠 Usage

### 1. Authentifizierung
```bash
node src/standalone.js
```

### 2. MyAI starten
```bash
node src/server.js
```
Zugriff über **http://localhost:3000**.

GitHub: https://github.com/srv1master/gemini_free
SSH SHA256:8fVJCXsccGCHXUjykFztAxkQYwTk9d9jBFONgfG1b04
