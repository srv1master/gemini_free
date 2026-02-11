const chatContainer = document.getElementById('chat-container');
const input = document.getElementById('promptInput');
const fileInput = document.getElementById('fileInput');
const imagePreviewContainer = document.getElementById('image-preview-container');
const sendBtn = document.getElementById('sendBtn');
const chatList = document.getElementById('chat-list');
// ... (rest of vars)

let selectedImages = [];

// Image Handling
fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const base64 = await toBase64(file);
        selectedImages.push({ data: base64.split(',')[1], mimeType: file.type, preview: base64 });
    }
    updateImagePreview();
    fileInput.value = ''; // Reset
});

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function updateImagePreview() {
    imagePreviewContainer.innerHTML = '';
    if (selectedImages.length > 0) {
        imagePreviewContainer.style.display = 'flex';
        selectedImages.forEach((img, index) => {
            const div = document.createElement('div');
            div.className = 'image-preview';
            div.innerHTML = `
                <img src="${img.preview}" alt="Preview">
                <button class="remove-btn" onclick="removeImage(${index})">×</button>
            `;
            imagePreviewContainer.appendChild(div);
        });
    } else {
        imagePreviewContainer.style.display = 'none';
    }
}

window.removeImage = function(index) {
    selectedImages.splice(index, 1);
    updateImagePreview();
}

// ... (existing modal logic)

// Update sendMessage to include images
async function sendMessage(textOverride = null, indexToTruncate = null) {
    const text = textOverride || input.value.trim();
    if (!text && selectedImages.length === 0) return;
    
    const now = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
    const currentImages = [...selectedImages]; // Copy for current message
    
    // Clear selection immediately
    selectedImages = [];
    updateImagePreview();

    if (indexToTruncate !== null) {
        // ... (truncation logic)
        appendMessage(text, 'user-message', false, indexToTruncate, now, null, null, currentImages);
    } else if (!textOverride) {
        appendMessage(text, 'user-message', false, chatContainer.querySelectorAll('.message').length, now, null, null, currentImages);
        input.value = '';
    }

    input.disabled = true; sendBtn.disabled = true;
    // ... (loading logic)
    
    try {
        const response = await fetch('/api/chat', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                prompt: text, 
                chatId: currentChatId, 
                index: indexToTruncate,
                images: currentImages.map(img => ({ mimeType: img.mimeType, data: img.data }))
            }) 
        });
        // ... (streaming logic)
    } 
    // ... (error handling)
}

