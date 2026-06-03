// housekeeping/dashboard.js – to'liq tuzatilgan versiya
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="housekeeping-dashboard">
            <h2><i class="fas fa-broom"></i> Tozalash paneli</h2>
            <div class="hk-stats">
                <div class="stat-card"><i class="fas fa-clock"></i><div><h3>Navbatdagi xonalar</h3><p id="pendingCount">-</p></div></div>
                <div class="stat-card"><i class="fas fa-check-circle"></i><div><h3>Bugun tozalangan</h3><p id="todayCount">-</p></div></div>
            </div>
            <div class="hk-queue">
                <h3><i class="fas fa-list"></i> Tozalash navbati</h3>
                <div id="queueList" class="queue-container">Yuklanmoqda...</div>
            </div>
            <div class="hk-actions">
                <h3><i class="fas fa-tools"></i> Xona holatini o'zgartirish</h3>
                <div class="action-form">
                    <input type="number" id="roomNumber" placeholder="Xona raqami" class="form-control">
                    <button id="startCleanBtn" class="btn-gold"><i class="fas fa-play"></i> Tozalashni boshlash</button>
                    <button id="finishCleanBtn" class="btn-gold"><i class="fas fa-check"></i> Tozalashni tugatish</button>
                </div>
                <div id="actionMessage" class="action-message"></div>
            </div>
            <div class="hk-history">
                <h3><i class="fas fa-history"></i> Bugungi tozalangan xonalar</h3>
                <div id="historyList" class="history-container">Yuklanmoqda...</div>
            </div>
        </div>
    `;

    let todayCleaned = [];

    await loadQueue();
    await loadTodayCleaned();
    await loadStats();
    renderHistory();

    // ---- WebSocket listener (eski listenerlar to'planib qolmasligi uchun AbortController) ----
    const controller = new AbortController();
    window.addEventListener('ws-message', (e) => {
        const data = e.detail;
        if (!data || !data.channel) return;
        if (data.channel === 'cleaning.queue.updated') {
            loadQueue();
            loadStats();
        }
        if (data.channel === 'room.status.update') {
            loadQueue();
            loadStats();
            // Faqat aniq "toza" bo'lganda cleaned ro'yxatga qo'shish
            const status = data.data && data.data.status;
            const roomId = data.data && data.data.room_id;
            if (status === 'toza' && roomId) {
                addToTodayCleaned(Number(roomId));
            }
        }
    }, { signal: controller.signal });

    // Sahifadan chiqqanda listenerni o'chirish
    window.addEventListener('hashchange', () => controller.abort(), { once: true });

    // ---- Tugmalar ----
    document.getElementById('startCleanBtn').addEventListener('click', async () => {
        const roomId = parseInt(document.getElementById('roomNumber').value);
        if (!roomId) { showMessage('Xona raqamini kiriting', 'error'); return; }
        try {
            const result = await API.startCleaning(roomId);
            if (result && result.success) {
                showMessage(`${roomId}-xona tozalanmoqda...`, 'success');
                await loadQueue();
                await loadStats();
                document.getElementById('roomNumber').value = '';
            } else {
                showMessage((result && result.message) || 'Xatolik yuz berdi', 'error');
            }
        } catch (err) {
            showMessage('Xatolik: ' + err.message, 'error');
        }
    });

    document.getElementById('finishCleanBtn').addEventListener('click', async () => {
        const roomId = parseInt(document.getElementById('roomNumber').value);
        if (!roomId) { showMessage('Xona raqamini kiriting', 'error'); return; }
        try {
            const result = await API.finishCleaning(roomId);
            if (result && result.success) {
                showMessage(`${roomId}-xona tozalandi ✅`, 'success');
                addToTodayCleaned(roomId);
                await loadQueue();
                await loadStats();
                renderHistory();
                document.getElementById('roomNumber').value = '';
            } else {
                showMessage((result && result.message) || 'Xatolik yuz berdi', 'error');
            }
        } catch (err) {
            showMessage('Xatolik: ' + err.message, 'error');
        }
    });

    // ---- Yordamchi funksiyalar ----
    async function loadQueue() {
        const container = document.getElementById('queueList');
        if (!container) return;
        try {
            const data = await API.getCleaningQueue();
            const queue = data.pending_rooms || [];
            if (queue.length === 0) {
                container.innerHTML = '<p class="no-data">Navbatda hech qanday xona yo\'q</p>';
            } else {
                container.innerHTML = `<ul class="queue-items">${queue.map(id => `<li class="queue-item">Xona ${id} <span class="status-pending">⏳ Kutmoqda</span></li>`).join('')}</ul>`;
            }
        } catch (err) {
            container.innerHTML = `<p>Xatolik: ${err.message}</p>`;
        }
    }

    async function loadTodayCleaned() {
        try {
            const data = await API.getCleanedRooms();
            todayCleaned = (data && data.cleaned_rooms ? data.cleaned_rooms : []).map(Number);
        } catch (err) {
            todayCleaned = [];
        }
    }

    function addToTodayCleaned(roomId) {
        const id = Number(roomId);
        if (!todayCleaned.includes(id)) {
            todayCleaned.push(id);
            renderHistory();
            loadStats();
        }
    }

    function renderHistory() {
        const container = document.getElementById('historyList');
        if (!container) return;
        if (todayCleaned.length === 0) {
            container.innerHTML = '<p class="no-data">Bugun hali hech qanday xona tozalanmagan</p>';
        } else {
            container.innerHTML = `<ul class="history-items">${todayCleaned.map(id => `<li class="history-item">✅ Xona ${id}</li>`).join('')}</ul>`;
        }
    }

    async function loadStats() {
        try {
            const data = await API.getCleaningQueue();
            const pending = data.pending_rooms?.length || 0;
            const pendingEl = document.getElementById('pendingCount');
            const todayEl = document.getElementById('todayCount');
            if (pendingEl) pendingEl.innerText = pending;
            if (todayEl) todayEl.innerText = todayCleaned.length;
        } catch (err) {
            console.error(err);
        }
    }

    function showMessage(msg, type) {
        const msgDiv = document.getElementById('actionMessage');
        if (!msgDiv) return;
        msgDiv.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
        setTimeout(() => msgDiv.innerHTML = '', 3000);
    }
}
