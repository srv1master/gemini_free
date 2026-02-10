const chatContainer = document.getElementById('chat-container');
const input = document.getElementById('promptInput');
const sendBtn = document.getElementById('sendBtn');
const chatList = document.getElementById('chat-list');
const sidebar = document.getElementById('sidebar');
const appTitle = document.getElementById('appTitle');

// Modal Elemente
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalInput = document.getElementById('modal-input');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');

let currentChatId = "default";
let APP_NAME = "MyAI";
let LOADING_TEXT = "KI analysiert";

// Modal Logik
function showModal({ title, message, showInput = false, defaultValue = "", confirmLabel = "OK", onConfirm }) {
    modalTitle.innerText = title;
    modalMessage.innerText = message;
    modalConfirmBtn.innerText = confirmLabel;
    modalInput.style.display = showInput ? 'block' : 'none';
    modalInput.value = defaultValue;
    modalOverlay.style.display = 'flex';

    const handleConfirm = () => {
        const value = showInput ? modalInput.value : true;
        onConfirm(value);
        closeModal();
    };

    modalConfirmBtn.onclick = handleConfirm;
    modalCancelBtn.onclick = closeModal;
    
    if (showInput) {
        setTimeout(() => modalInput.focus(), 100);
        modalInput.onkeydown = (e) => { if (e.key === 'Enter') handleConfirm(); };
    }
}

function closeModal() { modalOverlay.style.display = 'none'; }

window.onload = async () => {
    await applyConfig();
    await loadChatList();
};

    function toggleSidebar() {

        sidebar.classList.toggle('open');

    }



    async function applyConfig() {

        try {

            const response = await fetch('/api/config');

            const config = await response.json();

            if (config.APP_NAME) {

                APP_NAME = config.APP_NAME;

                document.title = APP_NAME + " - Private Intelligence";

                appTitle.innerText = APP_NAME;

                input.placeholder = `Eingabe an ${APP_NAME}... (Shift+Enter für neue Zeile)`;

            }

            if (config.LOADING_TEXT) LOADING_TEXT = config.LOADING_TEXT;

        } catch (err) { console.error('Config-Fehler:', err); }

    }



    async function loadChatList() {

        try {

            const response = await fetch('/api/chats');

            const data = await response.json();

            chatList.innerHTML = '';

            

            if (data.chats && data.chats.length > 0) {

                data.chats.forEach(id => {

                    chatList.appendChild(createChatItem(id, id.replace(/Chat_|Session_/g, '').replace(/_/g, ' ')));

                });

                if (currentChatId === "default" || !data.chats.includes(currentChatId)) {

                    await selectChat(data.chats[0], false); // False = Sidebar nicht schließen beim Initialladen

                }

            }

        } catch (err) { console.error('Chat-List-Fehler:', err); }

    }



    function createChatItem(id, label) {

        const div = document.createElement('div');

        div.className = `chat-item ${id === currentChatId ? 'active' : ''}`;

        const span = document.createElement('span');

        span.innerText = label;

        span.style.flex = "1";

        span.style.overflow = "hidden";

        span.style.textOverflow = "ellipsis";

        span.onclick = () => selectChat(id);

        const actions = document.createElement('div');

        actions.className = "actions";

        const editBtn = document.createElement('button');

        editBtn.innerHTML = "✎";

        editBtn.onclick = (e) => { e.stopPropagation(); renameChat(id); };

        const delBtn = document.createElement('button');

        delBtn.innerHTML = "🗑";

        delBtn.onclick = (e) => { e.stopPropagation(); deleteChat(id); };

        actions.appendChild(editBtn);

        actions.appendChild(delBtn);

        div.appendChild(span);

        div.appendChild(actions);

        return div;

    }



    async function renameChat(id) {

        const currentLabel = id.replace(/Chat_|Session_/g, '').replace(/_/g, ' ');

        showModal({

            title: "Chat umbenennen",

            message: "Gib einen neuen Namen für diesen Chat ein:",

            showInput: true,

            defaultValue: currentLabel,

            confirmLabel: "Speichern",

            onConfirm: async (newName) => {

                if (!newName || newName === currentLabel) return;

                const formattedName = newName.trim().replace(/\s+/g, '_');

                try {

                    const response = await fetch('/api/rename', {

                        method: 'POST',

                        headers: { 'Content-Type': 'application/json' },

                        body: JSON.stringify({ chatId: id, newName: formattedName })

                    });

                    const data = await response.json();

                    if (response.status === 409) { alert(data.error); return renameChat(id); }

                    currentChatId = data.newChatId;

                    await loadChatList();

                    await selectChat(currentChatId, false);

                } catch (err) { alert("Fehler: " + err.message); }

            }

        });

    }



    async function deleteChat(id) {

        showModal({

            title: "Chat löschen",

            message: `Chat "${id.replace(/_/g, ' ')}" wirklich löschen?`,

            confirmLabel: "Löschen",

            onConfirm: async () => {

                try {

                    await fetch('/api/delete', {

                        method: 'POST',

                        headers: { 'Content-Type': 'application/json' },

                        body: JSON.stringify({ chatId: id })

                    });

                    currentChatId = "default";

                    await loadChatList();

                } catch (err) { alert("Fehler: " + err.message); }

            }

        });

    }



    async function createNewChat() {

        try {

            const response = await fetch('/api/chats', { method: 'POST' });

            const data = await response.json();

            await loadChatList();

            await selectChat(data.chatId);

        } catch (err) { alert('Fehler: ' + err.message); }

    }



    async function selectChat(id, shouldCloseSidebar = true) {

        currentChatId = id;

        document.querySelectorAll('.chat-item').forEach(item => {

            const span = item.querySelector('span');

            if (span) {

                const isMatch = span.innerText === id.replace(/Chat_|Session_/g, '').replace(/_/g, ' ');

                item.classList.toggle('active', isMatch);

            }

        });

        await loadChatHistory(id);

        if (shouldCloseSidebar) sidebar.classList.remove('open');

    }

