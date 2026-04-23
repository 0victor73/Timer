const timeDisplay = document.getElementById('timeDisplay');
const messageDisplay = document.getElementById('messageDisplay');
const nameDisplay = document.getElementById('nameDisplay');
const bgImage = document.getElementById('bgImage');

const channel = new BroadcastChannel('timer_app_channel');
let lastBlinkId = 0;

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

function updateUI(state) {
    // Update Name
    if (nameDisplay) {
        nameDisplay.textContent = state.timerName || "";
        nameDisplay.style.color = state.settings.textColor;
    }

    // Update Time
    timeDisplay.textContent = formatTime(state.timeLeft);

    if (state.timeLeft < 0) {
        timeDisplay.classList.add('blink');
        timeDisplay.style.color = '#ff0000ff'; // Red for negative time
    } else {
        timeDisplay.classList.remove('blink');
        timeDisplay.style.color = state.settings.textColor;
    }

    // Update Message
    messageDisplay.textContent = state.message;
    messageDisplay.style.color = state.settings.textColor;
    
    if (state.messageBlink !== lastBlinkId) {
        lastBlinkId = state.messageBlink;
        if (state.messageBlink > 0) {
            messageDisplay.classList.remove('blink-msg');
            void messageDisplay.offsetWidth; // Force reflow to restart animation
            messageDisplay.classList.add('blink-msg');
        } else {
            messageDisplay.classList.remove('blink-msg');
        }
    }

    // Hide timer logic
    const shouldHideTimer = state.timeLeft === 0 && !state.isRunning && state.message !== "";
    if (shouldHideTimer) {
        timeDisplay.classList.add('hide-element');
        if (nameDisplay) nameDisplay.classList.add('hide-element');
        messageDisplay.style.fontSize = Math.max(state.settings.msgSize, state.settings.timeSize * 0.8) + 'vw';
    } else {
        timeDisplay.classList.remove('hide-element');
        if (nameDisplay) nameDisplay.classList.remove('hide-element');
        timeDisplay.style.fontSize = state.settings.timeSize + 'vw';
        messageDisplay.style.fontSize = state.settings.msgSize + 'vw';
    }

    // Update Settings
    document.body.style.backgroundColor = state.settings.bgColor;

    if (state.settings.bgImage) {
        bgImage.style.backgroundImage = `url('${state.settings.bgImage}')`;
    } else {
        bgImage.style.backgroundImage = 'none';
    }

    if (state.settings.textShadow) {
        const shadow = '2px 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)';
        timeDisplay.style.textShadow = shadow;
        messageDisplay.style.textShadow = shadow;
        if (nameDisplay) nameDisplay.style.textShadow = shadow;
    } else {
        timeDisplay.style.textShadow = 'none';
        messageDisplay.style.textShadow = 'none';
        if (nameDisplay) nameDisplay.style.textShadow = 'none';
    }
}

// Listen for updates from Control Panel
channel.onmessage = (event) => {
    if (event.data.type === 'STATE_UPDATE') {
        updateUI(event.data.state);
    }
};

// Request initial state when loaded
channel.postMessage({ type: 'REQUEST_STATE' });
