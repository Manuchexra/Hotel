// roomservice/history.js
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="orders-history">
            <h2><i class="fas fa-history"></i> Buyurtma tarixi</h2>
            <div class="history-filters">
                <input type="text" id="searchRoom" placeholder="🔍 Xona raqami bo‘yicha..." class="filter-input">
                <select id="statusFilter" class="filter-select">
                    <option value="all">Barcha holatlar</option>
                    <option value="Qabul qilindi">Qabul qilindi</option>
                    <option value="Tayyorlanmoqda">Tayyorlanmoqda</option>
                    <option value="Yetkazilmoqda">Yetkazilmoqda</option>
                    <option value="Yetkazildi">Yetkazildi</option>
                </select>
                <input type="date" id="dateFrom" class="filter-date" placeholder="Sana dan">
                <input type="date" id="dateTo" class="filter-date" placeholder="Sana gacha">
                <button id="refreshBtn" class="btn-gold"><i class="fas fa-sync-alt"></i> Yangilash</button>
            </div>
            <div id="historyContainer" class="history-table-wrapper">Yuklanmoqda...</div>
        </div>
    `;

    let allOrders = [];
    await loadOrders();

    document.getElementById('refreshBtn').addEventListener('click', loadOrders);
    document.getElementById('searchRoom').addEventListener('input', filterOrders);
    document.getElementById('statusFilter').addEventListener('change', filterOrders);
    document.getElementById('dateFrom').addEventListener('change', filterOrders);
    document.getElementById('dateTo').addEventListener('change', filterOrders);

    // WebSocket orqali yangilanish
    window.addEventListener('ws-message', (e) => {
        const data = e.detail;
        if (data.channel === 'order.status.updated') {
            loadOrders(); // to‘liq qayta yuklash yoki faqat yangilangan buyurtmani o‘zgartirish
        }
    });

    async function loadOrders() {
        const container = document.getElementById('historyContainer');
        container.innerHTML = '<div class="loader-container">Yuklanmoqda...</div>';
        try {
            const data = await API.getOrders();
            allOrders = data.orders || [];
            filterOrders();
        } catch (err) {
            container.innerHTML = `<p class="error">Xatolik: ${err.message}</p>`;
        }
    }

    function filterOrders() {
        const searchRoom = document.getElementById('searchRoom').value.trim();
        const status = document.getElementById('statusFilter').value;
        const dateFrom = document.getElementById('dateFrom').value;
        const dateTo = document.getElementById('dateTo').value;

        let filtered = allOrders.filter(order => {
            const matchRoom = searchRoom ? order.room_id.toString().includes(searchRoom) : true;
            const matchStatus = status === 'all' ? true : order.status === status;
            let matchDate = true;
            if (dateFrom && order.created_at) {
                const orderDate = new Date(order.created_at).toISOString().slice(0,10);
                if (orderDate < dateFrom) matchDate = false;
            }
            if (dateTo && matchDate && order.created_at) {
                const orderDate = new Date(order.created_at).toISOString().slice(0,10);
                if (orderDate > dateTo) matchDate = false;
            }
            return matchRoom && matchStatus && matchDate;
        });
        renderTable(filtered);
    }

    function renderTable(orders) {
        const container = document.getElementById('historyContainer');
        if (orders.length === 0) {
            container.innerHTML = '<p class="no-data">Hech qanday buyurtma topilmadi</p>';
            return;
        }
        // Eng yangi buyurtmalar tepada
        const sorted = [...orders].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        container.innerHTML = `
            <table class="data-table orders-table">
                <thead>
                    <tr>
                        <th>ID</th><th>Xona №</th><th>Mahsulotlar</th><th>Umumiy summa</th><th>Holat</th><th>Sana</th>
                    </tr>
                </thead>
                <tbody>
                    ${sorted.map(order => `
                        <tr>
                            <td>${order.id.slice(-8)}</td>
                            <td>${order.room_id}</td>
                            <td class="items-cell">${formatItems(order.items)}</td>
                            <td>${order.total_price.toLocaleString()} so‘m</td>
                            <td><span class="status-badge status-${order.status.replace(' ', '-')}">${order.status}</span></td>
                            <td>${formatDate(order.created_at)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    function formatItems(items) {
        if (!items || items.length === 0) return '—';
        return items.map(i => `${i.name} (${i.price} so‘m)`).join(', ');
    }

    function formatDate(isoString) {
        if (!isoString) return '—';
        const date = new Date(isoString);
        return date.toLocaleString();
    }
}