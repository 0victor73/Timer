// DOM Elements
const previewContainer = document.getElementById('previewContainer');
const previewIframe = document.getElementById('previewIframe');

const playPauseBtn = document.getElementById('playPauseBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');

const add1MinBtn = document.getElementById('add1Min');
const sub1MinBtn = document.getElementById('sub1Min');
const add5MinBtn = document.getElementById('add5Min');

const lostTimeDisplay = document.getElementById('lostTimeDisplay');
const resetLostTimeBtn = document.getElementById('resetLostTimeBtn');
const stagedName = document.getElementById('stagedName');
const stagedDuration = document.getElementById('stagedDuration');
const pushStagedBtn = document.getElementById('pushStagedBtn');
const autoStartCheck = document.getElementById('autoStartCheck');

const bulkInput = document.getElementById('bulkInput');
const addBulkBtn = document.getElementById('addBulkBtn');
const timerList = document.getElementById('timerList');

const customMessageInput = document.getElementById('customMessageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const blinkMessageBtn = document.getElementById('blinkMessageBtn');
const saveQuickMsgBtn = document.getElementById('saveQuickMsgBtn');
const clearMessageBtn = document.getElementById('clearMessageBtn');
const presetList = document.getElementById('presetList');

const themeToggleBtn = document.getElementById('themeToggleBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModalOverlay = document.getElementById('settingsModalOverlay');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const openPresenterBtn = document.getElementById('openPresenterBtn');

const newThemeName = document.getElementById('newThemeName');
const saveThemeBtn = document.getElementById('saveThemeBtn');
const themesList = document.getElementById('themesList');

// Settings Inputs
const setBgColor = document.getElementById('setBgColor');
const setTextColor = document.getElementById('setTextColor');
const setTimeSize = document.getElementById('setTimeSize');
const setMsgSize = document.getElementById('setMsgSize');
const setBgImage = document.getElementById('setBgImage');
const setBgImageFile = document.getElementById('setBgImageFile');
const setTextShadow = document.getElementById('setTextShadow');
const applySettingsBtn = document.getElementById('applySettingsBtn');

// Mini Preview
const miniPreviewContainer = document.getElementById('miniPreviewContainer');
const miniPreviewBg = document.getElementById('miniPreviewBg');
const miniPreviewTime = document.getElementById('miniPreviewTime');
const miniPreviewMsg = document.getElementById('miniPreviewMsg');

// State
let state = {
    timerName: "",
    timeLeft: 0,
    totalTime: 0,
    isRunning: false,
    message: "",
    messageBlink: 0,
    settings: {
        bgColor: "#000000",
        textColor: "#ffffff",
        timeSize: 20,
        msgSize: 5,
        bgImage: "",
        textShadow: false
    }
};

let timers = [];
let timerInterval = null;
let stagedTimerId = null;
let totalLostTime = 0;
let savedThemes = [];
let savedQuickMessages = [];
let lastBlinkId = 0;

// Broadcast Channel for cross-window communication
const channel = new BroadcastChannel('timer_app_channel');

// Initialize
function init() {
    loadTheme();
    loadSettings();
    loadSavedThemes();
    loadSavedQuickMessages();
    updateDisplay();
    setupEventListeners();
}

function loadTheme() {
    const savedTheme = localStorage.getItem('timer_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggleBtn.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('timer_theme', newTheme);
    themeToggleBtn.innerHTML = newTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

function loadSettings() {
    const saved = localStorage.getItem('timer_settings');
    if (saved) {
        state.settings = JSON.parse(saved);
    }
    setBgColor.value = state.settings.bgColor;
    setTextColor.value = state.settings.textColor;
    setTimeSize.value = state.settings.timeSize;
    setMsgSize.value = state.settings.msgSize;
    setBgImage.value = state.settings.bgImage || "";
    setTextShadow.checked = state.settings.textShadow || false;

    updateMiniPreview();
    applyPreviewSettings();
}

function updateMiniPreview() {
    miniPreviewContainer.style.backgroundColor = setBgColor.value;
    miniPreviewTime.style.color = setTextColor.value;
    miniPreviewMsg.style.color = setTextColor.value;

    const shouldHideTimer = state.timeLeft === 0 && !state.isRunning && state.message !== "";
    if (shouldHideTimer) {
        miniPreviewTime.classList.add('hide-element');
        miniPreviewMsg.style.fontSize = Math.max(parseInt(setMsgSize.value), parseInt(setTimeSize.value) * 0.8) + 'cqw';
    } else {
        miniPreviewTime.classList.remove('hide-element');
        miniPreviewMsg.style.fontSize = setMsgSize.value + 'cqw';
        miniPreviewTime.style.fontSize = setTimeSize.value + 'cqw';
    }

    if (setBgImage.value) {
        miniPreviewBg.style.backgroundImage = `url('${setBgImage.value}')`;
    } else {
        miniPreviewBg.style.backgroundImage = 'none';
    }

    if (setTextShadow.checked) {
        const shadow = '2px 2px 8px rgba(0,0,0,0.8)';
        miniPreviewTime.style.textShadow = shadow;
        miniPreviewMsg.style.textShadow = shadow;
    } else {
        miniPreviewTime.style.textShadow = 'none';
        miniPreviewMsg.style.textShadow = 'none';
    }
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        setBgImage.value = event.target.result;
        updateMiniPreview();
    };
    reader.readAsDataURL(file);
}

function applySettings() {
    state.settings = {
        bgColor: setBgColor.value,
        textColor: setTextColor.value,
        timeSize: parseInt(setTimeSize.value),
        msgSize: parseInt(setMsgSize.value),
        bgImage: setBgImage.value,
        textShadow: setTextShadow.checked
    };
    localStorage.setItem('timer_settings', JSON.stringify(state.settings));
    applyPreviewSettings();
    broadcastState();
}

function loadSavedThemes() {
    const saved = localStorage.getItem('timer_saved_themes');
    if (saved) {
        savedThemes = JSON.parse(saved);
    }
    renderThemesList();
}

function saveCustomTheme() {
    const name = newThemeName.value.trim();
    if (!name) {
        alert("Por favor, digite um nome para o tema.");
        return;
    }

    const newTheme = {
        id: Date.now().toString(),
        name: name,
        settings: {
            bgColor: setBgColor.value,
            textColor: setTextColor.value,
            timeSize: parseInt(setTimeSize.value),
            msgSize: parseInt(setMsgSize.value),
            bgImage: setBgImage.value,
            textShadow: setTextShadow.checked
        }
    };

    savedThemes.push(newTheme);
    localStorage.setItem('timer_saved_themes', JSON.stringify(savedThemes));
    newThemeName.value = '';
    renderThemesList();
}

window.loadSpecificTheme = function (id) {
    const t = savedThemes.find(x => x.id === id);
    if (t) {
        setBgColor.value = t.settings.bgColor;
        setTextColor.value = t.settings.textColor;
        setTimeSize.value = t.settings.timeSize;
        setMsgSize.value = t.settings.msgSize;
        setBgImage.value = t.settings.bgImage || "";
        setTextShadow.checked = t.settings.textShadow || false;
        updateMiniPreview();
        applySettings();
    }
}

window.deleteTheme = function (id) {
    if (confirm("Tem certeza que deseja apagar este tema?")) {
        savedThemes = savedThemes.filter(x => x.id !== id);
        localStorage.setItem('timer_saved_themes', JSON.stringify(savedThemes));
        renderThemesList();
    }
}

function renderThemesList() {
    themesList.innerHTML = '';
    if (savedThemes.length === 0) {
        themesList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 1rem;">Nenhum tema salvo.</div>';
        return;
    }

    savedThemes.forEach(t => {
        const div = document.createElement('div');
        div.className = 'theme-item';
        div.innerHTML = `
            <div class="theme-info" onclick="loadSpecificTheme('${t.id}')">
                <span>${t.name}</span>
                <div class="theme-colors-preview">
                    <div class="theme-color-dot" style="background-color: ${t.settings.bgColor};"></div>
                    <div class="theme-color-dot" style="background-color: ${t.settings.textColor};"></div>
                </div>
            </div>
            <div class="theme-actions">
                <button onclick="deleteTheme('${t.id}')" title="Apagar Tema"><i class="fas fa-trash"></i></button>
            </div>
        `;
        themesList.appendChild(div);
    });
}

function applyPreviewSettings() {
    // A prévia agora usa um iframe que se atualiza via BroadcastChannel automaticamente
}

// Timer Logic
function formatTime(seconds) {
    const absSeconds = Math.abs(seconds);
    const h = Math.floor(absSeconds / 3600);
    const m = Math.floor((absSeconds % 3600) / 60);
    const s = absSeconds % 60;

    const hStr = h > 0 ? h.toString().padStart(2, '0') + ':' : '';
    const mStr = m.toString().padStart(2, '0') + ':';
    const sStr = s.toString().padStart(2, '0');

    const sign = seconds < 0 ? '-' : '';
    return sign + hStr + mStr + sStr;
}

function updateDisplay() {
    // A renderização da prévia agora é delegada ao iframe via BroadcastChannel
    broadcastState();
}

function togglePlayPause() {
    if (state.isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    if (state.isRunning) return;
    state.isRunning = true;
    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    playPauseBtn.classList.add('active');

    timerInterval = setInterval(() => {
        state.timeLeft--;

        if (state.timeLeft < 0) {
            totalLostTime++;
            lostTimeDisplay.textContent = formatTime(totalLostTime);
        }

        if (state.timeLeft === 0 && autoStartCheck.checked && stagedTimerId) {
            pushStagedTimer();
            // pushStagedTimer already stops the current timer, so we need to start it again
            startTimer();
        }

        updateDisplay();
    }, 1000);
    broadcastState();
}

function pauseTimer() {
    if (!state.isRunning) return;
    state.isRunning = false;
    clearInterval(timerInterval);
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    playPauseBtn.classList.remove('active');
    broadcastState();
}

function stopTimer() {
    state.isRunning = false;
    clearInterval(timerInterval);
    state.timeLeft = 0;
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    playPauseBtn.classList.remove('active');
    updateDisplay();
}

function resetTimer() {
    state.isRunning = false;
    clearInterval(timerInterval);
    state.timeLeft = state.totalTime;
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    playPauseBtn.classList.remove('active');
    updateDisplay();
}

function adjustTime(seconds) {
    state.timeLeft += seconds;
    updateDisplay();
}

// Form Add Logic
const showAddFormBtn = document.getElementById('showAddFormBtn');
const addTimerForm = document.getElementById('addTimerForm');
const newTimerName = document.getElementById('newTimerName');
const newTimerDuration = document.getElementById('newTimerDuration');
const confirmAddTimerBtn = document.getElementById('confirmAddTimerBtn');
const cancelAddTimerBtn = document.getElementById('cancelAddTimerBtn');

let editingTimerId = null;

function toggleAddForm(show) {
    if (show) {
        showAddFormBtn.style.display = 'none';
        addTimerForm.style.display = 'flex';
        newTimerName.focus();
    } else {
        showAddFormBtn.style.display = 'flex';
        addTimerForm.style.display = 'none';
        newTimerName.value = '';
        newTimerDuration.value = '';
        editingTimerId = null;
    }
}

function parseFormTimer() {
    const name = newTimerName.value.trim() || 'Timer';
    const durationStr = newTimerDuration.value.trim();
    if (!durationStr) {
        alert("Por favor, insira uma duração.");
        return;
    }

    let seconds = 0;
    const parts = durationStr.split(':');

    // Validar se todos os pedaços são números
    if (parts.some(p => isNaN(p) || p.trim() === '')) {
        alert("Formato inválido. Use apenas números e dois pontos.");
        return;
    }

    const numParts = parts.map(Number);

    if (numParts.length === 3) {
        // HH:MM:SS
        seconds = (numParts[0] * 3600) + (numParts[1] * 60) + numParts[2];
    } else if (numParts.length === 2) {
        // MM:SS
        seconds = (numParts[0] * 60) + numParts[1];
    } else if (numParts.length === 1) {
        // MM (Apenas minutos)
        seconds = numParts[0] * 60;
    } else {
        alert("Formato inválido. Use HH:MM:SS, MM:SS ou apenas os minutos.");
        return;
    }

    if (seconds > 0) {
        if (editingTimerId) {
            const t = timers.find(x => x.id === editingTimerId);
            if (t) {
                t.name = name;
                t.duration = seconds;
                // Update active state if editing the current timer
                if (state.timerName === t.name || state.timeLeft > 0) {
                    // This is slightly complex, but let's just let them select it again if needed.
                }
            }
        } else {
            timers.push({
                id: Date.now() + Math.random().toString(36).substr(2, 9),
                name: name,
                duration: seconds
            });
        }
        renderTimers();
        toggleAddForm(false);
    } else {
        alert("A duração deve ser maior que zero.");
    }
}

let draggedTimerIndex = null;

function handleDragStart(e) {
    draggedTimerIndex = parseInt(this.dataset.index);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.index);
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    if (parseInt(this.dataset.index) !== draggedTimerIndex) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    const dropIndex = parseInt(this.dataset.index);
    
    if (draggedTimerIndex !== dropIndex && draggedTimerIndex !== null) {
        const draggedItem = timers.splice(draggedTimerIndex, 1)[0];
        timers.splice(dropIndex, 0, draggedItem);
        renderTimers();
    }
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.timer-item').forEach(el => {
        el.classList.remove('drag-over');
    });
    draggedTimerIndex = null;
}

function renderTimers() {
    timerList.innerHTML = '';
    timers.forEach((t, index) => {
        const div = document.createElement('div');
        div.className = 'timer-item';
        div.draggable = true;
        div.dataset.id = t.id;
        div.dataset.index = index;
        
        div.innerHTML = `
            <div class="drag-handle" title="Arraste para reordenar"><i class="fas fa-grip-vertical"></i></div>
            <div class="timer-info" onclick="selectTimer('${t.id}')">
                <div class="timer-name">${t.name}</div>
                <div class="timer-duration">${formatTime(t.duration)}</div>
            </div>
            <div class="timer-actions">
                <button class="play-item" onclick="selectAndStartTimer('${t.id}')" title="Carregar e Iniciar"><i class="fas fa-play"></i></button>
                <button onclick="editTimer('${t.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                <button onclick="removeTimer('${t.id}')" title="Remover"><i class="fas fa-trash"></i></button>
            </div>
        `;

        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragenter', handleDragEnter);
        div.addEventListener('dragover', handleDragOver);
        div.addEventListener('dragleave', handleDragLeave);
        div.addEventListener('drop', handleDrop);
        div.addEventListener('dragend', handleDragEnd);

        timerList.appendChild(div);
    });
}

window.editTimer = function (id) {
    const t = timers.find(x => x.id === id);
    if (t) {
        editingTimerId = id;
        newTimerName.value = t.name;
        // Transform seconds into MM:SS for easy editing
        const m = Math.floor(t.duration / 60);
        const s = t.duration % 60;
        newTimerDuration.value = m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
        toggleAddForm(true);
    }
}

window.selectTimer = function (id) {
    const t = timers.find(x => x.id === id);
    if (t) {
        stagedTimerId = id;
        stagedName.textContent = t.name;
        stagedDuration.textContent = formatTime(t.duration);
        pushStagedBtn.disabled = false;

        document.querySelectorAll('.timer-item').forEach(el => el.classList.remove('active'));
        event.currentTarget.closest('.timer-item').classList.add('active');
    }
}

function pushStagedTimer() {
    if (!stagedTimerId) return;
    const t = timers.find(x => x.id === stagedTimerId);
    if (t) {
        stopTimer();
        state.timerName = t.name;
        state.totalTime = t.duration;
        state.timeLeft = t.duration;
        updateDisplay();

        // Limpar staging após enviar
        stagedTimerId = null;
        stagedName.textContent = "Nenhum selecionado";
        stagedDuration.textContent = "--:--:--";
        pushStagedBtn.disabled = true;
    }
}

window.selectAndStartTimer = function (id) {
    const t = timers.find(x => x.id === id);
    if (t) {
        stopTimer();
        state.timerName = t.name;
        state.totalTime = t.duration;
        state.timeLeft = t.duration;
        updateDisplay();
        startTimer();
    }
}

window.removeTimer = function (id) {
    timers = timers.filter(x => x.id !== id);
    renderTimers();
}

// Messaging
function sendMessage(msg) {
    state.message = msg;
    state.messageBlink = 0; // Reset blink when new message is sent
    customMessageInput.value = '';
    updateDisplay();
}

function clearMessage() {
    state.message = '';
    state.messageBlink = 0;
    updateDisplay();
}

// Lógica de Mensagens Salvas
function loadSavedQuickMessages() {
    const saved = localStorage.getItem('timer_quick_msgs');
    if (saved) {
        savedQuickMessages = JSON.parse(saved);
    }
    renderQuickMessages();
}

function saveQuickMessage() {
    const msg = customMessageInput.value.trim();
    if (!msg) {
        alert("Digite uma mensagem para salvar.");
        return;
    }

    if (!savedQuickMessages.includes(msg)) {
        savedQuickMessages.push(msg);
        localStorage.setItem('timer_quick_msgs', JSON.stringify(savedQuickMessages));
        renderQuickMessages();
    }
}

function renderQuickMessages() {
    presetList.innerHTML = '';
    if (savedQuickMessages.length === 0) {
        presetList.innerHTML = '<span style="font-size: 0.8rem; color: var(--text-muted);">Nenhuma mensagem salva.</span>';
        return;
    }

    savedQuickMessages.forEach((msg, index) => {
        const btn = document.createElement('button');
        btn.className = 'btn preset-btn';
        btn.textContent = msg.length > 25 ? msg.substring(0, 22) + '...' : msg;
        btn.dataset.index = index;
        btn.dataset.msg = msg;
        btn.title = msg;
        presetList.appendChild(btn);
    });
}

function deleteQuickMessage(index) {
    savedQuickMessages.splice(index, 1);
    localStorage.setItem('timer_quick_msgs', JSON.stringify(savedQuickMessages));
    renderQuickMessages();
}

// Broadcast
function broadcastState() {
    channel.postMessage({ type: 'STATE_UPDATE', state });
}

// Listeners
function setupEventListeners() {
    themeToggleBtn.addEventListener('click', toggleTheme);

    settingsBtn.addEventListener('click', () => {
        updateMiniPreview();
        settingsModalOverlay.classList.remove('hidden');
    });
    closeSettingsBtn.addEventListener('click', () => {
        settingsModalOverlay.classList.add('hidden');
    });
    settingsModalOverlay.addEventListener('click', (e) => {
        if (e.target === settingsModalOverlay) {
            settingsModalOverlay.classList.add('hidden');
        }
    });

    // Eventos de mudança nos inputs para a Mini-Prévia
    setBgColor.addEventListener('input', updateMiniPreview);
    setTextColor.addEventListener('input', updateMiniPreview);
    setTimeSize.addEventListener('input', updateMiniPreview);
    setMsgSize.addEventListener('input', updateMiniPreview);
    setBgImage.addEventListener('input', updateMiniPreview);
    setBgImageFile.addEventListener('change', handleImageUpload);
    setTextShadow.addEventListener('change', updateMiniPreview);

    applySettingsBtn.addEventListener('click', applySettings);
    saveThemeBtn.addEventListener('click', saveCustomTheme);

    playPauseBtn.addEventListener('click', togglePlayPause);
    stopBtn.addEventListener('click', stopTimer);
    resetBtn.addEventListener('click', resetTimer);

    add1MinBtn.addEventListener('click', () => adjustTime(60));
    sub1MinBtn.addEventListener('click', () => adjustTime(-60));
    add5MinBtn.addEventListener('click', () => adjustTime(300));

    pushStagedBtn.addEventListener('click', pushStagedTimer);

    resetLostTimeBtn.addEventListener('click', () => {
        totalLostTime = 0;
        lostTimeDisplay.textContent = "00:00";
    });

    showAddFormBtn.addEventListener('click', () => toggleAddForm(true));
    cancelAddTimerBtn.addEventListener('click', () => toggleAddForm(false));
    confirmAddTimerBtn.addEventListener('click', parseFormTimer);

    // Permitir enviar com Enter
    newTimerDuration.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') parseFormTimer();
    });

    sendMessageBtn.addEventListener('click', () => {
        if (customMessageInput.value.trim()) {
            sendMessage(customMessageInput.value.trim());
        }
    });

    blinkMessageBtn.addEventListener('click', () => {
        if (state.message) {
            state.messageBlink = Date.now();
            updateDisplay();
        }
    });

    saveQuickMsgBtn.addEventListener('click', saveQuickMessage);

    clearMessageBtn.addEventListener('click', clearMessage);

    presetList.addEventListener('click', (e) => {
        if (e.target.classList.contains('preset-btn')) {
            if (e.shiftKey) {
                deleteQuickMessage(e.target.dataset.index);
            } else {
                sendMessage(e.target.dataset.msg);
            }
        }
    });

    openPresenterBtn.addEventListener('click', () => {
        window.open('presenter.html', '_blank', 'width=1280,height=720');
        // Atraso curto para garantir que a janela foi aberta antes de transmitir o estado inicial
        setTimeout(broadcastState, 500);
    });

    // Escutar pedidos de estado da tela do apresentador (quando ela recarrega)
    channel.onmessage = (event) => {
        if (event.data.type === 'REQUEST_STATE') {
            broadcastState();
        }
    };
}

init();