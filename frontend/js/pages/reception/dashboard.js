// reception/dashboard.js
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="reception-header">
            <h2>Xonalar holati</h2>
            <div class="quick-actions">
                <button id="quickCheckinBtn" class="btn-gold">+ Tezkor check-in</button>
            </div>
        </div>
        <div class="rooms-grid" id="roomsGrid"></div>
    `;
    await loadRoomsGrid();
    document.getElementById('quickCheckinBtn').addEventListener('click', () => window.location.hash = '/reception/checkin');
    window.addEventListener('ws-message', handleRoomUpdate);
}

async function loadRoomsGrid() {
    const rooms = await API.getRooms();
    const grid = document.getElementById('roomsGrid');
    grid.innerHTML = rooms.map(room => `
        <div class="room-card ${room.status}">
            <div class="room-number">Xona ${room.number}</div>
            <div class="room-type">${room.type}</div>
            <div class="room-status">${room.status}</div>
            ${room.current_guest_name ? `<div class="room-guest">${room.current_guest_name}</div>` : ''}
        </div>
    `).join('');
}

function handleRoomUpdate(e) {
    const data = e.detail;
    if (data.channel === 'room.status.update') {
        loadRoomsGrid();
    }
}