async function loadChatHistory(chatId) {
    try {
        const response = await fetch(`/api/history?chatId=${chatId}`);
        const data = await response.json();
        chatContainer.innerHTML = '';
        if (data.history && data.history.length > 0) {
            data.history.forEach((msg, index) => {
                appendMessage(msg.parts[0].text, msg.role === 'user' ? 'user-message' : 'bot-message', msg.role === 'model', index, msg.timestamp);
            });
        } else {
            chatContainer.innerHTML = `<div class="message bot-message">System bereit. Neue Session [${chatId.replace(/_/g, ' ')}] gestartet.</div>`;
        }
        scrollToBottom();
    } catch (err) { console.error('History-Fehler:', err); }
}

async function clearChat() {
    showModal({
        title: "Verlauf leeren",
        message: `Verlauf von "${currentChatId.replace(/_/g, ' ')}" löschen?`,
        confirmLabel: "Leeren",
        onConfirm: async () => {
            try {
                await fetch('/api/clear', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chatId: currentChatId })
                });
                chatContainer.innerHTML = `<div class="message bot-message">Verlauf bereinigt.</div>`;
            } catch (err) { alert('Fehler: ' + err.message); }
        }
    });
}

input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

async function sendMessage(textOverride = null, indexToTruncate = null) {
    const text = textOverride || input.value.trim();
    if (!text) return;
    const now = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
    if (indexToTruncate !== null) {
        Array.from(chatContainer.querySelectorAll('.message')).forEach(m => { if (m.dataset.index !== undefined && parseInt(m.dataset.index) >= indexToTruncate) m.remove(); });
        appendMessage(text, 'user-message', false, indexToTruncate, now);
    } else if (!textOverride) {
        appendMessage(text, 'user-message', false, chatContainer.querySelectorAll('.message').length, now);
        input.value = '';
    }
    input.disabled = true; sendBtn.disabled = true;
    const loadingId = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId; loadingDiv.className = 'message bot-message loading';
    loadingDiv.innerHTML = `${LOADING_TEXT}<span class="dots"><span>.</span><span>.</span><span>.</span></span> <span class="timer" id="timer-${loadingId}">00:00:00.0</span>`;
    chatContainer.appendChild(loadingDiv); scrollToBottom();
    let seconds = 0;
    const timerElement = document.getElementById(`timer-${loadingId}`);
    const timerInterval = setInterval(() => {
        seconds += 0.1;
        const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60;
        timerElement.innerText = h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0') + ':' + s.toFixed(1).padStart(4, '0');
    }, 100);
    try {
        const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: text, chatId: currentChatId, index: indexToTruncate }) });
        const data = await response.json(); clearInterval(timerInterval); document.getElementById(loadingId).remove();
        if (data.error) {
            const isOverloaded = data.error.includes("429") || data.error.includes("RESOURCE_EXHAUSTED");
            appendMessage(isOverloaded ? "Ich bin gerade überlastet." : `❌ Fehler: ${data.error}`, 'bot-message error-message', false, null, null, isOverloaded ? () => {
                const last = chatContainer.lastElementChild; if (last) last.remove(); sendMessage(text, indexToTruncate);
            } : null);
        } else { appendMessage(data.answer.text, 'bot-message', true, chatContainer.querySelectorAll('.message').length, data.answer.timestamp); }
    } catch (err) { clearInterval(timerInterval); if (document.getElementById(loadingId)) document.getElementById(loadingId).remove(); appendMessage(`❌ Netzwerkfehler: ${err.message}`, 'bot-message error-message', false); }
    finally { input.disabled = false; sendBtn.disabled = false; if (!textOverride) input.focus(); }
}

    function appendMessage(text, className, isMarkdown = false, index = null, timestamp = null, onRetry = null) {

        const msgDiv = document.createElement('div'); msgDiv.className = `message ${className}`; if (index !== null) msgDiv.dataset.index = index;

        const contentDiv = document.createElement('div'); contentDiv.className = 'content-wrapper';

        

        if (isMarkdown) { 

            contentDiv.innerHTML = marked.parse(text); 

            

            // Code-Blöcke verarbeiten

            contentDiv.querySelectorAll('pre').forEach((pre) => {

                const codeBlock = pre.querySelector('code');

                if (codeBlock) {

                    hljs.highlightElement(codeBlock);

                    

                    // Kopier-Button hinzufügen

                    const copyBtn = document.createElement('button');

                    copyBtn.className = 'copy-code-btn';

                    copyBtn.innerText = 'Kopieren';

                    copyBtn.onclick = () => {

                        const code = codeBlock.innerText;

                        navigator.clipboard.writeText(code).then(() => {

                            copyBtn.innerText = 'Kopiert!';

                            copyBtn.classList.add('copied');

                            setTimeout(() => {

                                copyBtn.innerText = 'Kopieren';

                                copyBtn.classList.remove('copied');

                            }, 2000);

                        });

                    };

                    pre.appendChild(copyBtn);

                }

            });

        }

        else { contentDiv.innerText = text; }

        

        msgDiv.appendChild(contentDiv);
    if (timestamp) { const timeSpan = document.createElement('span'); timeSpan.className = 'message-time'; timeSpan.innerText = timestamp; msgDiv.appendChild(timeSpan); }
    if (onRetry) { const rb = document.createElement('button'); rb.className = 'retry-btn'; rb.innerText = 'Nochmal versuchen'; rb.onclick = onRetry; msgDiv.appendChild(rb); }
    if (className.includes('user-message')) { const eb = document.createElement('button'); eb.className = 'edit-btn'; eb.innerHTML = '✎'; eb.onclick = () => startEdit(msgDiv, text, index); msgDiv.appendChild(eb); }
    chatContainer.appendChild(msgDiv); scrollToBottom();
}

