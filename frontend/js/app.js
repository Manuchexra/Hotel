// app.js: Router, Layout, Login, WebSocket, View Transitions

let currentRoleCss = null;

const routes = {
    // Admin
    '/admin': { page: 'admin/dashboard', title: 'Admin Dashboard', role: 'manager' },
    '/admin/rooms': { page: 'admin/rooms', title: 'Xonalar', role: 'manager' },
    '/admin/reports': { page: 'admin/reports', title: 'Hisobotlar', role: 'manager' },
    '/admin/staff': { page: 'admin/staff', title: 'Xodimlar', role: 'manager' },
    '/admin/customers': { page: 'admin/customers', title: 'Mijozlar', role: 'manager' },
    '/admin/settings': { page: 'admin/settings', title: 'Sozlamalar', role: 'manager' },
    // HR
    '/hr': { page: 'hr/dashboard', title: 'HR Dashboard', role: ['hr', 'manager'] },
    '/hr/staff': { page: 'hr/staff', title: 'Xodimlar', role: ['hr', 'manager'] },
    '/hr/employees': { page: 'hr/employees', title: 'Xodimlar', role: ['hr', 'manager'] },
    '/hr/payroll': { page: 'hr/payroll', title: 'Maosh hisoblash', role: ['hr', 'manager'] },
    // Reception
    '/reception': { page: 'reception/dashboard', title: 'Qabul paneli', role: 'receptionist' },
    '/reception/checkin': { page: 'reception/checkin', title: 'Check-in', role: 'receptionist' },
    '/reception/guests': { page: 'reception/guests', title: 'Mehmonlar', role: 'receptionist' },
    '/reception/billing': { page: 'reception/billing', title: 'Hisob-kitob', role: 'receptionist' },
    '/reception/room-management': { page: 'reception/room-management', title: 'Xonalar boshqaruvi', role: 'receptionist' },
    // Housekeeping
    '/housekeeping': { page: 'housekeeping/dashboard', title: 'Tozalash paneli', role: 'housekeeping' },
    '/housekeeping/history': { page: 'housekeeping/history', title: 'Tozalash tarixi', role: 'housekeeping' },
    '/housekeeping/schedule': { page: 'housekeeping/schedule', title: 'Jadval', role: 'housekeeping' },
    '/housekeeping/stats': { page: 'housekeeping/stats', title: 'Statistika', role: 'housekeeping' },
    // RoomService
    '/roomservice': { page: 'roomservice/dashboard', title: 'Xona xizmati', role: 'roomservice' },
    '/roomservice/menu': { page: 'roomservice/menu', title: 'Menyu', role: 'roomservice' },
    '/roomservice/history': { page: 'roomservice/history', title: 'Buyurtma tarixi', role: 'roomservice' },
    '/roomservice/by-room': { page: 'roomservice/byroom', title: "Xona bo'yicha", role: 'roomservice' },
    // Maintenance
    '/maintenance': { page: 'maintenance/dashboard', title: 'Texnik xizmat', role: 'maintenance' },
    '/maintenance/history': { page: 'maintenance/history', title: 'Muammo tarixi', role: 'maintenance' },
    '/maintenance/priorities': { page: 'maintenance/priorities', title: 'Ustuvorliklar', role: 'maintenance' },
    '/maintenance/performance': { page: 'maintenance/performance', title: 'Samaradorlik', role: 'maintenance' },
    // Umumiy
    '/profile': { page: 'profile', title: 'Profil', role: null },
    '/notifications': { page: 'notifications', title: 'Bildirishnomalar', role: null }
};

