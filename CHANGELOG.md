# Changelog - Gemini Free

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

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
