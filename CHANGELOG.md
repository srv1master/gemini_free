# Changelog - MyAI

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

## [1.7.0] - 2026-02-10

### 🤖 Multi-Agenten System
- **Markdown-Prompts:** System-Anweisungen werden nun als `.md` Dateien gespeichert (`master_prompt.md` und `agent_prompt.md`). Dies erlaubt strukturierte, formatierte Befehle.
- **Hierarchische Priorität:** Implementierung einer Master-Direktive (Global), die über den lokalen Agenten-Prompts steht und für alle Chats gilt.
- **Interaktive Status-Badges:** Elegante, schwebende Badges (📡 MASTER, 🤖 AGENT) mit Glas-Effekt und pulsierenden Aktivitäts-Signalen. Ein Klick auf die Badge öffnet direkt die Konfiguration.

### ⚙️ Session & Persistenz
- **Ewige Session:** MyAI merkt sich nun den zuletzt verwendeten Chat (`LAST_CHAT_ID`) und lädt diesen automatisch beim Start oder Neuladen wieder.
- **Diskreter Verlauf:** System-Prompts werden im Chatverlauf nur noch als Status-Indikatoren angezeigt, um Platz zu sparen und Instruktionen geheim zu halten.

### 🎨 UI/UX Verfeinerungen
- **Profi-Modal:** Das Modal-System unterstützt nun Textareas mit Monospace-Schriftart für präzises Markdown-Editing.
- **Erweiterter Workspace:** Die Breite des Modals wurde auf 800px verdoppelt und horizontales Scrollen für Code/Instruktionen aktiviert.
- **Hacker-Typografie:** Durchgängige Nutzung von Monospace in Konfigurationsfeldern für besseren Fokus.

---
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

---
## [1.5.0] - 2026-02-10

### 📂 Architektur-Refactoring
- **Saubere Trennung:** Umzug aller Kernlogik in `/src`, UI-Assets in `/public` und persistenten Daten in `/data`.
- **Statische Dateiverwaltung:** Der Server fungiert nun als vollwertiger File-Server mit MIME-Type-Erkennung.
- **Verbesserte Pfadsicherheit:** Verstärkter Einsatz von relativen Pfadberechnungen für absolute Portabilität.

---
## [1.4.0] - 2026-02-10
... (Restliche Historie)
