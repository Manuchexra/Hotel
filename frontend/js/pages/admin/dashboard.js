// admin/dashboard.js
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="dashboard-stats">
            <div class="stat-card"><i class="fas fa-door-open"></i><div class="stat-info"><h3>Band xonalar</h3><p id="occupiedRooms">-</p></div></div>
            <div class="stat-card"><i class="fas fa-broom"></i><div class="stat-info"><h3>Tozalash navbati</h3><p id="cleaningQueue">-</p></div></div>
            <div class="stat-card"><i class="fas fa-wrench"></i><div class="stat-info"><h3>Faol muammolar</h3><p id="activeIssues">-</p></div></div>
            <div class="stat-card"><i class="fas fa-receipt"></i><div class="stat-info"><h3>Kunlik daromad</h3><p id="dailyRevenue">-</p></div></div>
        </div>
        <div class="charts-row">
            <div class="chart-card"><canvas id="roomsChart"></canvas></div>
            <div class="chart-card"><canvas id="revenueChart"></canvas></div>
        </div>
        <div class="recent-activity">
            <h3><i class="fas fa-history"></i> So‘nggi faoliyat</h3>
            <ul id="activityList" class="activity-list"></ul>
        </div>
    `;

    // Chart.js ni yuklash (agar mavjud bo‘lmasa)
    if (typeof Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        script.onload = () => initDashboard();
        script.onerror = () => {
            console.error("Chart.js yuklanmadi");
            document.getElementById('roomsChart').parentElement.innerHTML = '<p>Grafik yuklanmadi</p>';
        };
        document.head.appendChild(script);
    } else {
        initDashboard();
    }

    window.addEventListener('ws-message', handleWsMessage);
}

let roomsChart = null;
let revenueChart = null;

async function initDashboard() {
    await loadStats();
    await loadCharts();
}

async function loadStats() {
    try {
        // Xonalar
        const rooms = await API.getRooms();
        const occupied = Array.isArray(rooms) ? rooms.filter(r => r.status === 'band').length : 0;
        document.getElementById('occupiedRooms').innerText = occupied;

        // Tozalash navbati
        let pending = 0;
        try {
            const queue = await API.getCleaningQueue();
            pending = queue.pending_rooms?.length || 0;
        } catch (e) {
            console.warn("Tozalash navbati API ishlamadi:", e);
        }
        document.getElementById('cleaningQueue').innerText = pending;

        // Faol muammolar
        let active = 0;
        try {
            const issues = await API.getIssues();
            active = (issues.issues || []).filter(i => i.status !== 'hal qilingan').length;
        } catch (e) {
            console.warn("Muammolar API ishlamadi:", e);
        }
        document.getElementById('activeIssues').innerText = active;

        // Kunlik daromad (buyurtmalar asosida)
        let revenue = 0;
        try {
            const orders = await API.getOrders();
            const today = new Date().toISOString().slice(0,10);
            const todayOrders = (orders.orders || []).filter(o => o.created_at?.startsWith(today));
            revenue = todayOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
        } catch (e) {
            console.warn("Buyurtmalar API ishlamadi:", e);
        }
        document.getElementById('dailyRevenue').innerText = `${revenue.toLocaleString()} so‘m`;
    } catch (err) {
        console.error('Stat yuklashda xatolik:', err);
        Utils.showToast('Statistikani yuklashda xatolik', 'error');
    }
}

async function loadCharts() {
    try {
        const rooms = await API.getRooms();
        const statusCount = { band:0, toza:0, iflos:0, tozalanmoqda:0, texnik_xizmat:0 };
        if (Array.isArray(rooms)) {
            rooms.forEach(r => { statusCount[r.status] = (statusCount[r.status] || 0) + 1; });
        }

        const ctxRooms = document.getElementById('roomsChart')?.getContext('2d');
        if (ctxRooms) {
            if (roomsChart) roomsChart.destroy();
            roomsChart = new Chart(ctxRooms, {
                type: 'doughnut',
                data: {
                    labels: ['Band', 'Toza', 'Iflos', 'Tozalanmoqda', 'Texnik xizmat'],
                    datasets: [{
                        data: [statusCount.band, statusCount.toza, statusCount.iflos, statusCount.tozalanmoqda, statusCount.texnik_xizmat],
                        backgroundColor: ['#ef4444', '#10b981', '#f59e0b', '#3b82f6', '#6b7280'],
                        borderColor: 'var(--gold, #d4af37)',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'bottom', labels: { color: 'var(--text-light, #f5f5f5)' } } }
                }
            });
        }

        // Daromad grafigi (mock – real backend maʼlumotlari bilan almashtirish mumkin)
        const last7Days = Array.from({length:7}, (_,i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6-i));
            return d.toLocaleDateString('uz', {month:'short', day:'numeric'});
        });
        const mockRevenue = [120, 250, 180, 300, 220, 400, 350];
        const mockOccupancy = [45, 50, 55, 60, 58, 70, 68];
        const ctxRevenue = document.getElementById('revenueChart')?.getContext('2d');
        if (ctxRevenue) {
            if (revenueChart) revenueChart.destroy();
            revenueChart = new Chart(ctxRevenue, {
                type: 'line',
                data: {
                    labels: last7Days,
                    datasets: [
                        { label: 'Daromad (ming so‘m)', data: mockRevenue, borderColor: 'var(--gold, #d4af37)', backgroundColor: 'rgba(212,175,55,0.1)', tension: 0.3, fill: true },
                        { label: 'Bandlik (%)', data: mockOccupancy, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', tension: 0.3, fill: true }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        tooltip: { mode: 'index' },
                        legend: { labels: { color: 'var(--text-light, #f5f5f5)' } }
                    }
                }
            });
        }
    } catch (err) {
        console.error('Grafik yuklashda xatolik:', err);
        const chartContainer = document.getElementById('roomsChart')?.parentElement;
        if (chartContainer) chartContainer.innerHTML = '<p class="error">Grafik yuklanmadi</p>';
    }
}

function handleWsMessage(e) {
    const data = e.detail;
    const relevantChannels = ['room.status.update', 'cleaning.queue.updated', 'issue.resolved', 'order.status.updated'];
    if (relevantChannels.includes(data.channel)) {
        loadStats();
        loadCharts();
        addActivityLog(data);
    }
}

function addActivityLog(data) {
    const list = document.getElementById('activityList');
    if (!list) return;
    const time = new Date().toLocaleTimeString();
    let message = '';
    switch (data.channel) {
        case 'room.status.update':
            message = `🛏️ Xona ${data.data.room_id} → ${data.data.status}`;
            break;
        case 'cleaning.queue.updated':
            message = `🧹 Tozalash navbati yangilandi (${data.data.queue?.length || 0} ta xona)`;
            break;
        case 'issue.resolved':
            message = `🔧 Muammo ${data.data.issue_id} hal qilindi (xona ${data.data.room_id})`;
            break;
        case 'order.status.updated':
            message = `🍽️ Buyurtma ${data.data.order_id} → ${data.data.status}`;
            break;
        default:
            message = `📢 ${data.channel}: ${JSON.stringify(data.data)}`;
    }
    const li = document.createElement('li');
    li.innerHTML = `<span class="activity-time">${time}</span> <span class="activity-msg">${message}</span>`;
    list.prepend(li);
    if (list.children.length > 20) list.removeChild(list.lastChild);
}