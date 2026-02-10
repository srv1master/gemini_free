# 🚀 Gemini Free Tools

Dieses Repository enthält leichtgewichtige Node.js-Skripte, um die Google Gemini API (über den Cloud Code / IDE-Endpunkt) direkt im Terminal zu nutzen – ohne die schwere offizielle CLI-Installation.

## 📦 Inhalt

- `standalone.js`: Ein eigenständiges Login-Skript, das den OAuth2-Flow abwickelt und die Tokens lokal in `oauth_creds.json` speichert.
- `gemini-direct.js`: Ein minimales Skript, um Anfragen an das `gemini-3-flash-preview` Modell zu senden.

## 🛠 Einrichtung

1.  **Repository klonen:**
    ```bash
    git clone https://github.com/srv1master/gemini_free.git
    cd gemini_free
    ```

2.  **Anmeldedaten konfigurieren:**
    Öffne die Datei `standalone.js` und trage deine `CLIENT_ID` und dein `CLIENT_SECRET` ein (siehe unten, woher du diese bekommst).

3.  **Login durchführen:**
    ```bash
    node standalone.js
    ```
    Dies öffnet deinen Browser. Nach dem Login wird eine `oauth_creds.json` und eine `account.json` (zur Kontrolle des Accounts) erstellt.

4.  **Anfrage stellen:**
    ```bash
    node gemini-direct.js "Hallo Gemini, wie geht es dir?"
    ```

## 🔑 Woher bekommt man die CLIENT_ID und das CLIENT_SECRET?

Da dieses Tool den internen "Cloud Code" Endpunkt von Google nutzt, benötigt es die Identität einer offiziellen Google-Erweiterung.

### Option A: Extraktion aus der offiziellen Erweiterung (Empfohlen)
Wenn du die "Google Cloud Code" Erweiterung in VS Code oder IntelliJ installiert hast, befinden sich diese Werte in den Quelldateien der Erweiterung. Suche in deinem Dateisystem nach:
- **VS Code Pfad (Beispiel):** `%USERPROFILE%\.vscode\extensions\googlecloudtools.cloudcode-...\dist\extension.js`
- Suche in der Datei nach dem String `681255809395-`. Dort findest du die ID und das dazugehörige Secret.

### Option B: Eigene Google Cloud Console (Eingeschränkt)
Du kannst unter [console.cloud.google.com](https://console.cloud.google.com) ein eigenes Projekt erstellen und "OAuth 2.0 Client IDs" für Desktop-Apps anlegen.
- **Hinweis:** Eigene IDs haben oft keinen Zugriff auf den `v1internal` Endpunkt, der für dieses Tool optimiert ist.

## ⚠️ Sicherheitshinweis
Dieses Projekt dient zu Bildungszwecken. Teile deine `oauth_creds.json` niemals mit anderen, da sie vollen Zugriff auf deine Cloud-Schnittstelle ermöglicht. Die `CLIENT_ID` und das `CLIENT_SECRET` in diesem Kontext sind bei Desktop-Apps technisch nicht geheimhaltbar, da sie im Client-Code vorliegen müssen.

---
Viel Spaß beim Experimentieren mit Gemini! 🤖