function startEdit(msgDiv, originalText, index) {
    const cw = msgDiv.querySelector('.content-wrapper'); const eb = msgDiv.querySelector('.edit-btn'); cw.style.display = 'none'; eb.style.display = 'none';
    const ec = document.createElement('div'); ec.className = 'edit-container';
    const ta = document.createElement('textarea'); ta.className = 'edit-textarea'; ta.value = originalText;
    const acts = document.createElement('div'); acts.className = 'edit-actions';
    const cb = document.createElement('button'); cb.className = 'modal-cancel'; cb.innerText = 'Abbrechen';
    cb.style.padding = "5px 15px"; cb.style.fontSize = "0.85rem";
    cb.onclick = () => { ec.remove(); cw.style.display = 'block'; eb.style.display = ''; };
    const sb = document.createElement('button'); sb.className = 'modal-confirm'; sb.innerText = 'Speichern & Senden';
    sb.style.padding = "5px 15px"; sb.style.fontSize = "0.85rem";
    sb.onclick = () => { const nt = ta.value.trim(); if (nt && nt !== originalText) { ec.remove(); sendMessage(nt, index); } else { cb.onclick(); } };
    acts.appendChild(cb); acts.appendChild(sb); ec.appendChild(ta); ec.appendChild(acts); msgDiv.appendChild(ec); ta.focus();
}

function scrollToBottom() { chatContainer.scrollTop = chatContainer.scrollHeight; }
