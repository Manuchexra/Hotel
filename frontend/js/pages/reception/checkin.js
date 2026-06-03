// reception/checkin.js
export default function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <h2>Yangi mehmon joylashtirish</h2>
        <form id="checkinForm" class="checkin-form">
            <div class="form-row"><label>Ism:</label><input type="text" id="guestName" required></div>
            <div class="form-row"><label>Xona turi:</label>
                <select id="roomType"><option>bir kishilik</option><option>ikki kishilik</option><option>lyuks</option><option>nogiron</option></select>
            </div>
            <div class="form-row"><label>Afzal qavat:</label><input type="number" id="preferredFloor"></div>
            <div class="form-row"><label>Liftga yaqin:</label><input type="checkbox" id="nearLift"></div>
            <div class="form-row"><label>Kechalar soni:</label><input type="number" id="nights" value="1" min="1"></div>
            <div class="form-row"><label>Kunlik narx (so'm):</label><input type="number" id="price" value="100"></div>
            <button type="submit" class="btn-gold">Joylashtirish</button>
        </form>
        <div id="checkinResult"></div>
    `;
    document.getElementById('checkinForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            guest_name: document.getElementById('guestName').value,
            room_type: document.getElementById('roomType').value,
            preferred_floor: parseInt(document.getElementById('preferredFloor').value) || null,
            near_lift: document.getElementById('nearLift').checked,
            nights: parseInt(document.getElementById('nights').value),
            room_price_per_night: parseFloat(document.getElementById('price').value)
        };
        const result = await API.checkin(data);
        const resultDiv = document.getElementById('checkinResult');
        if (result.success) {
            const login    = result.login    || ('guest_' + result.room_number);
            const password = result.password || ('room'   + result.room_number);
            const guestUrl = 'http://' + window.location.hostname + ':3011/login.html';
            resultDiv.innerHTML = `
                <div class="success" style="padding:15px;margin-bottom:10px;">
                    ✅ ${result.guest_name || data.guest_name} xona ${result.room_number} ga joylashtirildi.
                </div>
                <div class="info-card" style="background:#f8f9fa;border:1px solid #ddd;padding:20px;border-radius:8px;margin-top:15px;">
                    <h4 style="margin-top:0;color:#333;">🔑 Mijoz uchun login ma'lumotlari</h4>
                    <table style="border-collapse:collapse;width:100%;">
                        <tr><td style="padding:6px 0;color:#555;width:140px;"><strong>Sayt:</strong></td>
                            <td><a href="${guestUrl}" target="_blank" style="color:#007bff;">${guestUrl}</a></td></tr>
                        <tr><td style="padding:6px 0;color:#555;"><strong>Login:</strong></td>
                            <td><code style="background:#e9ecef;padding:3px 8px;border-radius:4px;font-size:15px;">${login}</code></td></tr>
                        <tr><td style="padding:6px 0;color:#555;"><strong>Parol:</strong></td>
                            <td><code style="background:#e9ecef;padding:3px 8px;border-radius:4px;font-size:15px;">${password}</code></td></tr>
                        <tr><td style="padding:6px 0;color:#555;"><strong>Xona:</strong></td>
                            <td>${result.room_number} (${result.room_type || ''}, ${result.floor || ''}-qavat)</td></tr>
                        <tr><td style="padding:6px 0;color:#555;"><strong>Mehmon:</strong></td>
                            <td>${result.guest_name || data.guest_name}</td></tr>
                    </table>
                    <button type="button" class="btn-gold" style="margin-top:12px;"
                        onclick="window.open('${guestUrl}','_blank')">
                        Mijoz portalini ochish
                    </button>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `<div class="error">❌ ${result.message}</div>`;
        }
    });
}
