# Changelog - MyAI

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

## [1.3.0] - 2026-02-10

### 🗂️ Multi-Chat & Session Management
- **Parallele Chats:** Unterstützung für mehrere unabhängige Konversationen. Jeder Chat wird in einem eigenen Unterverzeichnis unter `chats/` gespeichert.
- **Sidebar-Navigation:** Neues ausklappbares Seitenmenü in der Web-UI zum schnellen Wechseln zwischen Chats und zum Erstellen neuer Sessions.
- **API-Erweiterung:** Neue Endpunkte `/api/chats` (List) und `/api/chats` (Create) sowie `chatId`-Support für alle bestehenden API-Routen.

### 🎨 UI/UX Erweiterungen
- **Modernes Sidebar-Layout:** Dezent gestaltete Seitenleiste mit "New Chat" Funktion.
- **Session-Feedback:** Klare Benennung der Chats (Standard Chat, Session 123...) in der Sidebar.

---
## [1.2.0] - 2026-02-10

### 🕵️ Stealth & Anonymisierung
- **Vollständiges Rebranding:** Der Name "Gemini" wurde aus der UI und den Server-Logs entfernt und durch "MyAI" ersetzt.
- **Identitätsverschleierung:** Alle Status-Texte und Titel wurden neutralisiert, um das zugrunde liegende Modell zu verbergen.

### 🧠 Intelligente Historie & Kontext
- **Langzeitgedächtnis:** Implementierung einer persistenten `history.json` für dauerhafte Gesprächsverläufe.
- **Synchronisierte Edits:** Beim Bearbeiten einer Nachricht wird die Historie auf dem Server und in der UI ab diesem Punkt abgeschnitten (Truncate), um logische Konsistenz zu wahren.
- **Zeitbewusstsein:** Jede Nachricht erhält einen Zeitstempel, der in die API-Prompts injiziert wird. MyAI weiß nun, wann Informationen geteilt wurden.

### ⚡ UI/UX & Feedback
- **Präzisions-Timer:** Live-Stoppuhr im Format `HH:MM:SS.s` während der KI-Analyse.
- **Interaktives Feedback:** Animierte blinkende Punkte (Ellipsis) signalisieren Aktivität.
- **Benutzerfreundliches Error-Handling:** Technische 429-Fehler werden durch eine rote Warnmeldung ("Ich bin gerade überlastet") mit einem direkten "Nochmal versuchen"-Button ersetzt.

### ⚙️ Architektur & Portabilität
- **Dynamische Konfiguration:** Einführung der `config.json` für alle einstellbaren Parameter (Port, Modell, Retries, Texte).
- **Vollständige Portabilität:** Umstellung auf absolut relative Pfade (`path.join(__dirname, ...)`), damit das Projekt in jedem Verzeichnis sofort lauffähig ist.
- **Verbesserter Retry-Mechanismus:** Upgrade auf Exponential Backoff (bis zu 5 Versuche) bei Serverlast.

---
## [1.1.0] - 2026-02-10

### ✨ Neue Funktionen
- **Nachrichten-Editierung (WebUI):** Benutzer können bereits gesendete Nachrichten direkt in der Chat-Oberfläche bearbeiten und erneut absenden.
- **Automatischer Token-Refresh:** Der Server erkennt nun abgelaufene `access_tokens` und erneuert diese automatisch mithilfe des `refresh_tokens`.
- **Intelligente Retry-Logik (429):** Bei Kapazitätsengpässen von Google (`Too Many Requests / RESOURCE_EXHAUSTED`) wartet der Server nun automatisch 3 Sekunden und versucht die Anfrage bis zu 3 Mal erneut.

### 🛡️ Sicherheit & Architektur
- **Secrets Management:** Einführung der `secrets.json` (automatisch in `.gitignore`), um Google OAuth Credentials lokal sicher zu speichern, ohne sie ins öffentliche Repository zu pushen.
- **Fehlerbehandlung:** Verbesserte Fehler-Logs im Backend bei API-Problemen.

### 🎨 UI/UX
- **Edit-Interaktion:** Neues Edit-Icon (✎) bei User-Nachrichten mit Hover-Effekt.
- **Status-Feedback:** Der Server loggt Token-Refresh-Vorgänge und Retry-Versuche nun klar in der Konsole.

---
## [1.0.0] - 2026-02-10
- Initialer Release mit CLI und WebUI.
