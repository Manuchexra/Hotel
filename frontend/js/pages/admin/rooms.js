// admin/rooms.js
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="rooms-header">
            <h2><i class="fas fa-door-open"></i> Xonalar ro‘yxati</h2>
            <button id="addRoomBtn" class="btn-gold"><i class="fas fa-plus"></i> Yangi xona</button>
        </div>
        <div class="rooms-table-wrapper">
            <table class="data-table">
                <thead>
                    <tr><th>№</th><th>Qavat</th><th>Tur</th><th>Holat</th><th>Mehmon</th><th>Amallar</th></tr>
                </thead>
                <tbody id="roomsTableBody">
                    <tr><td colspan="6" style="text-align:center;">Yuklanmoqda...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    // Modal qo‘shish (agar mavjud bo‘lmasa)
    if (!document.getElementById('roomModal')) {
        const modalHtml = `
            <div id="roomModal" class="modal" style="display: none;">
                <div class="modal-content">
                    <span class="modal-close">&times;</span>
                    <h3 id="modalTitle">Xona qo‘shish</h3>
                    <form id="roomForm">
                        <input type="hidden" id="roomId">
                        <div class="form-row"><label>Xona raqami:</label><input type="number" id="roomNumber" required></div>
                        <div class="form-row"><label>Qavat:</label><input type="number" id="roomFloor" required></div>
                        <div class="form-row"><label>Tur:</label>
                            <select id="roomType">
                                <option>bir kishilik</option><option>ikki kishilik</option><option>lyuks</option><option>nogiron</option>
                            </select>
                        </div>
                        <div class="form-row"><label>Holat:</label>
                            <select id="roomStatus">
                                <option>toza</option><option>iflos</option><option>tozalanmoqda</option><option>texnik_xizmat</option><option>band</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn-gold">Saqlash</button>
                            <button type="button" id="cancelModalBtn" class="btn-outline">Bekor qilish</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // Modal elementlari
    const modal = document.getElementById('roomModal');
    const closeSpan = modal.querySelector('.modal-close');
    const cancelBtn = document.getElementById('cancelModalBtn');
    const form = document.getElementById('roomForm');

    const openModal = (room = null) => {
        document.getElementById('modalTitle').innerText = room ? 'Xona tahrirlash' : 'Yangi xona qo‘shish';
        document.getElementById('roomId').value = room?.number || '';
        document.getElementById('roomNumber').value = room?.number || '';
        document.getElementById('roomFloor').value = room?.floor || '';
        document.getElementById('roomType').value = room?.type || 'bir kishilik';
        document.getElementById('roomStatus').value = room?.status || 'toza';
        modal.style.display = 'flex';
    };

    const closeModal = () => {
        modal.style.display = 'none';
        form.reset();
    };

    closeSpan.onclick = closeModal;
    cancelBtn.onclick = closeModal;
    window.onclick = (e) => { if (e.target === modal) closeModal(); };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const roomData = {
            id: document.getElementById('roomId').value || undefined,
            number: parseInt(document.getElementById('roomNumber').value),
            floor: parseInt(document.getElementById('roomFloor').value),
            type: document.getElementById('roomType').value,
            status: document.getElementById('roomStatus').value
        };
        try {
            if (roomData.id) {
                if (API.updateRoom) await API.updateRoom(roomData.id, roomData);
                else await updateRoomLocal(roomData.id, roomData);
                Utils.showToast('Xona muvaffaqiyatli tahrirlandi', 'success');
            } else {
                if (API.createRoom) await API.createRoom(roomData);
                else await createRoomLocal(roomData);
                Utils.showToast('Yangi xona qo‘shildi', 'success');
            }
            closeModal();
            await loadRooms();
        } catch (err) {
            Utils.showToast('Xatolik: ' + err.message, 'error');
        }
    };

    document.getElementById('addRoomBtn').onclick = () => openModal();
    await loadRooms();
}

async function loadRooms() {
    const tbody = document.getElementById('roomsTableBody');
    try {
        let rooms = await API.getRooms();
        if (!rooms || rooms.length === 0) {
            // Agar API dan ma'lumot kelmasa, localStorage dan o‘qish
            rooms = getRoomsLocal();
        }
        if (!rooms || rooms.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Hech qanday xona topilmadi</td></tr>';
            return;
        }
        tbody.innerHTML = rooms.map(room => `
            <tr data-room-number="${room.number}">
                <td><strong>${room.number}</strong></td>
                <td>${room.floor}</td>
                <td>${room.type}</td>
                <td><span class="status-badge status-${room.status}">${room.status}</span></td>
                <td>${room.current_guest_name || '—'}</td>
                <td class="actions">
                    <button class="edit-room-btn btn-gold-small" data-number="${room.number}"><i class="fas fa-edit"></i> Tahrirlash</button>
                    <button class="delete-room-btn btn-outline-danger" data-number="${room.number}"><i class="fas fa-trash"></i> O‘chirish</button>
                </td>
            </tr>
        `).join('');

        // Tahrirlash tugmalari
        document.querySelectorAll('.edit-room-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const roomNumber = parseInt(btn.dataset.number, 10);
                let rooms = await API.getRooms();
                if (!rooms || rooms.length === 0) rooms = getRoomsLocal();
                const room = rooms.find(r => r.number === roomNumber);
                if (room) openEditModal(room);
            });
        });

        // O‘chirish tugmalari
        document.querySelectorAll('.delete-room-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Ushbu xonani o‘chirishni xohlaysizmi?')) {
                    const roomNumber = parseInt(btn.dataset.number, 10);
                    try {
                        if (API.deleteRoom) await API.deleteRoom(roomNumber);
                        else await deleteRoomLocal(roomNumber);
                        Utils.showToast('Xona o‘chirildi', 'success');
                        await loadRooms();
                    } catch (err) {
                        Utils.showToast('Xatolik: ' + err.message, 'error');
                    }
                }
            });
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Xatolik: ${err.message}</td></tr>`;
    }
}

