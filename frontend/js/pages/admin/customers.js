// admin/customers.js – faqat real backend ma'lumotlari
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="admin-customers">
            <h2><i class="fas fa-users"></i> Mijozlar (Mehmonlar)</h2>
            <div class="customer-filters">
                <input type="text" id="searchCustomer" placeholder="🔍 Ism, xona raqami yoki ID bo‘yicha..." class="search-input">
                <select id="statusFilter" class="filter-select">
                    <option value="all">Barcha mehmonlar</option>
                    <option value="current">Joriy (check-in qilgan)</option>
                    <option value="checked_out">Check-out qilgan</option>
                </select>
                <button id="refreshCustomers" class="btn-gold"><i class="fas fa-sync-alt"></i> Yangilash</button>
            </div>
            <div id="customersList" class="customers-table-wrapper">Yuklanmoqda...</div>
        </div>
    `;

    let allGuests = [];
    await loadCustomers();

    document.getElementById('refreshCustomers').addEventListener('click', loadCustomers);
    document.getElementById('searchCustomer').addEventListener('input', filterAndRender);
    document.getElementById('statusFilter').addEventListener('change', filterAndRender);

    async function loadCustomers() {
        const container = document.getElementById('customersList');
        container.innerHTML = '<div class="loader-container">Yuklanmoqda...</div>';
        try {
            // API.getGuests() → GET /reception/guests
            const guests = await API.getGuests();
            if (!guests || guests.length === 0) {
                container.innerHTML = '<p class="no-data">Hech qanday mehmon topilmadi</p>';
                return;
            }
            // Har bir mehmon uchun qo‘shimcha ma’lumotlar (xona va hisob)
            const enriched = await Promise.all(guests.map(async (guest) => {
                let room = null;
                let bill = null;
                if (guest.room_id) {
                    try {
                        const rooms = await API.getRooms();
                        room = rooms.find(r => r.number === guest.room_id);
                    } catch(e) { /* backend ma'lumot bo'lmasa */ }
                }
                try {
                    bill = await API.getBill(guest.id);
                } catch(e) { /* hisob bo'lmasa */ }
                return { ...guest, room, bill };
            }));
            allGuests = enriched;
            filterAndRender();
        } catch (err) {
            container.innerHTML = `<p>Xatolik: ${err.message}</p>`;
        }
    }

    function filterAndRender() {
        const searchTerm = document.getElementById('searchCustomer').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;
        let filtered = allGuests.filter(guest => {
            const matchSearch = (guest.name || '').toLowerCase().includes(searchTerm) ||
                                (guest.id || '').toLowerCase().includes(searchTerm) ||
                                (guest.room_id && guest.room_id.toString().includes(searchTerm));
            let matchStatus = true;
            if (statusFilter === 'current') matchStatus = guest.room_id != null;
            if (statusFilter === 'checked_out') matchStatus = guest.room_id == null;
            return matchSearch && matchStatus;
        });
        renderTable(filtered);
    }

    function renderTable(guests) {
        const container = document.getElementById('customersList');
        if (guests.length === 0) {
            container.innerHTML = '<p class="no-data">Hech qanday mehmon topilmadi</p>';
            return;
        }
        container.innerHTML = `
            <table class="data-table customers-table">
                <thead>
                    <tr>
                        <th>ID</th><th>Ism</th><th>Xona №</th><th>Holat</th><th>Kechalar</th><th>Hisob (so‘m)</th><th></th>
                    </tr>
                </thead>
                <tbody>
                    ${guests.map(guest => `
                        <tr>
                            <td>${guest.id ? guest.id.slice(-8) : ''}</td>
                            <td><strong>${escapeHtml(guest.name || '')}</strong>${guest.email ? `<br><small>${escapeHtml(guest.email)}</small>` : ''}</td>
                            <td>${guest.room_id != null ? guest.room_id : ''}</td>
                            <td>${guest.room_id != null ? '<span class="status-current">🏨 Joriy</span>' : '<span class="status-checkedout">✅ Chiqqan</span>'}</td>
                            <td>${guest.nights != null ? guest.nights : ''}</td>
                            <td>${guest.bill?.final_total != null ? guest.bill.final_total.toLocaleString() : (guest.bill?.total != null ? guest.bill.total.toLocaleString() : '')} so‘m</td>
                            <td><button class="view-customer-btn" data-id="${guest.id}"><i class="fas fa-eye"></i> Batafsil</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        document.querySelectorAll('.view-customer-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const guest = allGuests.find(g => g.id === id);
                if (guest) showCustomerModal(guest);
            });
        });
    }

    function showCustomerModal(guest) {
        const existing = document.getElementById('customerModal');
        if (existing) existing.remove();
        const modalHtml = `
            <div id="customerModal" class="modal" style="display: flex;">
                <div class="modal-content modal-large">
                    <span class="modal-close">&times;</span>
                    <h3><i class="fas fa-user-circle"></i> ${escapeHtml(guest.name || '')}</h3>
                    <div class="detail-tabs">
                        <button class="tab-btn active" data-tab="info">Shaxsiy</button>
                        <button class="tab-btn" data-tab="room">Xona</button>
                        <button class="tab-btn" data-tab="bill">Hisob-kitob</button>
                    </div>
                    <div class="tab-content">
                        <div class="tab-pane active" data-pane="info">
                            <div class="detail-row"><label>ID:</label><span>${guest.id || ''}</span></div>
                            <div class="detail-row"><label>Ism:</label><span>${escapeHtml(guest.name || '')}</span></div>
                            <div class="detail-row"><label>Email:</label><span>${guest.email || ''}</span></div>
                            <div class="detail-row"><label>Telefon:</label><span>${guest.phone || ''}</span></div>
                            <div class="detail-row"><label>Qolgan tunlar:</label><span>${guest.nights != null ? guest.nights : ''}</span></div>
                        </div>
                        <div class="tab-pane" data-pane="room" style="display:none;">
                            <div class="detail-row"><label>Xona raqami:</label><span>${guest.room_id != null ? guest.room_id : ''}</span></div>
                            <div class="detail-row"><label>Xona turi:</label><span>${guest.room?.type || ''}</span></div>
                            <div class="detail-row"><label>Qavat:</label><span>${guest.room?.floor != null ? guest.room.floor : ''}</span></div>
                            <div class="detail-row"><label>Xona holati:</label><span>${guest.room?.status || ''}</span></div>
                        </div>
                        <div class="tab-pane" data-pane="bill" style="display:none;">
                            <div class="detail-row"><label>Jami to‘lov:</label><span>${guest.bill?.total != null ? guest.bill.total.toLocaleString() : ''} so‘m</span></div>
                            <div class="detail-row"><label>Chegirma:</label><span>${guest.bill?.discount_percent != null ? guest.bill.discount_percent : ''}%</span></div>
                            <div class="detail-row"><label>Yakuniy summa:</label><span>${guest.bill?.final_total != null ? guest.bill.final_total.toLocaleString() : ''} so‘m</span></div>
                            <div class="detail-row"><label>Hisob yopilganmi:</label><span>${guest.bill?.is_closed != null ? (guest.bill.is_closed ? 'Ha' : 'Yo‘q') : ''}</span></div>
                            ${guest.bill?.items && guest.bill.items.length ? `
                            <div><strong>To‘lovlar:</strong>
                                <ul>${guest.bill.items.map(i => `<li>${i.description}: ${i.amount} so‘m</li>`).join('')}</ul>
                            </div>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('customerModal');
        const closeModal = () => modal.remove();
        modal.querySelector('.modal-close').onclick = closeModal;
        window.onclick = (e) => { if (e.target === modal) closeModal(); };
        const tabs = modal.querySelectorAll('.tab-btn');
        tabs.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                tabs.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                modal.querySelectorAll('.tab-pane').forEach(pane => pane.style.display = 'none');
                const activePane = modal.querySelector(`.tab-pane[data-pane="${tab}"]`);
                if (activePane) activePane.style.display = 'block';
            });
        });
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}