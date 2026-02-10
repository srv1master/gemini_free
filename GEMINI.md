# MyAI - Private Intelligence Project Context

## 🚀 Project Overview
Dieses Projekt, ehemals bekannt als `gemini_free`, ist eine hochgradig optimierte, inoffizielle Implementierung zur Interaktion mit der Google Cloud Code API (`v1internal`). Es wurde zu einem professionellen, anonymisierten **MyAI-System** weiterentwickelt, das sowohl eine CLI als auch eine moderne Web-Benutzeroberfläche mit Multi-Chat-Unterstützung bietet. Fokus liegt auf Privatsphäre, kontextueller Intelligenz und absoluter Portabilität.

### Core Technologies
- **Runtime:** Node.js (v18+)
- **API:** Google Cloud Code Internal API (`cloudcode-pa.googleapis.com`)
- **UI:** Modern HTML5/CSS3/JS mit Markdown (marked.js) & Highlight.js
- **Architecture:** Portable Node.js Server mit dynamischer Konfiguration und Multi-Session-Management.

## 📁 Key Files & Structure
- **`server.js`**: Das Herzstück. Ein portabler Proxy-Server, der OAuth-Refresh, Historien-Management (Multi-Session) und API-Interaktion steuert.
- **`index.html`**: Das MyAI Control Panel. Bietet eine Chat-UI mit Sidebar, Echtzeit-Feedback, Edit-Funktionen und Zeitstempeln.
- **`chats/`**: Verzeichnis für alle Konversationen. Jeder Chat hat einen eigenen Unterordner mit einer `history.json`.
- **`config.json`**: Zentrale Konfiguration (Port, Modell, Retries, UI-Texte).
- **`secrets.json`**: Sicherer lokaler Speicher für API-Credentials (automatisch in `.gitignore`).
- **`standalone.js`**: Tool für die initiale OAuth2-Authentifizierung.
- **`installation_id`**: Eindeutige Hardware-ID für die API-Authentifizierung.

## 🛠 Features & Logic

### 1. Multi-Chat & Session Management (v1.3.0)
Das System unterstützt nun unbegrenzte parallele Konversationen. Über eine Sidebar in der Web-UI können neue Chats erstellt und bestehende geladen werden. Jeder Chat agiert isoliert in seinem eigenen Dateisystem-Kontext (`chats/CHAT_ID/history.json`).

### 2. Stealth & Anonymisierung
Vollständiges Rebranding auf "MyAI". Alle Hinweise auf den Anbieter (Google/Gemini) wurden aus der UI und den Logs entfernt, um das genutzte Modell zu verschleiern. Dynamische UI-Texte werden über den `/api/config` Endpunkt geladen.

### 3. Intelligente Historie & Kontext
- **Synchronisierte Edits:** Beim Bearbeiten einer Nachricht wird die Historie auf dem Server und in der UI ab diesem Punkt abgeschnitten (Truncate), um logische Konsistenz zu wahren.
- **Zeitbewusstsein:** Nachrichten erhalten Timestamps, die in die API-Prompts injiziert werden (`[Zeitstempel: ...]`), damit die KI zeitliche Bezüge versteht.

### 4. Resilienz & Performance
- **Auto-Token-Refresh:** Der Server erneuert abgelaufene Access-Tokens automatisch.
- **Exponential Backoff:** Intelligente Retry-Logik bei API-Limits (429) mit bis zu 5 Versuchen.
- **Präzisions-UI:** Live-Stoppuhr (`HH:MM:SS.s`) und animierte Ladeindikatoren.

### 5. Portabilität
Alle Dateipfade sind absolut relativ (`path.join(__dirname, ...)`). Das Projekt ist sofort lauffähig, egal in welchem Verzeichnis es abgelegt wird.

## 🛠 Usage

### 1. Authentifizierung (einmalig)
```bash
node standalone.js
```

### 2. MyAI starten
```bash
node server.js
```
Zugriff über **http://localhost:3000**.

GitHub: https://github.com/srv1master/gemini_free
SSH SHA256:8fVJCXsccGCHXUjykFztAxkQYwTk9d9jBFONgfG1b04