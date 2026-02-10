# Changelog - MyAI

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

## [1.6.0] - 2026-02-10

### 🎨 UI/UX Evolution
- **Code-Kopier-Button:** Jeder Code-Block in den Antworten erhält nun automatisch einen "Kopieren"-Button für schnellen Zugriff.
- **Optimierte UI-Skalierung:** Standardmäßiger Zoom auf 90% (`zoom: 0.9`) für eine professionelle Informationsdichte.
- **Typografische Schärfe:** Reduzierung der Chat-Schriftgröße auf 12px für verbesserte Übersichtlichkeit bei langen Texten.
- **Zentrierter Footer:** Der Eingabebereich wurde als semantischer `<footer>` umgebaut und der Inhalt vertikal zentriert.
- **Bündiger Abschluss:** Optimierung der Abstände am unteren Rand für ein nahtloses App-Gefühl.

### ⚙️ Sidebar & Navigation
- **Auto-Close Logik:** Die Sidebar ist standardmäßig geschlossen und zieht sich nach der Auswahl eines Chats automatisch zurück.
- **Einfachere Steuerung:** Entfernung des Schließen-Buttons (X) zugunsten einer konsistenten Toggle-Steuerung über das ☰-Menü.

## [1.5.0] - 2026-02-10

### 📂 Architektur-Refactoring
- **Saubere Trennung:** Umzug aller Kernlogik in `/src`, UI-Assets in `/public` und persistenten Daten in `/data`.
- **Statische Dateiverwaltung:** Der Server fungiert nun als vollwertiger File-Server mit MIME-Type-Erkennung.
- **Verbesserte Pfadsicherheit:** Verstärkter Einsatz von relativen Pfadberechnungen für absolute Portabilität.

---
## [1.4.0] - 2026-02-10

### 🎨 Custom UI & Interaktion
- **MyAI Modal System:** Native Browser-Dialoge (`confirm`, `prompt`) wurden durch ein elegantes, modales Dialogsystem im MyAI-Design ersetzt.
- **Flüssige Workflows:** Umbenennen und Löschen von Chats erfolgt nun über animierte Overlays mit direktem Fokus auf Eingabefelder.

### ⚙️ Verfeinertes Session-Management
- **Uneingeschränktes Löschen:** Alle Chats (auch initiale oder "default" benannte) können nun vollständig entfernt werden.
- **Auto-Bootstrap:** Das System erkennt nun ein leeres Chat-Verzeichnis und erstellt bei Bedarf automatisch eine neue, saubere Arbeitsumgebung.
- **Echte Portabilität:** Die "Standard Chat"-Logik wurde zugunsten einer rein verzeichnisbasierten Sidebar entfernt.

### 🛡️ Stabilität & Bugfixes
- **JSON-Header Fix:** API-Antworten senden nun garantiert den korrekten Content-Type, was Parsing-Fehler im Browser eliminiert.
- **Robustes Error-Handling:** Verbesserte Validierung von Request-Bodys im Backend.

---
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