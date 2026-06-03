// hr/staff.js – HR uchun xodimlar sahifasi (faqat ko‘rish)
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="hr-staff-page">
            <h2><i class="fas fa-users"></i> Xodimlar</h2>
            <!-- KPI kartalari -->
            <div class="hr-stats staff-stats">
                <div class="stat-card"><i class="fas fa-users"></i><div><h3>Jami xodimlar</h3><p id="totalEmployees">-</p></div></div>
                <div class="stat-card"><i class="fas fa-user-check"></i><div><h3>Faol xodimlar</h3><p id="activeEmployees">-</p></div></div>
                <div class="stat-card"><i class="fas fa-calendar-plus"></i><div><h3>Yangi kelganlar</h3><p id="newHires">-</p></div></div>
                <div class="stat-card"><i class="fas fa-umbrella-beach"></i><div><h3>Ta’tildagilar</h3><p id="onLeave">-</p></div></div>
            </div>
            <!-- Qidiruv va filtr -->
            <div class="staff-filters">
                <input type="text" id="searchInput" placeholder="🔍 Ism yoki username bo‘yicha qidirish..." class="search-input">
                <select id="roleFilter" class="filter-select">
                    <option value="">Barcha rollar</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="housekeeping">Housekeeping</option>
                    <option value="roomservice">RoomService</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="manager">Manager</option>
                    <option value="hr">HR</option>
                </select>
                <select id="statusFilter" class="filter-select">
                    <option value="">Barcha holat</option>
                    <option value="active">Faol</option>
                    <option value="inactive">Bloklangan</option>
                </select>
            </div>
            <!-- Xodimlar jadvali -->
            <div id="staffTableContainer" class="staff-table-wrapper">Yuklanmoqda...</div>
        </div>
    `;

    let allEmployees = [];

    await loadEmployees();

    document.getElementById('searchInput').addEventListener('input', filterAndRender);
    document.getElementById('roleFilter').addEventListener('change', filterAndRender);
    document.getElementById('statusFilter').addEventListener('change', filterAndRender);

    async function loadEmployees() {
        try {
            allEmployees = await API.request('panel', '/users');
            if (!allEmployees || allEmployees.length === 0) {
                document.getElementById('staffTableContainer').innerHTML = '<p class="no-data">Hech qanday xodim topilmadi</p>';
                return;
            }
            updateStats();
            filterAndRender();
        } catch (err) {
            document.getElementById('staffTableContainer').innerHTML = `<p>Xatolik: ${err.message}</p>`;
        }
    }

    function updateStats() {
        const total = allEmployees.length;
        const active = allEmployees.filter(e => e.active !== false).length;
        // Mock yangi kelganlar (so‘nggi 30 kun)
        const now = new Date();
        const newHires = allEmployees.filter(e => {
            if (!e.hire_date) return false;
            const hire = new Date(e.hire_date);
            const diff = (now - hire) / (1000 * 3600 * 24);
            return diff <= 30;
        }).length;
        // Mock ta’tildagilar (simulyatsiya)
        const onLeave = Math.floor(Math.random() * 5);
        document.getElementById('totalEmployees').innerText = total;
        document.getElementById('activeEmployees').innerText = active;
        document.getElementById('newHires').innerText = newHires;
        document.getElementById('onLeave').innerText = onLeave;
    }

    function filterAndRender() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const roleFilter = document.getElementById('roleFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;

        let filtered = allEmployees.filter(emp => {
            const matchSearch = emp.username.toLowerCase().includes(searchTerm) ||
                (emp.fullname && emp.fullname.toLowerCase().includes(searchTerm));
            const matchRole = roleFilter ? emp.role === roleFilter : true;
            const matchStatus = statusFilter === 'active' ? (emp.active !== false) :
                                (statusFilter === 'inactive' ? (emp.active === false) : true);
            return matchSearch && matchRole && matchStatus;
        });

        renderTable(filtered);
    }

    function renderTable(employees) {
        const container = document.getElementById('staffTableContainer');
        if (employees.length === 0) {
            container.innerHTML = '<p class="no-data">Hech qanday xodim topilmadi</p>';
            return;
        }
        container.innerHTML = `
            <table class="data-table staff-table">
                <thead>
                    <tr>
                        <th>Xodim</th><th>Rol</th><th>Bo‘lim</th><th>Email</th><th>Telefon</th><th>Holat</th><th>Ishga qabul</th><th></th>
                    </tr>
                </thead>
                <tbody>
                    ${employees.map(emp => `
                        <tr>
                            <td>
                                <div class="employee-name-cell">
                                    <div class="employee-avatar">${getAvatarLetter(emp.fullname || emp.username)}</div>
                                    <div class="employee-info">
                                        <strong>${escapeHtml(emp.fullname || emp.username)}</strong>
                                        <small>@${emp.username}</small>
                                    </div>
                                </div>
                            </td>
                            <td><span class="role-badge">${emp.role}</span></td>
                            <td>${getDepartment(emp.role)}</td>
                            <td>${emp.email || '—'}</td>
                            <td>${emp.phone || '—'}</td>
                            <td>${emp.active !== false ? '<span class="status-active">Faol</span>' : '<span class="status-blocked">Bloklangan</span>'}</td>
                            <td>${emp.hire_date || '—'}</td>
                            <td><button class="view-employee-btn" data-username="${emp.username}"><i class="fas fa-eye"></i> Ko‘rish</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        // Ko‘rish tugmalari
        document.querySelectorAll('.view-employee-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const username = btn.dataset.username;
                const emp = employees.find(e => e.username === username);
                if (emp) openEmployeeModal(emp);
            });
        });
    }

    function getAvatarLetter(name) {
        return (name.charAt(0) || 'U').toUpperCase();
    }

    function getDepartment(role) {
        const dept = {
            receptionist: 'Qabulxona',
            housekeeping: 'Tozalash xizmati',
            roomservice: 'Xona xizmati',
            maintenance: 'Texnik xizmat',
            manager: 'Boshqaruv',
            hr: 'Kadrlar bo‘limi'
        };
        return dept[role] || 'Boshqa';
    }

    function openEmployeeModal(emp) {
        // Remove existing modal
        const existing = document.getElementById('empDetailModal');
        if (existing) existing.remove();

        const modalHtml = `
            <div id="empDetailModal" class="modal" style="display: flex;">
                <div class="modal-content modal-large">
                    <span class="modal-close">&times;</span>
                    <div class="employee-detail-header">
                        <div class="emp-avatar-large">${getAvatarLetter(emp.fullname || emp.username)}</div>
                        <div class="emp-header-info">
                            <h3>${escapeHtml(emp.fullname || emp.username)}</h3>
                            <p>@${emp.username} • <span class="role-badge">${emp.role}</span></p>
                            <p>${emp.active !== false ? '✅ Faol' : '⛔ Bloklangan'}</p>
                        </div>
                    </div>
                    <div class="detail-tabs">
                        <button class="tab-btn active" data-tab="personal">Shaxsiy</button>
                        <button class="tab-btn" data-tab="work">Ish</button>
                        <button class="tab-btn" data-tab="salary">Maosh</button>
                        <button class="tab-btn" data-tab="documents">Hujjatlar</button>
                        <button class="tab-btn" data-tab="activity">Faoliyat</button>
                    </div>
                    <div id="tabContent" class="tab-content">
                        <!-- Shaxsiy ma'lumotlar -->
                        <div class="tab-pane active" data-pane="personal">
                            <div class="detail-row"><label>To‘liq ism:</label><span>${escapeHtml(emp.fullname || '—')}</span></div>
                            <div class="detail-row"><label>Email:</label><span>${emp.email || '—'}</span></div>
                            <div class="detail-row"><label>Telefon:</label><span>${emp.phone || '—'}</span></div>
                            <div class="detail-row"><label>Tug‘ilgan sana:</label><span>${emp.birth_date || '—'}</span></div>
                            <div class="detail-row"><label>Manzil:</label><span>${emp.address || '—'}</span></div>
                        </div>
                        <div class="tab-pane" data-pane="work" style="display:none;">
                            <div class="detail-row"><label>Lavozim:</label><span>${emp.role}</span></div>
                            <div class="detail-row"><label>Bo‘lim:</label><span>${getDepartment(emp.role)}</span></div>
                            <div class="detail-row"><label>Rahbar:</label><span>${emp.manager || '—'}</span></div>
                            <div class="detail-row"><label>Ishga qabul sanasi:</label><span>${emp.hire_date || '—'}</span></div>
                            <div class="detail-row"><label>Ish staji (oy):</label><span>${calculateTenure(emp.hire_date)}</span></div>
                        </div>
                        <div class="tab-pane" data-pane="salary" style="display:none;">
                            <div class="detail-row"><label>Oylik maosh (so'm):</label><span>${emp.monthly_salary ? emp.monthly_salary.toLocaleString() : 'Belgilanmagan'}</span></div>
                            <div class="detail-row"><label>Soatbay to‘lov:</label><span>${emp.hourly_rate ? emp.hourly_rate.toLocaleString() + ' so‘m/soat' : '—'}</span></div>
                            <div class="detail-row"><label>Bank hisob raqami:</label><span>${emp.bank_account || '—'}</span></div>
                        </div>
                        <div class="tab-pane" data-pane="documents" style="display:none;">
                            <p>Mehnat shartnomasi, sertifikatlar va boshqa hujjatlar</p>
                            <ul><li>Hujjatlar hozircha yuklanmagan</li></ul>
                        </div>
                        <div class="tab-pane" data-pane="activity" style="display:none;">
                            <p>So‘nggi faoliyat va baholash natijalari</p>
                            <ul><li>Maʼlumotlar hozircha mavjud emas</li></ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('empDetailModal');
        const closeModal = () => modal.remove();
        modal.querySelector('.modal-close').onclick = closeModal;
        window.onclick = (e) => { if (e.target === modal) closeModal(); };

        // Tablar
        const tabs = modal.querySelectorAll('.tab-btn');
        tabs.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                tabs.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                modal.querySelectorAll('.tab-pane').forEach(pane => pane.style.display = 'none');
                const activePane = modal.querySelector(`.tab-pane[data-pane="${tabName}"]`);
                if (activePane) activePane.style.display = 'block';
            });
        });
    }

    function calculateTenure(hireDate) {
        if (!hireDate) return '—';
        const hire = new Date(hireDate);
        const now = new Date();
        const months = (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth());
        if (months < 12) return `${months} oy`;
        const years = Math.floor(months / 12);
        return `${years} yil ${months % 12} oy`;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}