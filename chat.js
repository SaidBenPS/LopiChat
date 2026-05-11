(function() {

    // ─── العناصر ───
    const usernameModal = document.getElementById('usernameModal');
    const usernameInput = document.getElementById('usernameInput');
    const joinBtn = document.getElementById('joinBtn');
    const profileModal = document.getElementById('profileModal');
    const profileNameInput = document.getElementById('profileNameInput');
    const profileDescInput = document.getElementById('profileDescInput');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const cancelProfileBtn = document.getElementById('cancelProfileBtn');
    const profileImageInput = document.getElementById('profileImageInput');
    const profileImage = document.getElementById('profileImage');
    const profileImageWrapper = document.getElementById('profileImageWrapper');
    const profileNameDisplay = document.getElementById('profileNameDisplay');
    const profileDescDisplay = document.getElementById('profileDescDisplay');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const messagesContainer = document.getElementById('messagesContainer');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const themeToggle = document.getElementById('themeToggle');
    const themeLabel = document.getElementById('themeLabel');
    const onlineCountEl = document.getElementById('onlineCount');
    const connectionStatus = document.getElementById('connectionStatus');
    const html = document.documentElement;

    // ─── الحالة ───
    const STORAGE_KEY_USER = 'glass_chat_username';
    const STORAGE_KEY_THEME = 'glass_chat_theme';
    const STORAGE_KEY_PROFILE = 'glass_chat_profile';
    
    // ─── غير هذا السطر عند استخدام nport ───
    const WS_URL = 'wss://mychatroom.nport.link';

    let username = localStorage.getItem(STORAGE_KEY_USER) || '';
    let currentTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
    let profile = JSON.parse(localStorage.getItem(STORAGE_KEY_PROFILE) || '{"image":"","desc":""}');
    let messages = [];
    let ws = null;
    let reconnectTimer = null;

    // ─── البروفايل ───
    function loadProfile() {
        profileNameDisplay.textContent = username || 'مستخدم';
        profileDescDisplay.textContent = profile.desc || 'لم يضف وصفاً بعد';
        if (profile.image) {
            profileImage.src = profile.image;
        }
    }

    function saveProfile() {
        const name = profileNameInput.value.trim();
        const desc = profileDescInput.value.trim();
        if (!name) return;
        username = name;
        profile.desc = desc;
        localStorage.setItem(STORAGE_KEY_USER, username);
        localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
        loadProfile();
        profileModal.style.display = 'none';
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'join', username: username }));
        }
    }

    profileImageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            profile.image = ev.target.result;
            profileImage.src = ev.target.result;
            localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
        };
        reader.readAsDataURL(file);
    });

    editProfileBtn.addEventListener('click', function() {
        profileNameInput.value = username;
        profileDescInput.value = profile.desc || '';
        profileModal.style.display = 'flex';
    });

    profileImageWrapper.addEventListener('click', function() {
        profileNameInput.value = username;
        profileDescInput.value = profile.desc || '';
        profileModal.style.display = 'flex';
    });

    saveProfileBtn.addEventListener('click', saveProfile);
    cancelProfileBtn.addEventListener('click', function() {
        profileModal.style.display = 'none';
    });

    profileModal.addEventListener('click', function(e) {
        if (e.target === profileModal) profileModal.style.display = 'none';
    });

    // ─── WebSocket ───
    function connectWebSocket() {
        if (ws && ws.readyState === WebSocket.OPEN) return;
        updateConnectionStatus('connecting', '🟡 جاري الاتصال...');
        ws = new WebSocket(WS_URL);

        ws.onopen = function() {
            updateConnectionStatus('connected', '🟢 متصل');
            sendBtn.disabled = false;
            if (username) {
                ws.send(JSON.stringify({ type: 'join', username: username }));
            }
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
        };

        ws.onmessage = function(event) {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'onlineCount') {
                    onlineCountEl.textContent = msg.count;
                    return;
                }
                messages.push(msg);
                if (messages.length > 200) messages = messages.slice(-200);
                renderMessages();
            } catch (e) {}
        };

        ws.onclose = function() {
            updateConnectionStatus('disconnected', '🔴 انقطع الاتصال');
            sendBtn.disabled = true;
            scheduleReconnect();
        };

        ws.onerror = function() {
            ws.close();
        };
    }

    function scheduleReconnect() {
        if (reconnectTimer) return;
        updateConnectionStatus('connecting', '🟡 إعادة الاتصال...');
        reconnectTimer = setTimeout(function() {
            reconnectTimer = null;
            connectWebSocket();
        }, 3000);
    }

    function updateConnectionStatus(status, text) {
        connectionStatus.textContent = text;
        connectionStatus.className = 'connection-status ' + status;
    }

    // ─── عرض الرسائل ───
    function renderMessages() {
        messagesContainer.innerHTML = '';
        let lastDate = '';
        messages.forEach(function(msg) {
            const msgDate = new Date(msg.timestamp).toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' });
            if (msgDate !== lastDate) {
                lastDate = msgDate;
                const divider = document.createElement('div');
                divider.className = 'date-divider';
                divider.innerHTML = '<span>' + msgDate + '</span>';
                messagesContainer.appendChild(divider);
            }
            if (msg.type === 'system') {
                const div = document.createElement('div');
                div.className = 'system-msg';
                div.textContent = msg.text;
                messagesContainer.appendChild(div);
                return;
            }
            const isMine = msg.sender === username;
            const row = document.createElement('div');
            row.className = 'msg-row ' + (isMine ? 'mine' : 'other');
            const senderEl = document.createElement('span');
            senderEl.className = 'msg-sender';
            senderEl.textContent = isMine ? 'أنت' : (msg.sender || 'مجهول');
            const bubble = document.createElement('div');
            bubble.className = 'msg-bubble';
            bubble.textContent = msg.text;
            const timeEl = document.createElement('span');
            timeEl.className = 'msg-time';
            timeEl.textContent = new Date(msg.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
            row.appendChild(senderEl);
            row.appendChild(bubble);
            row.appendChild(timeEl);
            messagesContainer.appendChild(row);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function sendMessage() {
        const text = messageInput.value.trim();
        if (!text || !username || !ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({ type: 'user', text: text, username: username }));
        messageInput.value = '';
        messageInput.focus();
    }

    // ─── الثيم ───
    function applyTheme(theme) {
        currentTheme = theme;
        html.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEY_THEME, theme);
        themeLabel.textContent = theme === 'light' ? 'فاتح' : 'داكن';
        themeToggle.querySelector('.icon').textContent = theme === 'light' ? '☀️' : '🌙';
    }

    themeToggle.addEventListener('click', function() {
        applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });

    // ─── نافذة الاسم ───
    function showUsernameModal() {
        usernameModal.style.display = 'flex';
        usernameInput.focus();
    }

    function hideUsernameModal() {
        usernameModal.style.display = 'none';
        if (username) {
            messageInput.focus();
            connectWebSocket();
        }
    }

    joinBtn.addEventListener('click', function() {
        const name = usernameInput.value.trim();
        if (!name) return;
        username = name;
        localStorage.setItem(STORAGE_KEY_USER, username);
        loadProfile();
        hideUsernameModal();
        connectWebSocket();
    });

    usernameInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const name = usernameInput.value.trim();
            if (!name) return;
            username = name;
            localStorage.setItem(STORAGE_KEY_USER, username);
            loadProfile();
            hideUsernameModal();
            connectWebSocket();
        }
    });

    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });

    // ─── بدء التشغيل ───
    loadProfile();
    applyTheme(currentTheme);

    if (!username) {
        showUsernameModal();
    } else {
        hideUsernameModal();
        messageInput.focus();
        connectWebSocket();
    }

})();