async function loadPage(path) {
    const route = routes[path];
    if (!route) {
        document.querySelector('.page-content').innerHTML = '<div class="error">Sahifa topilmadi</div>';
        return;
    }
    const currentRole = Auth.getRole();
    const allowedRoles = Array.isArray(route.role) ? route.role : [route.role];
    if (route.role && !allowedRoles.includes(currentRole)) {
        document.querySelector('.page-content').innerHTML = '<div class="error">Sizga bu sahifaga kirish huquqi yo‘q</div>';
        return;
    }
    document.title = `${route.title} | HotelOS`;

    const updateContent = async () => {
        const importPaths = [`/js/${route.page}.js`, `/js/pages/${route.page}.js`];
        let module = null;
        for (const path of importPaths) {
            try {
                module = await import(path);
                break;
            } catch (err) {
                // continue to next fallback path
            }
        }
        if (module && module.default && typeof module.default === 'function') {
            await module.default();
        } else {
            document.querySelector('.page-content').innerHTML = '<div class="error">Sahifa yuklanmadi</div>';
        }
    };

    if (document.startViewTransition) {
        document.startViewTransition(updateContent);
    } else {
        await updateContent();
    }

    // Rolga yoki sahifaga mos CSS ni yuklash
    const roleCssMap = {
        manager: '/css/admin.css',
        hr: '/css/hr.css',
        receptionist: '/css/reception.css',
        housekeeping: '/css/housekeeping.css',
        roomservice: '/css/roomservice.css',
        maintenance: '/css/maintenance.css'
    };
    const routeCssMap = {
        hr: '/css/hr.css'
    };
    const pageType = route.page.split('/')[0];
    const cssFile = routeCssMap[pageType] || roleCssMap[Auth.getRole()] || '';
    if (cssFile && currentRoleCss !== cssFile) {
        let link = document.querySelector('#role-css');
        if (link) link.href = cssFile;
        currentRoleCss = cssFile;
    }
}

function renderLayout() {
    const app = document.getElementById('app');
    const role = Auth.getRole();
    const username = localStorage.getItem('hotel_user');
    const activePath = (window.location.hash.slice(1).split('?')[0]) || '';
    app.innerHTML = `
        <div class="app-layout">
            <aside class="sidebar">
                <div class="sidebar-header">
                    <h2>HotelOS</h2>
                </div>
                <nav class="sidebar-nav" id="sidebar-nav"></nav>
            </aside>
            <main class="main-content">
                <div class="top-bar">
                    <button id="menuToggle" class="menu-toggle" style="display:none;">☰</button>
                    <div class="user-info">
                        <span>${username}</span>
                        <span class="user-role">${role}</span>
                    </div>
                    <button class="logout-btn" id="logoutBtn">Chiqish</button>
                </div>
                <div class="page-content" id="pageContent">
                    <div class="loader" style="margin:0 auto;"></div>
                </div>
            </main>
        </div>
    `;

    const nav = document.getElementById('sidebar-nav');
    const menuItems = getMenuItems(role);
    nav.innerHTML = menuItems.map(item => `
        <a href="#${item.path}" class="nav-item ${activePath === item.path ? 'active' : ''}" data-path="${item.path}">
            <i class="fas ${item.icon}"></i>
            <span>${item.name}</span>
        </a>
    `).join('');

    document.querySelectorAll('.nav-item').forEach(a => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            const path = a.dataset.path;
            window.location.hash = path;
        });
    });

    document.getElementById('logoutBtn').addEventListener('click', () => Auth.logout());
    let hash = window.location.hash.slice(1) || getDefaultPath(role);
    window.location.hash = hash;
}

