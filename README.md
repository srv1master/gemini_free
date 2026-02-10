# Gemini Free - Inoffizielle Gemini API & WebUI

Dieses Projekt ermöglicht die Nutzung des `gemini-3-flash-preview` Modells über die interne Google Cloud Code API, ohne offizielle SDKs oder direkte API-Abrechnung. Es beinhaltet ein CLI-Tool und eine moderne Web-Benutzeroberfläche.

## 🚀 Features
- **Direkter API-Zugriff:** Nutzt interne Google Cloud Code Endpunkte.
- **Web-Interface:** Schicker Chat-Modus mit Markdown-Support und Syntax-Highlighting.
- **NEU: Nachrichten bearbeiten:** Korrigiere deine Prompts direkt in der UI und sende sie erneut.
- **NEU: Auto-Token-Refresh:** Nie wieder manuell einloggen – der Server erneuert Tokens automatisch.
- **NEU: 429-Retry-Logik:** Automatisches Warten und Wiederholen bei überlasteten Google-Servern.
- **CLI-Tool:** Schnelle Prompts direkt aus dem Terminal.
- **Kostenlos:** Verwendet die für IDE-Erweiterungen vorgesehenen Kontingente.

## 📁 Projektstruktur
- `standalone.js`: Führt den Google OAuth2 Login durch.
- `server.js`: Das Backend für die Web-Anwendung (Port 3000).
- `index.html`: Das Frontend der Web-UI.
- `gemini-direct.js`: Das CLI-Tool für Terminal-Anfragen.
- `installation_id`: Enthält die für die API erforderliche Hardware-ID.

## 🛠 Installation & Setup

1. **Repository klonen:**
   ```bash
   git clone https://github.com/srv1master/gemini_free.git
   cd gemini_free
   ```

2. **Abhängigkeiten:**
   Stelle sicher, dass Node.js (v18+) installiert ist. Es werden keine externen npm-Pakete benötigt (native `fetch` Nutzung).

3. **Konfiguration:**
   Öffne `standalone.js` und trage deine `CLIENT_ID` und dein `CLIENT_SECRET` ein (aus der Google Cloud Console oder extrahiert aus Cloud Code).

4. **Login:**
   ```bash
   node standalone.js
   ```
   Dies öffnet den Browser. Nach dem Login werden `oauth_creds.json` und `account.json` erstellt.

## 🖥 Nutzung

### Web-Interface (Empfohlen)
Starte den Server:
```bash
node server.js
```
Öffne danach **http://localhost:3000** in deinem Browser.

### CLI
Sende eine direkte Frage:
```bash
node gemini-direct.js "Wie funktioniert Quantencomputer?"
```

## ⚠️ Wichtige Hinweise
- Dieses Projekt ist zu experimentellen Zwecken gedacht (Reverse Engineering).
- Die internen Endpunkte können sich jederzeit ändern.
- Halte deine `oauth_creds.json` privat!

## 📄 Lizenz
MIT
