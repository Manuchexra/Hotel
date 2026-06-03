// reception/guests.js
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `<h2>Joriy mehmonlar</h2><div id="guestsList" class="skeleton"></div>`;
    await loadGuests();
    window.addEventListener('ws-message', (e) => {
        if (e.detail.channel === 'guest.checked_in' || e.detail.channel === 'guest.checked_out') loadGuests();
    });
}
async function loadGuests() {
    const guests = await API.getGuests();
    const container = document.getElementById('guestsList');
    if (!container) return;
    if (!guests || guests.length === 0) {
        container.innerHTML = "<p>Hozircha mehmonlar yo'q</p>";
        return;
    }
    container.innerHTML = `<table class="data-table"><thead><tr><th>Ism</th><th>Xona</th><th>Kechalar</th><th>Amal</th></tr></thead><tbody>
        ${guests.map(g => `<tr><td>${g.name}</td><td>${g.room_id || '-'}</td><td>${g.nights}</td>
        <td><button class="btn-small" onclick="window.openBillingForGuest('${g.id}')">Check-out</button></td></tr>`).join('')}
    </tbody></table>`;
    window.openBillingForGuest = (guestId) => {
        window.location.hash = `/reception/billing?guestId=${encodeURIComponent(guestId)}`;
    };
}