function getMenuItems(role) {
    const common = [
        { path: '/profile', name: 'Profil', icon: 'fa-user' },
        { path: '/notifications', name: 'Bildirishnomalar', icon: 'fa-bell' }
    ];
    if (role === 'manager') {
        return [
            { path: '/admin', name: 'Dashboard', icon: 'fa-chart-line' },
            { path: '/admin/rooms', name: 'Xonalar', icon: 'fa-door-open' },
            { path: '/admin/reports', name: 'Hisobotlar', icon: 'fa-file-alt' },
            { path: '/admin/staff', name: 'Xodimlar', icon: 'fa-briefcase' },
            { path: '/admin/customers', name: 'Mijozlar', icon: 'fa-user-friends' },
            { path: '/admin/settings', name: 'Sozlamalar', icon: 'fa-cog' },
            { path: '/hr', name: 'HR boshqaruvi', icon: 'fa-briefcase' },
            ...common
        ];
    } else if (role === 'hr') {
        return [
            { path: '/hr', name: 'Dashboard', icon: 'fa-chart-line' },
            { path: '/hr/staff', name: 'Xodimlar', icon: 'fa-users' },
            { path: '/hr/payroll', name: 'Maoshlar', icon: 'fa-money-bill-wave' },
            ...common
        ];
    } else if (role === 'receptionist') {
        return [
            { path: '/reception', name: 'Dashboard', icon: 'fa-chart-simple' },
            { path: '/reception/checkin', name: 'Check-in', icon: 'fa-sign-in-alt' },
            { path: '/reception/guests', name: 'Mehmonlar', icon: 'fa-address-card' },
            { path: '/reception/billing', name: 'Hisob-kitob', icon: 'fa-receipt' },
            { path: '/reception/room-management', name: 'Xonalar', icon: 'fa-building' },
            ...common
        ];
    } else if (role === 'housekeeping') {
        return [
            { path: '/housekeeping', name: 'Dashboard', icon: 'fa-broom' },
            { path: '/housekeeping/history', name: 'Tarix', icon: 'fa-clock' },
            { path: '/housekeeping/schedule', name: 'Jadval', icon: 'fa-calendar' },
            { path: '/housekeeping/stats', name: 'Statistika', icon: 'fa-chart-bar' },
            ...common
        ];
    } else if (role === 'roomservice') {
        return [
            { path: '/roomservice', name: 'Dashboard', icon: 'fa-tray' },
            { path: '/roomservice/menu', name: 'Menyu', icon: 'fa-utensils' },
            { path: '/roomservice/history', name: 'Tarix', icon: 'fa-history' },
            { path: '/roomservice/by-room', name: "Xona bo'yicha", icon: 'fa-chart-pie' },
            ...common
        ];
    } else if (role === 'maintenance') {
        return [
            { path: '/maintenance', name: 'Dashboard', icon: 'fa-wrench' },
            { path: '/maintenance/history', name: 'Tarix', icon: 'fa-list' },
            { path: '/maintenance/priorities', name: 'Ustuvorliklar', icon: 'fa-flag' },
            { path: '/maintenance/performance', name: 'Samaradorlik', icon: 'fa-chart-line' },
            ...common
        ];
    }
    return common;
}

function getDefaultPath(role) {
    const map = {
        manager: '/admin',
        hr: '/hr',
        receptionist: '/reception',
        housekeeping: '/housekeeping',
        roomservice: '/roomservice',
        maintenance: '/maintenance'
    };
    return map[role] || '/profile';
}

function parseHash(hash) {
    const [pathRaw, queryString = ''] = hash.split('?');
    const path = pathRaw || '';
    const query = Object.fromEntries(new URLSearchParams(queryString));
    return { path, query };
}

function handleHashChange() {
    let hash = window.location.hash.slice(1);
    if (!hash) hash = getDefaultPath(Auth.getRole());
    const { path, query } = parseHash(hash);
    window.__route = { path, query, raw: hash };
    loadPage(path);
    document.querySelectorAll('.nav-item').forEach(a => {
        if (a.dataset.path === path) a.classList.add('active');
        else a.classList.remove('active');
    });
}

// Initialization
window.addEventListener('DOMContentLoaded', async () => {
    Auth.init();
    if (!Auth.isAuthenticated()) {
        document.getElementById('app').innerHTML = `
            <div class="login-container">
                <div class="login-card">
                    <h1>HotelOS</h1>
                    <div class="subtitle">Mehmonxona boshqaruv tizimi</div>
                    <form id="loginForm">
                        <div class="input-group">
                            <label>Username</label>
                            <input type="text" id="loginUsername" required>
                        </div>
                        <div class="input-group">
                            <label>Parol</label>
                            <input type="password" id="loginPassword" required>
                        </div>
                        <button type="submit" class="login-btn">Kirish</button>
                        <div id="loginError" class="error-message" style="display:none;"></div>
                    </form>
                    <div class="test-credentials">
                        <div>Test hisoblar:</div>
                        <div>admin/admin123 | hr/hr123 | reception/rec123 | house/house123 | rs/rs123 | mtc/mtc123</div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            const result = await Auth.login(username, password);
            if (result.success) {
                renderLayout();
                window.location.hash = getDefaultPath(result.role);
                window.addEventListener('hashchange', handleHashChange);
                handleHashChange();
                connectWebSocket(Auth.token);
            } else {
                const errDiv = document.getElementById('loginError');
                errDiv.textContent = result.message || 'Login yoki parol xato';
                errDiv.style.display = 'block';
            }
        });
        return;
    }
    renderLayout();
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    connectWebSocket(Auth.token);
});