function appendMessage(text, className, isMarkdown = false, index = null, timestamp = null, onRetry = null, id = null, images = []) {
    const msgDiv = document.createElement('div'); 
    msgDiv.className = `message ${className}`; 
    if (id) msgDiv.id = id;
    if (index !== null) msgDiv.dataset.index = index;
    
    const contentDiv = document.createElement('div'); 
    contentDiv.className = 'content-wrapper';
    
    // Images first
    if (images && images.length > 0) {
        const imgContainer = document.createElement('div');
        imgContainer.style.display = 'flex';
        imgContainer.style.gap = '10px';
        imgContainer.style.marginBottom = '10px';
        imgContainer.style.flexWrap = 'wrap';
        images.forEach(img => {
            const imgEl = document.createElement('img');
            imgEl.src = img.preview || `data:${img.mimeType};base64,${img.data}`; // Handle both preview obj and history obj
            imgEl.style.maxWidth = '200px';
            imgEl.style.maxHeight = '200px';
            imgEl.style.borderRadius = '5px';
            imgEl.style.border = '1px solid #444';
            imgContainer.appendChild(imgEl);
        });
        contentDiv.appendChild(imgContainer);
    }

    if (isMarkdown && text) { 
        // ... (markdown logic)
        const mdDiv = document.createElement('div');
        mdDiv.innerHTML = marked.parse(text);
        mdDiv.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
        addCopyButtons(mdDiv);
        contentDiv.appendChild(mdDiv);
    } else { 
        const txtDiv = document.createElement('div');
        txtDiv.innerText = text; 
        contentDiv.appendChild(txtDiv);
    }
    
    msgDiv.appendChild(contentDiv);
    // ... (rest of appendMessage)

// Modal Logik
function showModal({ title, message, showInput = false, inputType = 'input', defaultValue = "", confirmLabel = "OK", onConfirm }) {
    modalTitle.innerText = title;
    modalMessage.innerText = message;
    modalConfirmBtn.innerText = confirmLabel;
    
    // Eingabetyp steuern
    modalInput.style.display = (showInput && inputType === 'input') ? 'block' : 'none';
    modalTextarea.style.display = (showInput && inputType === 'textarea') ? 'block' : 'none';
    
    const activeInput = inputType === 'textarea' ? modalTextarea : modalInput;
    activeInput.value = defaultValue;
    modalOverlay.style.display = 'flex';

    const handleConfirm = () => {
        const value = showInput ? activeInput.value : true;
        onConfirm(value);
        closeModal();
    };

    modalConfirmBtn.onclick = handleConfirm;
    modalCancelBtn.onclick = closeModal;
    
    if (showInput) {
        setTimeout(() => activeInput.focus(), 100);
        activeInput.onkeydown = (e) => { 
            if (e.key === 'Enter' && (inputType === 'input' || e.ctrlKey)) handleConfirm(); 
        };
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
            
            // Zuletzt verwendeten Chat laden
            const targetId = data.lastChatId && data.chats.includes(data.lastChatId) 
                ? data.lastChatId 
                : data.chats[0];
            
            await selectChat(targetId, false);
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
    
    const agentBtn = document.createElement('button');
    agentBtn.innerHTML = "🤖";
    agentBtn.title = "Agent-Konfiguration";
    agentBtn.onclick = (e) => { e.stopPropagation(); configureAgent(id); };
    
    const editBtn = document.createElement('button');
    editBtn.innerHTML = "✎";
    editBtn.onclick = (e) => { e.stopPropagation(); renameChat(id); };
    const delBtn = document.createElement('button');
    delBtn.innerHTML = "🗑";
    delBtn.onclick = (e) => { e.stopPropagation(); deleteChat(id); };
    
    actions.appendChild(agentBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    div.appendChild(span);
    div.appendChild(actions);
    return div;
}

async function configureAgent(id) {
    try {
        const resp = await fetch(`/api/history?chatId=${id}`);
        const data = await resp.json();
        showModal({
            title: "Agenten-Konfiguration",
            message: `Definiere den System-Prompt für "${id.replace(/_/g, ' ')}":`,
            showInput: true,
            inputType: 'textarea',
            defaultValue: data.systemPrompt || "",
            confirmLabel: "Speichern",
            onConfirm: async (newPrompt) => {
                await fetch('/api/system-prompt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chatId: id, systemPrompt: newPrompt })
                });
                if (id === currentChatId) loadChatHistory(id);
            }
        });
    } catch (err) { alert("Fehler: " + err.message); }
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
    } catch (err) { alert('Fehler: ' + err.message); }
}

async function selectChat(id, shouldCloseSidebar = true) {
    currentChatId = id;
    
    // Dem Server den aktuellen Chat mitteilen (für Persistenz)
    try {
        await fetch('/api/select-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: id })
        });
    } catch (e) { console.error("Session-Sync-Fehler:", e); }

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

async function configureGlobalAgent() {
    try {
        const resp = await fetch('/api/config');
        const data = await resp.json();
        showModal({
            title: "Master-Direktive (Global)",
            message: "Dieser Befehl gilt für ALLE Chats und hat die höchste Priorität:",
            showInput: true,
            inputType: 'textarea',
            defaultValue: data.GLOBAL_SYSTEM_PROMPT || "",
            confirmLabel: "Master-Befehl speichern",
            onConfirm: async (newPrompt) => {
                await fetch('/api/global-prompt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ globalPrompt: newPrompt })
                });
                if (currentChatId !== "default") loadChatHistory(currentChatId);
            }
        });
    } catch (err) { alert("Fehler: " + err.message); }
}

