// admin/users.js – to'liq real API (mock yo'q)
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="users-header">
            <h2><i class="fas fa-users"></i> Foydalanuvchilar</h2>
            <button id="addUserBtn" class="btn-gold"><i class="fas fa-plus"></i> Qo‘shish</button>
        </div>
        <div id="usersListContainer" class="users-table-wrapper">
            <div class="loader-container">Yuklanmoqda...</div>
        </div>
        <div class="messages-section">
            <h3><i class="fas fa-envelope"></i> Xabarlar</h3>
            <div id="messagesList" class="messages-list"></div>
        </div>
    `;

    createModals();
    await loadUsers();
    await loadMessages();

    document.getElementById('addUserBtn').addEventListener('click', () => openUserModal());
}

// -------------------- REAL API CALLS --------------------
const API_USERS = {
    async getUsers() {
        return await API.request('panel', '/users');
    },
    async createUser(userData) {
        return await API.request('panel', '/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },
    async updateUser(username, userData) {
        return await API.request('panel', `/users/${username}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    },
    async toggleBlock(username, isBlocked) {
        return await API.request('panel', `/users/${username}/block`, {
            method: 'PUT',
            body: JSON.stringify({ blocked: isBlocked })
        });
    },
    async getUserStats(username) {
        // Agar backendda statistik API bo'lmasa, {} qaytariladi
        try {
            return await API.request('panel', `/users/${username}/stats`);
        } catch {
            return {};
        }
    },
    async getMessages() {
        return await API.request('panel', '/admin/messages');
    },
    async sendMessage(receiverId, text) {
        return await API.request('panel', '/admin/messages', {
            method: 'POST',
            body: JSON.stringify({ to: receiverId, text })
        });
    },
    async markMessageAsRead(messageId) {
        return await API.request('panel', `/admin/messages/${messageId}/read`, {
            method: 'PUT'
        });
    }
};

// -------------------- LOAD USERS --------------------
async function loadUsers() {
    const container = document.getElementById('usersListContainer');
    try {
        const users = await API_USERS.getUsers();
        if (!users || users.length === 0) {
            container.innerHTML = '<p class="no-data">Hech qanday foydalanuvchi topilmadi</p>';
            return;
        }

        const usersWithStats = await Promise.all(users.map(async (u) => ({
            ...u,
            stats: await API_USERS.getUserStats(u.username)
        })));

        container.innerHTML = `
            <table class="data-table users-table">
                <thead>
                    <tr><th>Foydalanuvchi</th><th>Rol</th><th>Holat</th><th>Statistika</th><th>Amallar</th></tr>
                </thead>
                <tbody>
                    ${usersWithStats.map(u => `
                        <tr data-username="${u.username}">
                            <td><strong>${escapeHtml(u.fullname || u.username)}</strong><br><small>@${u.username}</small></td>
                            <td><span class="role-badge">${u.role}</span></td>
                            <td>${u.active !== false ? '<span class="status-active">Faol</span>' : '<span class="status-blocked">Bloklangan</span>'}</td>
                            <td class="stats-cell">
                                ${u.stats ? `
                                    <span title="Check-in">🚪 ${u.stats.checkins || 0}</span>
                                    <span title="Tozalash">🧹 ${u.stats.cleanings || 0}</span>
                                    <span title="Buyurtma">🍽️ ${u.stats.orders || 0}</span>
                                    <span title="Muammo">🔧 ${u.stats.issues || 0}</span>
                                ` : '—'}
                            </td>
                            <td class="actions">
                                <button class="edit-user-btn" data-username="${u.username}"><i class="fas fa-edit"></i></button>
                                <button class="block-user-btn" data-username="${u.username}" data-blocked="${u.active === false}">
                                    <i class="fas ${u.active !== false ? 'fa-ban' : 'fa-check-circle'}"></i>
                                </button>
                                <button class="msg-user-btn" data-username="${u.username}" data-name="${escapeHtml(u.fullname || u.username)}"><i class="fas fa-envelope"></i></button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Attach events
        attachUserEvents(users);
    } catch (err) {
        container.innerHTML = `<p class="error">Xatolik: ${err.message}</p>`;
    }
}

function attachUserEvents(users) {
    document.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const username = btn.dataset.username;
            const user = users.find(u => u.username === username);
            if (user) openUserModal(user);
        });
    });
    document.querySelectorAll('.block-user-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const username = btn.dataset.username;
            const currentlyBlocked = btn.dataset.blocked === 'true';
            const action = currentlyBlocked ? 'faollashtirmoq' : 'bloklamoq';
            if (confirm(`Foydalanuvchini ${action}chimisiz?`)) {
                await API_USERS.toggleBlock(username, !currentlyBlocked);
                await loadUsers();
                Utils.showToast(`Foydalanuvchi ${action}ldi`, 'success');
            }
        });
    });
    document.querySelectorAll('.msg-user-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const username = btn.dataset.username;
            const name = btn.dataset.name;
            openMessageModal(username, name);
        });
    });
}

// -------------------- USER MODAL (CREATE/EDIT) --------------------
let currentEditUsername = null;

function openUserModal(user = null) {
    currentEditUsername = user?.username || null;
    const modal = document.getElementById('userModal');
    document.getElementById('modalTitle').innerText = user ? 'Foydalanuvchi tahrirlash' : 'Yangi foydalanuvchi qo‘shish';
    document.getElementById('userFullname').value = user?.fullname || '';
    document.getElementById('userUsername').value = user?.username || '';
    document.getElementById('userRole').value = user?.role || 'receptionist';
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').required = !user;
    modal.style.display = 'flex';
}

