// reception/room-management.js
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="room-management">
            <h2><i class="fas fa-door-open"></i> Xonalar boshqaruvi</h2>
            <div class="rooms-list-header">
                <h3>Xonalar ro‘yxati</h3>
                <button id="refreshRoomsBtn" class="btn-gold"><i class="fas fa-sync-alt"></i> Yangilash</button>
            </div>
            <div id="roomsList" class="rooms-table-wrapper">Yuklanmoqda...</div>
            <div class="status-update-card">
                <h3><i class="fas fa-exchange-alt"></i> Xona holatini o‘zgartirish</h3>
                <div class="update-form">
                    <input type="number" id="roomNum" placeholder="Xona raqami" class="form-control">
                    <select id="newStatus" class="form-control">
                        <option value="toza">Toza</option>
                        <option value="iflos">Iflos</option>
                        <option value="tozalanmoqda">Tozalanmoqda</option>
                        <option value="texnik_xizmat">Texnik xizmat</option>
                        <option value="band">Band</option>
                    </select>
                    <button id="updateRoomBtn" class="btn-gold"><i class="fas fa-save"></i> Yangilash</button>
                </div>
                <div id="updateMessage" class="action-message"></div>
            </div>
        </div>
    `;

    await loadRooms();

    document.getElementById('refreshRoomsBtn').addEventListener('click', loadRooms);
    document.getElementById('updateRoomBtn').addEventListener('click', updateRoomStatus);

    window.addEventListener('ws-message', (e) => {
        if (e.detail.channel === 'room.status.update') {
            loadRooms();
        }
    });
}

async function loadRooms() {
    const container = document.getElementById('roomsList');
    try {
        const rooms = await API.getRooms();
        if (!rooms || rooms.length === 0) {
            container.innerHTML = '<p class="no-data">Hech qanday xona topilmadi</p>';
            return;
        }
        container.innerHTML = `
            <table class="data-table rooms-table">
                <thead>
                    <tr><th>№</th><th>Qavat</th><th>Tur</th><th>Holat</th><th>Mehmon</th></tr>
                </thead>
                <tbody>
                    ${rooms.map(room => `
                        <tr>
                            <td>${room.number}</td>
                            <td>${room.floor}</td>
                            <td>${room.type}</td>
                            <td><span class="status-badge status-${room.status}">${room.status}</span></td>
                            <td>${room.current_guest_name || '—'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        container.innerHTML = `<p class="error">Xatolik: ${err.message}</p>`;
    }
}

async function updateRoomStatus() {
    const roomNum = parseInt(document.getElementById('roomNum').value);
    const newStatus = document.getElementById('newStatus').value;
    const msgDiv = document.getElementById('updateMessage');

    if (!roomNum) {
        showMessage(msgDiv, 'Iltimos, xona raqamini kiriting', 'error');
        return;
    }
    try {
        // Agar backendda xona holatini o‘zgartirish API mavjud bo‘lsa:
        // await API.updateRoomStatus(roomNum, newStatus);
        // Hozircha mavjud API'lar orqali: Reception servisida bunday endpoint yo‘q.
        // Ammo frontendda WebSocket orqali xabar yuborish imkoniyatidan foydalanish mumkin?
        // Eng to‘g‘ri yo‘l – panel servisiga /admin/rooms/{id}/status endpoint yaratish.
        // Buning o‘rniga vaqtincha xatolik xabarini chiqarish:
        await API.updateRoomStatus(roomNum, newStatus);
            showMessage(msgDiv, `Xona ${roomNum} holati "${newStatus}" ga o'zgartirildi`, 'success');
            await loadRooms();
            document.getElementById('roomNum').value = '';
    } catch (err) {
        showMessage(msgDiv, `Xatolik: ${err.message}`, 'error');
    }
}

function showMessage(container, message, type) {
    container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => container.innerHTML = '', 3000);
}