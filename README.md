# MyAI - Private Intelligence API & WebUI

Dieses Projekt bietet eine leistungsstarke, inoffizielle Schnittstelle zu modernsten Sprachmodellen über eine hochgradig optimierte Web-Oberfläche und CLI. Es wurde für maximale Privatsphäre, Portabilität und Benutzerfreundlichkeit entwickelt.

## 🚀 Key Features
- **🕵️ Stealth Mode:** Vollständige Anonymisierung des zugrunde liegenden Modells und Anbieters.
- **🧠 Kontext-Gedächtnis:** Persistente Historie für Langzeit-Gespräche.
- **⌛ Zeitbewusstsein:** Automatisches Tracking und Injektion von Zeitstempeln für zeitbasierte Abfragen.
- **🔄 Sync-Edits:** Bearbeite Nachrichten rückwirkend mit automatischer Historien-Bereinigung.
- **⚡ Performance-UI:** Animierte Ladeanzeige mit Präzisions-Timer (HH:MM:SS.s).
- **🛡️ Resilience:** Automatischer Token-Refresh und Exponential Backoff bei API-Limits.
- **📦 Portabilität:** Vollständig relative Pfade, bereit für den Einsatz auf jedem System.

## 📁 Projektstruktur
- `server.js`: Das Backend mit dynamischer Konfiguration und API-Proxy.
- `index.html`: Das moderne Frontend für das MyAI Control Panel.
- `config.json`: Zentrale Steuerung aller Parameter (Port, Modell, Texte).
- `standalone.js`: Tool für die initiale OAuth2-Authentifizierung.
- `secrets.json`: (Lokal) Sicherer Speicher für API-Credentials.

## 🛠 Installation & Setup

1. **Repository klonen:**
   ```bash
   git clone https://github.com/srv1master/gemini_free.git
   cd gemini_free
   ```

2. **Voraussetzungen:**
   Node.js (v18+) ist erforderlich. Keine npm-Abhängigkeiten notwendig.

3. **Konfiguration:**
   Trage deine Credentials in `secrets.json` ein (siehe `standalone.js` für das Setup).

4. **Starten:**
   ```bash
   node server.js
   ```
   Öffne danach **http://localhost:3000** im Browser.

## ⚙️ Anpassung
Alle UI-Texte, Port-Einstellungen und Modell-Parameter können bequem in der `config.json` angepasst werden.

## 📄 Lizenz
MIT