function openEditModal(room) {
    const modal = document.getElementById('roomModal');
    document.getElementById('modalTitle').innerText = 'Xona tahrirlash';
    document.getElementById('roomId').value = room.number;
    document.getElementById('roomNumber').value = room.number;
    document.getElementById('roomFloor').value = room.floor;
    document.getElementById('roomType').value = room.type;
    document.getElementById('roomStatus').value = room.status;
    modal.style.display = 'flex';
}

// // -------------------- Local Storage (agar backend API bo‘lmasa) --------------------
// function getRoomsLocal() {
//     const stored = localStorage.getItem('hotel_rooms');
//     if (stored) return JSON.parse(stored);
//     // Default xonalar (sizning skrinshotdagi kabi)
//     const defaultRooms = [
//         { id: '1', number: 1, floor: 1, type: 'ikki kishilik', status: 'toza', current_guest_name: null },
//         { id: '2', number: 2, floor: 1, type: 'ikki kishilik', status: 'toza', current_guest_name: null },
//         { id: '3', number: 3, floor: 1, type: 'bir kishilik', status: 'toza', current_guest_name: null },
//         { id: '4', number: 4, floor: 1, type: 'ikki kishilik', status: 'toza', current_guest_name: null },
//         { id: '5', number: 5, floor: 1, type: 'ikki kishilik', status: 'toza', current_guest_name: null },
//         { id: '6', number: 6, floor: 2, type: 'bir kishilik', status: 'toza', current_guest_name: null },
//         { id: '7', number: 7, floor: 2, type: 'ikki kishilik', status: 'toza', current_guest_name: null },
//         { id: '8', number: 8, floor: 2, type: 'ikki kishilik', status: 'toza', current_guest_name: null },
//         { id: '9', number: 9, floor: 2, type: 'bir kishilik', status: 'toza', current_guest_name: null },
//         { id: '10',number:10, floor: 2, type: 'ikki kishilik', status: 'toza', current_guest_name: null }
//     ];
//     localStorage.setItem('hotel_rooms', JSON.stringify(defaultRooms));
//     return defaultRooms;
// }

// function saveRoomsLocal(rooms) {
//     localStorage.setItem('hotel_rooms', JSON.stringify(rooms));
// }

// async function createRoomLocal(roomData) {
//     const rooms = getRoomsLocal();
//     const newId = String(Date.now());
//     const newRoom = { ...roomData, id: newId, current_guest_name: null };
//     rooms.push(newRoom);
//     saveRoomsLocal(rooms);
// }

// async function updateRoomLocal(roomId, roomData) {
//     const rooms = getRoomsLocal();
//     const index = rooms.findIndex(r => r.id == roomId);
//     if (index !== -1) {
//         rooms[index] = { ...rooms[index], ...roomData, id: roomId };
//         saveRoomsLocal(rooms);
//     }
// }

// async function deleteRoomLocal(roomId) {
//     let rooms = getRoomsLocal();
//     rooms = rooms.filter(r => r.id != roomId);
//     saveRoomsLocal(rooms);
// }