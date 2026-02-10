# GEMINI.md - Project Context

## 🚀 Project Overview
This project, located in the `myAI` directory, is a lightweight, standalone Node.js implementation for interacting directly with the **Google Cloud Code Gemini API** (`v1internal`). It provides a way to authenticate and send prompts to the `gemini-3-flash-preview` model without using official SDKs.

### Core Technologies
- **Runtime:** Node.js (v18+ recommended for native `fetch` support)
- **API:** Google Cloud Code Internal API (`cloudcode-pa.googleapis.com`)
- **Authentication:** OAuth2 (Google)

## 📁 Key Files
- **`standalone_login.js`**: Orchestrates the OAuth2 flow. It starts a local server on port 8080, opens the browser for Google Login, and saves the resulting tokens to `oauth_creds.json`.
- **`gemini-direct.js`**: The main CLI utility. It reads the access token from `oauth_creds.json`, retrieves a project ID via `loadCodeAssist`, and then sends the user's prompt to the Gemini model.
- **`oauth_creds.json`**: (Generated) Contains the OAuth2 `access_token` and `refresh_token`.
- **`account.json`**: (Generated) Contains user profile information (email, name) fetched during login.
- **`installation_id`**: (Required) A text file containing a unique identifier used in the `x-gemini-api-privileged-user-id` header.

## 🛠 Usage

### 1. Authentication
To authorize the tool, run the login script:
```bash
node standalone_login.js
```
This will open your browser. After successful login, `oauth_creds.json` and `account.json` will be created.

### 2. Running Prompts
To ask Gemini a question, use the direct script:
```bash
node gemini-direct.js "Explain the purpose of this project"
```

## 📝 Development Notes & Conventions
- **Direct API Access:** The tool uses internal endpoints (`v1internal`). These may be subject to change by Google.
- **Project ID Discovery:** The `gemini-direct.js` script dynamically discovers the `cloudaicompanionProject` ID required for subsequent calls.
- **Security:** Ensure `oauth_creds.json` is kept private as it contains sensitive access tokens.
- **Error Handling:** The scripts include basic error handling for missing credentials or API failures.

## ⚠️ Requirements
- An `installation_id` file must be present in the same directory for `gemini-direct.js` to work correctly.
- Node.js version 18 or higher is required for the global `fetch` API.

https://github.com/srv1master/gemini_free

SSH SHA256:8fVJCXsccGCHXUjykFztAxkQYwTk9d9jBFONgfG1b04