async function loadChatHistory(chatId) {
    try {
        const response = await fetch(`/api/history?chatId=${chatId}`);
        const data = await response.json();
        chatContainer.innerHTML = '<div id="status-header"></div>';
        const statusHeader = document.getElementById('status-header');
        
        if (data.globalPrompt) {
            const masterBadge = document.createElement('div');
            masterBadge.className = 'status-badge master';
            masterBadge.innerHTML = '<div class="indicator"></div><span>📡 MASTER</span>';
            masterBadge.title = "Klicken, um Master-Direktive zu bearbeiten";
            masterBadge.onclick = () => configureGlobalAgent();
            statusHeader.appendChild(masterBadge);
        }

        if (data.systemPrompt) {
            const agentBadge = document.createElement('div');
            agentBadge.className = 'status-badge agent';
            agentBadge.innerHTML = '<div class="indicator"></div><span>🤖 AGENT</span>';
            agentBadge.title = "Klicken, um lokalen Agenten zu bearbeiten";
            agentBadge.onclick = () => configureAgent(chatId);
            statusHeader.appendChild(agentBadge);
        }

        if (data.history && data.history.length > 0) {
            data.history.forEach((msg, index) => {
                appendMessage(msg.parts[0].text, msg.role === 'user' ? 'user-message' : 'bot-message', msg.role === 'model', index, msg.timestamp);
            });
        } else {
            chatContainer.innerHTML += `<div class="message bot-message">System bereit. Neue Session [${chatId.replace(/_/g, ' ')}] gestartet.</div>`;
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
        Array.from(chatContainer.querySelectorAll('.message')).forEach(m => { 
            if (m.dataset.index !== undefined && parseInt(m.dataset.index) >= indexToTruncate) m.remove(); 
        });
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
        const response = await fetch('/api/chat', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ prompt: text, chatId: currentChatId, index: indexToTruncate }) 
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Streaming failed");
        }

        clearInterval(timerInterval);
        document.getElementById(loadingId).remove();

        // Initialisiere leere Bot-Nachricht für Streaming
        const botMsgId = 'bot-' + Date.now();
        const botIndex = chatContainer.querySelectorAll('.message').length;
        appendMessage("", 'bot-message', true, botIndex, null, null, botMsgId);
        const botMsgDiv = document.getElementById(botMsgId);
        const contentDiv = botMsgDiv.querySelector('.content-wrapper');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullBotText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.chunk) {
                            fullBotText += data.chunk;
                            contentDiv.innerHTML = marked.parse(fullBotText);
                            // Highlight Code Blocks in-place
                            contentDiv.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
                            // Add Copy Buttons
                            addCopyButtons(contentDiv);
                            scrollToBottom();
                        } else if (data.done) {
                            const timeSpan = document.createElement('span');
                            timeSpan.className = 'message-time';
                            timeSpan.innerText = data.timestamp;
                            botMsgDiv.appendChild(timeSpan);
                        }
                    } catch (e) { /* Partials */ }
                }
            }
        }
    } catch (err) {
        clearInterval(timerInterval);
        if (document.getElementById(loadingId)) document.getElementById(loadingId).remove();
        const isOverloaded = err.message.includes("429") || err.message.includes("RESOURCE_EXHAUSTED");
        appendMessage(isOverloaded ? "Ich bin gerade überlastet." : `❌ Fehler: ${err.message}`, 'bot-message error-message', false, null, null, isOverloaded ? () => {
            const last = chatContainer.lastElementChild; if (last) last.remove(); sendMessage(text, indexToTruncate);
        } : null);
    } finally {
        input.disabled = false; sendBtn.disabled = false;
        if (!textOverride) input.focus();
    }
}

function addCopyButtons(container) {
    container.querySelectorAll('pre').forEach((pre) => {
        if (pre.querySelector('.copy-code-btn')) return; // Already has button
        const codeBlock = pre.querySelector('code');
        if (codeBlock) {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-code-btn';
            copyBtn.innerText = 'Kopieren';
            copyBtn.onclick = () => {
                const code = codeBlock.innerText;
                navigator.clipboard.writeText(code).then(() => {
                    copyBtn.innerText = 'Kopiert!';
                    copyBtn.classList.add('copied');
                    setTimeout(() => { copyBtn.innerText = 'Kopieren'; copyBtn.classList.remove('copied'); }, 2000);
                });
            };
            pre.appendChild(copyBtn);
        }
    });
}

function appendMessage(text, className, isMarkdown = false, index = null, timestamp = null, onRetry = null, id = null) {
    const msgDiv = document.createElement('div'); 
    msgDiv.className = `message ${className}`; 
    if (id) msgDiv.id = id;
    if (index !== null) msgDiv.dataset.index = index;
    
    const contentDiv = document.createElement('div'); 
    contentDiv.className = 'content-wrapper';
    
    if (isMarkdown && text) { 
        contentDiv.innerHTML = marked.parse(text); 
        contentDiv.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
        addCopyButtons(contentDiv);
    } else { 
        contentDiv.innerText = text; 
    }
    
    msgDiv.appendChild(contentDiv);
    if (timestamp) { 
        const timeSpan = document.createElement('span'); 
        timeSpan.className = 'message-time'; 
        timeSpan.innerText = timestamp; 
        msgDiv.appendChild(timeSpan); 
    }
    
    if (onRetry) { 
        const rb = document.createElement('button'); 
        rb.className = 'retry-btn'; 
        rb.innerText = 'Nochmal versuchen'; 
        rb.onclick = onRetry; 
        msgDiv.appendChild(rb); 
    }
    
    if (className.includes('user-message')) { 
        const eb = document.createElement('button'); 
        eb.className = 'edit-btn'; 
        eb.innerHTML = '✎'; 
        eb.onclick = () => startEdit(msgDiv, text, index); 
        msgDiv.appendChild(eb); 
    }
    
    chatContainer.appendChild(msgDiv); 
    scrollToBottom();
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