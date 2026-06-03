// guest/guest-auth.js
const GuestAuth = (() => {
    // Har bir servis o'z portida ishlaydi
    const SERVICE_URLS = {
        panel:       'http://localhost:8000',
        reception:   'http://localhost:8001',
        housekeeping:'http://localhost:8002',
        roomservice: 'http://localhost:8003',
        maintenance: 'http://localhost:8004',
        billing:     'http://localhost:8005',
        hr:          'http://localhost:8006',
    };
    const API_BASE = SERVICE_URLS.panel; // Orqaga mos kelish uchun

    /**
     * URL yo'liga qarab to'g'ri servis base URL'ni qaytaradi.
     * Masalan: '/billing/guest/bill' -> 'http://localhost:8005'
     */
    function getServiceBase(path) {
        if (path.startsWith('/billing'))      return SERVICE_URLS.billing;
        if (path.startsWith('/reception'))    return SERVICE_URLS.reception;
        if (path.startsWith('/roomservice'))  return SERVICE_URLS.roomservice;
        if (path.startsWith('/maintenance'))  return SERVICE_URLS.maintenance;
        if (path.startsWith('/housekeeping')) return SERVICE_URLS.housekeeping;
        if (path.startsWith('/hr'))           return SERVICE_URLS.hr;
        return SERVICE_URLS.panel;
    }

    /**
     * Token bilan autentifikatsiyalangan fetch.
     * URL yo'liga qarab to'g'ri serviga yuboradi.
     */
    function authenticatedFetch(path, options = {}) {
        const baseUrl = getServiceBase(path);
        const url = baseUrl + path;
        const token = localStorage.getItem('guest_token');
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': token ? 'Bearer ' + token : '',
            ...(options.headers || {})
        };
        return fetch(url, { ...options, headers });
    }
    const TOKEN_KEY = 'guest_token';
    const GUEST_ID_KEY = 'guest_id';
    const ROOM_KEY = 'guest_room';
    const GUEST_NAME_KEY = 'guest_name';

    function saveToken(token, guestId, room, name) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(GUEST_ID_KEY, guestId);
        localStorage.setItem(ROOM_KEY, room);
        localStorage.setItem(GUEST_NAME_KEY, name);
    }

    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    function getGuestInfo() {
        return {
            token: localStorage.getItem(TOKEN_KEY),
            guestId: localStorage.getItem(GUEST_ID_KEY),
            room: parseInt(localStorage.getItem(ROOM_KEY)) || 0,
            name: localStorage.getItem(GUEST_NAME_KEY)
        };
    }

    function isLoggedIn() {
        return !!localStorage.getItem(TOKEN_KEY);
    }

    function logout() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(GUEST_ID_KEY);
        localStorage.removeItem(ROOM_KEY);
        localStorage.removeItem(GUEST_NAME_KEY);
        window.location.href = 'login.html';
    }

    // BACKEND kutayotgan format: { login, password }
    function login(login, password) {
        return fetch(`${API_BASE}/guest/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password })
        })
        .then(async (r) => {
            const data = await r.json();
            if (!r.ok) throw new Error(data.detail || 'Login yoki parol xato');
            // backend dan kelgan javobda: access_token, guest_name, guest_id, room
            // (room raqami token ichida ham bo'lishi mumkin)
            saveToken(data.access_token, data.guest_id, data.room, data.guest_name);
            return data;
        });
    }

    return {
        login,
        isLoggedIn,
        getToken,
        getGuestInfo,
        logout,
        API_BASE,
        getServiceBase,
        authenticatedFetch,
        SERVICE_URLS
    };
})();

// Logout tugmalarini boshqarish
function setupLogoutButtons() {
    document.querySelectorAll('[data-action="logout"]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Chiqishni tasdiqlaysizmi?')) {
                GuestAuth.logout();
            }
        });
    });
}

// Login formani boshqarish
if (document.getElementById('guestLoginForm')) {
    document.getElementById('guestLoginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const login = document.getElementById('login').value.trim();
        const password = document.getElementById('password').value.trim();
        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');
        const loader = document.getElementById('loader');
        const submitBtn = document.getElementById('submitBtn');

        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';
        if (loader) loader.style.display = 'block';
        if (submitBtn) submitBtn.disabled = true;

        try {
            await GuestAuth.login(login, password);
            if (successDiv) {
                successDiv.textContent = "\u2705 Muvaffaqiyatli kirdingiz. Yo'naltirilmoqda...";
                successDiv.style.display = 'block';
            }
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } catch (err) {
            if (errorDiv) {
                errorDiv.textContent = err.message || "Login muvaffaq bo'lmadi";
                errorDiv.style.display = 'block';
            }
        } finally {
            if (loader) loader.style.display = 'none';
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}

// Sahifada kirish talab qilinsa
function requireGuestLogin() {
    if (!GuestAuth.isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Agar dashboard sahifasida bo'lsa, logout tugmasini ulash
if (document.getElementById('logoutBtn')) {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        GuestAuth.logout();
    });
}