async function saveUser() {
    const fullname = document.getElementById('userFullname').value.trim();
    const username = document.getElementById('userUsername').value.trim();
    const role = document.getElementById('userRole').value;
    const password = document.getElementById('userPassword').value;
    if (!username || (!currentEditUsername && !password)) {
        Utils.showToast('Username va parol majburiy', 'error');
        return;
    }
    const userData = { fullname, username, role };
    if (password) userData.password = password;
    try {
        if (currentEditUsername) {
            await API_USERS.updateUser(currentEditUsername, userData);
            Utils.showToast('Foydalanuvchi yangilandi', 'success');
        } else {
            await API_USERS.createUser(userData);
            Utils.showToast('Yangi foydalanuvchi qo‘shildi', 'success');
        }
        closeUserModal();
        await loadUsers();
    } catch (err) {
        Utils.showToast('Xatolik: ' + err.message, 'error');
    }
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    currentEditUsername = null;
}

// -------------------- MESSAGE MODAL --------------------
let currentMsgReceiver = null;

function openMessageModal(receiverId, receiverName) {
    currentMsgReceiver = receiverId;
    const modal = document.getElementById('messageModal');
    document.getElementById('msgReceiverName').value = receiverName;
    document.getElementById('msgText').value = '';
    modal.style.display = 'flex';
}

async function sendMessage() {
    const text = document.getElementById('msgText').value.trim();
    if (!text) {
        Utils.showToast('Xabar matnini kiriting', 'error');
        return;
    }
    try {
        await API_USERS.sendMessage(currentMsgReceiver, text);
        Utils.showToast('Xabar yuborildi', 'success');
        closeMessageModal();
        await loadMessages();
    } catch (err) {
        Utils.showToast('Yuborilmadi: ' + err.message, 'error');
    }
}

function closeMessageModal() {
    document.getElementById('messageModal').style.display = 'none';
    currentMsgReceiver = null;
}

// -------------------- LOAD MESSAGES --------------------
async function loadMessages() {
    const container = document.getElementById('messagesList');
    try {
        const messages = await API_USERS.getMessages();
        if (!messages || messages.length === 0) {
            container.innerHTML = '<p class="no-messages">Hali xabarlar yo‘q</p>';
            return;
        }
        const sorted = [...messages].reverse();
        container.innerHTML = sorted.map(msg => `
            <div class="message-item ${msg.read ? 'read' : 'unread'}">
                <div class="message-header">
                    <strong><i class="fas fa-user"></i> ${escapeHtml(msg.fromName)}</strong>
                    <span>${new Date(msg.timestamp).toLocaleString()}</span>
                </div>
                <div class="message-body">${escapeHtml(msg.text)}</div>
                <div class="message-footer">
                    <span>➡️ ${escapeHtml(msg.toName)}</span>
                    ${!msg.read && msg.to === 'admin' ? `<button class="mark-read-btn" data-id="${msg.id}">✓ O‘qildi</button>` : ''}
                </div>
            </div>
        `).join('');
        document.querySelectorAll('.mark-read-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                await API_USERS.markMessageAsRead(id);
                await loadMessages();
            });
        });
    } catch (err) {
        container.innerHTML = `<p>Xabarlarni yuklashda xatolik: ${err.message}</p>`;
    }
}

// -------------------- CREATE MODALS --------------------
function createModals() {
    if (document.getElementById('userModal')) return;

    const userModalHtml = `
        <div id="userModal" class="modal" style="display: none;">
            <div class="modal-content">
                <span class="modal-close">&times;</span>
                <h3 id="modalTitle">Foydalanuvchi qo‘shish</h3>
                <form id="userForm">
                    <div class="form-group"><label>To‘liq ism</label><input type="text" id="userFullname" placeholder="Ism Familiya"></div>
                    <div class="form-group"><label>Username*</label><input type="text" id="userUsername" required></div>
                    <div class="form-group"><label>Rol</label>
                        <select id="userRole">
                            <option value="manager">Manager</option>
                            <option value="receptionist">Receptionist</option>
                            <option value="housekeeping">Housekeeping</option>
                            <option value="roomservice">RoomService</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="hr">HR</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Parol</label><input type="password" id="userPassword" placeholder="Yangi foydalanuvchi uchun majburiy"></div>
                    <div class="form-actions">
                        <button type="button" id="saveUserBtn" class="btn-gold">Saqlash</button>
                        <button type="button" id="cancelUserBtn" class="btn-outline">Bekor qilish</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    const messageModalHtml = `
        <div id="messageModal" class="modal" style="display: none;">
            <div class="modal-content">
                <span class="modal-close">&times;</span>
                <h3><i class="fas fa-paper-plane"></i> Xabar yuborish</h3>
                <form id="messageForm">
                    <div class="form-group"><label>Qabul qiluvchi</label><input type="text" id="msgReceiverName" readonly></div>
                    <div class="form-group"><label>Xabar matni</label><textarea id="msgText" rows="3" required></textarea></div>
                    <div class="form-actions">
                        <button type="button" id="sendMsgBtn" class="btn-gold">Yuborish</button>
                        <button type="button" id="cancelMsgBtn" class="btn-outline">Bekor qilish</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', userModalHtml);
    document.body.insertAdjacentHTML('beforeend', messageModalHtml);

    document.getElementById('saveUserBtn').addEventListener('click', saveUser);
    document.getElementById('cancelUserBtn').addEventListener('click', closeUserModal);
    document.getElementById('sendMsgBtn').addEventListener('click', sendMessage);
    document.getElementById('cancelMsgBtn').addEventListener('click', closeMessageModal);
    document.querySelectorAll('.modal .modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });
    window.onclick = (e) => {
        if (e.target.classList.contains('modal')) e.target.style.display = 'none';
    };
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}