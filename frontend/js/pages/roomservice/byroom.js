// roomservice/byroom.js
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="byroom-page">
            <h2><i class="fas fa-door-open"></i> Xona bo‘yicha buyurtmalar</h2>
            <div class="search-card">
                <div class="search-form">
                    <input type="number" id="roomNum" placeholder="Xona raqami" class="search-input">
                    <button id="searchBtn" class="btn-gold"><i class="fas fa-search"></i> Ko‘rish</button>
                </div>
                <div id="roomInfo" class="room-info" style="display:none;"></div>
            </div>
            <div id="result" class="result-container">
                <div class="info-message">Iltimos, xona raqamini kiriting va "Ko‘rish" tugmasini bosing.</div>
            </div>
        </div>
    `;

    document.getElementById('searchBtn').addEventListener('click', searchOrders);
    document.getElementById('roomNum').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchOrders();
    });

    async function searchOrders() {
        const roomId = parseInt(document.getElementById('roomNum').value);
        const resultDiv = document.getElementById('result');
        const roomInfoDiv = document.getElementById('roomInfo');
        if (!roomId || isNaN(roomId)) {
            resultDiv.innerHTML = '<div class="error-message">❌ Iltimos, to‘g‘ri xona raqamini kiriting!</div>';
            return;
        }
        resultDiv.innerHTML = '<div class="loader-container">Yuklanmoqda...</div>';
        try {
            // Xona ma'lumotlarini olish (ixtiyoriy)
            const allRooms = await API.getRooms();
            const room = allRooms.find(r => r.number === roomId);
            if (room) {
                roomInfoDiv.style.display = 'flex';
                roomInfoDiv.innerHTML = `
                    <div><strong>Xona ${room.number}</strong></div>
                    <div>Qavat: ${room.floor}</div>
                    <div>Tur: ${room.type}</div>
                    <div>Holat: <span class="status-badge status-${room.status}">${room.status}</span></div>
                    ${room.current_guest_name ? `<div>Mehmon: ${room.current_guest_name}</div>` : ''}
                `;
            } else {
                roomInfoDiv.style.display = 'none';
            }
            const ordersData = await API.getOrdersByRoom(roomId);
            const orders = ordersData.orders || [];
            if (orders.length === 0) {
                resultDiv.innerHTML = '<div class="no-data">📭 Bu xonaga hech qanday buyurtma topilmadi.</div>';
                return;
            }
            // Eng yangi buyurtma tepada
            orders.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
            resultDiv.innerHTML = `
                <h3>📋 Xona ${roomId} uchun buyurtmalar (${orders.length} ta)</h3>
                <table class="data-table orders-table">
                    <thead>
                        <tr><th>ID</th><th>Mahsulotlar</th><th>Umumiy summa</th><th>Holat</th><th>Sana</th></tr>
                    </thead>
                    <tbody>
                        ${orders.map(order => `
                            <tr>
                                <td>${order.id.slice(-8)}</td>
                                <td class="items-cell">${formatItems(order.items)}</td>
                                <td>${order.total_price.toLocaleString()} so‘m</td>
                                <td><span class="status-badge status-${order.status.replace(' ', '-')}">${order.status}</span></td>
                                <td>${formatDate(order.created_at)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (err) {
            resultDiv.innerHTML = `<div class="error-message">Xatolik: ${err.message}</div>`;
        }
    }

    function formatItems(items) {
        if (!items || items.length === 0) return '—';
        return items.map(i => `${i.name} (${i.price} so‘m)`).join(', ');
    }

    function formatDate(isoString) {
        if (!isoString) return '—';
        return new Date(isoString).toLocaleString();
    }
}