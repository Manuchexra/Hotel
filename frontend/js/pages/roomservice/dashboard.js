// roomservice/dashboard.js
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="roomservice-dashboard">
            <h2><i class="fas fa-tray"></i> Xona xizmati paneli</h2>
            <div class="rs-stats">
                <div class="stat-card"><i class="fas fa-spinner"></i><div><h3>Faol buyurtmalar</h3><p id="activeOrders">-</p></div></div>
                <div class="stat-card"><i class="fas fa-check-circle"></i><div><h3>Bugun yetkazilgan</h3><p id="deliveredToday">-</p></div></div>
            </div>
            <div class="rs-actions">
                <button id="createOrderBtn" class="btn-gold"><i class="fas fa-plus"></i> Yangi buyurtma</button>
            </div>
            <div class="rs-orders">
                <h3><i class="fas fa-list"></i> Buyurtmalar</h3>
                <div id="ordersList" class="orders-container">Yuklanmoqda...</div>
            </div>
        </div>
    `;

    let currentOrders = [];

    await loadOrders();
    await loadStats();

    document.getElementById('createOrderBtn').addEventListener('click', () => openCreateOrderModal());

    window.addEventListener('ws-message', (e) => {
        const data = e.detail;
        if (data.channel === 'order.status.updated') {
            loadOrders();
            loadStats();
        }
    });

    async function loadOrders() {
        const container = document.getElementById('ordersList');
        try {
            const data = await API.getOrders();
            currentOrders = data.orders || [];
            if (currentOrders.length === 0) {
                container.innerHTML = '<p class="no-data">Hozircha buyurtmalar yo‘q</p>';
                return;
            }
            // Eng yangi tepada
            const sorted = [...currentOrders].reverse();
            container.innerHTML = sorted.map(order => `
                <div class="order-card" data-id="${order.id}">
                    <div class="order-header">
                        <strong>Buyurtma #${order.id.slice(-6)}</strong>
                        <span class="order-room">Xona ${order.room_id}</span>
                    </div>
                    <div class="order-items">
                        ${order.items ? order.items.map(i => `<span>${i.name} (${i.price} so‘m)</span>`).join(', ') : ''}
                    </div>
                    <div class="order-footer">
                        <div class="order-status">
                            <label>Holat:</label>
                            <select class="status-select" data-id="${order.id}">
                                <option value="Qabul qilindi" ${order.status === 'Qabul qilindi' ? 'selected' : ''}>Qabul qilindi</option>
                                <option value="Tayyorlanmoqda" ${order.status === 'Tayyorlanmoqda' ? 'selected' : ''}>Tayyorlanmoqda</option>
                                <option value="Yetkazilmoqda" ${order.status === 'Yetkazilmoqda' ? 'selected' : ''}>Yetkazilmoqda</option>
                                <option value="Yetkazildi" ${order.status === 'Yetkazildi' ? 'selected' : ''}>Yetkazildi</option>
                            </select>
                        </div>
                        <div class="order-total">Jami: ${order.total_price} so‘m</div>
                    </div>
                </div>
            `).join('');

            document.querySelectorAll('.status-select').forEach(select => {
                select.addEventListener('change', async (e) => {
                    const orderId = select.dataset.id;
                    const newStatus = select.value;
                    try {
                        await API.updateOrderStatus(orderId, newStatus);
                        Utils.showToast(`Buyurtma holati "${newStatus}" ga o‘zgartirildi`, 'success');
                        await loadOrders();
                        await loadStats();
                    } catch (err) {
                        Utils.showToast('Xatolik: ' + err.message, 'error');
                        select.value = order.status; // revert
                    }
                });
            });
        } catch (err) {
            container.innerHTML = `<p class="error">Xatolik: ${err.message}</p>`;
        }
    }

    async function loadStats() {
        try {
            const data = await API.getOrders();
            const orders = data.orders || [];
            const active = orders.filter(o => o.status !== 'Yetkazildi').length;
            document.getElementById('activeOrders').innerText = active;
            const today = new Date().toISOString().slice(0,10);
            const deliveredToday = orders.filter(o => o.status === 'Yetkazildi' && o.updated_at?.startsWith(today)).length;
            document.getElementById('deliveredToday').innerText = deliveredToday;
        } catch (err) {
            console.error(err);
        }
    }

    function openCreateOrderModal() {
        const modalHtml = `
            <div id="createOrderModal" class="modal">
                <div class="modal-content">
                    <span class="modal-close">&times;</span>
                    <h3>Yangi buyurtma</h3>
                    <form id="createOrderForm">
                        <div class="form-group"><label>Xona raqami</label><input type="number" id="orderRoom" required></div>
                        <div class="form-group"><label>Mehmon ID (ixtiyoriy)</label><input type="text" id="orderGuest"></div>
                        <div class="form-group"><label>Mahsulotlar</label>
                            <div id="orderItemsList"></div>
                            <button type="button" id="addItemBtn" class="btn-small">+ Mahsulot qo‘shish</button>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn-gold">Yaratish</button>
                            <button type="button" id="cancelModalBtn" class="btn-outline">Bekor</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('createOrderModal');
        const itemsContainer = document.getElementById('orderItemsList');
        let itemCount = 0;

        function addItemRow() {
            const idx = itemCount++;
            const row = document.createElement('div');
            row.className = 'item-row';
            row.innerHTML = `
                <input type="text" placeholder="Mahsulot nomi" class="item-name" required>
                <input type="number" placeholder="Narxi" class="item-price" step="1000" required>
                <button type="button" class="remove-item-btn">✖</button>
            `;
            row.querySelector('.remove-item-btn').addEventListener('click', () => row.remove());
            itemsContainer.appendChild(row);
        }

        document.getElementById('addItemBtn').addEventListener('click', addItemRow);
        addItemRow(); // bitta default qator

        const closeModal = () => modal.remove();
        modal.querySelector('.modal-close').onclick = closeModal;
        document.getElementById('cancelModalBtn').onclick = closeModal;
        window.onclick = (e) => { if (e.target === modal) closeModal(); };

        document.getElementById('createOrderForm').onsubmit = async (e) => {
            e.preventDefault();
            const room_id = parseInt(document.getElementById('orderRoom').value);
            const guest_id = document.getElementById('orderGuest').value || null;
            const items = [];
            document.querySelectorAll('.item-row').forEach(row => {
                const name = row.querySelector('.item-name').value.trim();
                const price = parseFloat(row.querySelector('.item-price').value);
                if (name && !isNaN(price)) items.push({ name, price });
            });
            if (items.length === 0) {
                Utils.showToast('Kamida bitta mahsulot qo‘shing', 'error');
                return;
            }
            try {
                await API.createOrder({ room_id, guest_id, items });
                Utils.showToast('Buyurtma yaratildi', 'success');
                closeModal();
                await loadOrders();
                await loadStats();
            } catch (err) {
                Utils.showToast('Xatolik: ' + err.message, 'error');
            }
        };
    }
}