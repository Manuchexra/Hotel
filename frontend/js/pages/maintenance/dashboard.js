// maintenance/dashboard.js – to‘liq funksional, bugungi hal qilinganlar hisobi
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="maintenance-dashboard">
            <h2><i class="fas fa-wrench"></i> Texnik xizmat paneli</h2>
            <div class="mtc-stats">
                <div class="stat-card"><i class="fas fa-clock"></i><div><h3>Navbatdagi muammolar</h3><p id="pendingCount">-</p></div></div>
                <div class="stat-card"><i class="fas fa-check-circle"></i><div><h3>Bugun hal qilganlarim</h3><p id="resolvedToday">-</p></div></div>
            </div>
            <div class="mtc-queue">
                <h3><i class="fas fa-list"></i> Ustuvorlik navbati</h3>
                <div id="tasksList" class="tasks-container">Yuklanmoqda...</div>
            </div>
        </div>
    `;

    const currentUser = localStorage.getItem('hotel_user') || 'unknown';
    let pendingQueue = [];

    // Bugungi hal qilinganlarni yuklash
    function loadTodayResolvedCount() {
        const today = new Date().toISOString().slice(0, 10);
        const storageKey = `mtc_resolved_${currentUser}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            const data = JSON.parse(stored);
            if (data.date === today) {
                return data.rooms.length;
            }
        }
        return 0;
    }

    function addToTodayResolved(roomId) {
        const today = new Date().toISOString().slice(0, 10);
        const storageKey = `mtc_resolved_${currentUser}`;
        let stored = localStorage.getItem(storageKey);
        let data = stored ? JSON.parse(stored) : { date: today, rooms: [] };
        if (data.date !== today) {
            data = { date: today, rooms: [] };
        }
        if (!data.rooms.includes(roomId)) {
            data.rooms.push(roomId);
            localStorage.setItem(storageKey, JSON.stringify(data));
        }
        updateStats();
    }

    function updateStats() {
        const count = loadTodayResolvedCount();
        document.getElementById('resolvedToday').innerText = count;
    }

    await loadQueue();
    updateStats();

    window.addEventListener('ws-message', (e) => {
        const data = e.detail;
        if (data.channel === 'issue.created' || data.channel === 'issue.assigned' || data.channel === 'issue.resolved') {
            loadQueue();
            // Agar WebSocket orqali resolved xabar kelsa, hisobni yangilash
            if (data.channel === 'issue.resolved' && data.data?.assigned_to === currentUser) {
                updateStats();
            }
        }
    });

    async function loadQueue() {
        const container = document.getElementById('tasksList');
        try {
            const data = await API.getPriorityQueue();
            pendingQueue = data.queue || [];
            if (pendingQueue.length === 0) {
                container.innerHTML = '<p class="no-data">Navbatda hech qanday muammo yo‘q</p>';
                return;
            }
            container.innerHTML = `
                <ul class="tasks-items">
                    ${pendingQueue.map(issue => `
                        <li class="task-item priority-${issue.priority.toLowerCase()}" data-id="${issue.id}">
                            <div class="task-info">
                                <strong>Xona ${issue.room_id}</strong> – ${escapeHtml(issue.description)}
                                <span class="priority-badge">${issue.priority}</span>
                                <span class="status-badge">Yangi</span>
                            </div>
                            <div class="task-actions">
                                <button class="assign-resolve-btn" data-id="${issue.id}" data-room="${issue.room_id}"><i class="fas fa-user-check"></i> O‘ziga olish va hal qilish</button>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            `;
            document.querySelectorAll('.assign-resolve-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const issueId = btn.dataset.id;
                    const roomId = btn.dataset.room;
                    if (confirm('Ushbu muammoni o‘zingizga olib, hal qilmoqchimisiz?')) {
                        try {
                            // 1. O‘ziga tayinlash
                            await API.assignIssue(issueId, currentUser);
                            await API.resolveIssue(issueId);
                            addToTodayResolved(roomId);
                            cacheResolvedIssue({
                                id: issueId,
                                room_id: parseInt(roomId, 10),
                                description: pendingQueue.find(i => i.id === issueId)?.description || 'Muammo',
                                priority: pendingQueue.find(i => i.id === issueId)?.priority || 'Normal',
                                status: 'hal qilingan',
                                assigned_to: currentUser,
                                created_at: Date.now() / 1000,
                                resolved_at: Date.now() / 1000
                            });
                            Utils.showToast(`Xona ${roomId} dagi muammo hal qilindi`, 'success');
                            await loadQueue();
                        } catch (err) {
                            Utils.showToast('Xatolik: ' + err.message, 'error');
                        }
                    }
                });
            });
            // Navbatdagi muammolar soni
            document.getElementById('pendingCount').innerText = pendingQueue.length;
        } catch (err) {
            container.innerHTML = `<p class="error">Xatolik: ${err.message}</p>`;
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }

    function cacheResolvedIssue(issue) {
        try {
            const key = 'maintenance_issues_cache';
            const cached = JSON.parse(localStorage.getItem(key) || '[]');
            const idx = cached.findIndex(i => i.id === issue.id);
            if (idx >= 0) cached[idx] = issue;
            else cached.push(issue);
            localStorage.setItem(key, JSON.stringify(cached));
        } catch {
            // ignore cache errors
        }
    }
}