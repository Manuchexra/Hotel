// admin/settings.js
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="settings-header">
            <h2><i class="fas fa-cog"></i> Tizim sozlamalari</h2>
            <button id="saveSettingsBtn" class="btn-gold"><i class="fas fa-save"></i> Saqlash</button>
        </div>
        <div class="settings-grid">
            <div class="settings-card">
                <h3><i class="fas fa-door-open"></i> Xona narxlari (so'm/kun)</h3>
                <div class="form-group"><label>Bir kishilik:</label><input type="number" id="price_single" value="100000" step="10000"></div>
                <div class="form-group"><label>Ikki kishilik:</label><input type="number" id="price_double" value="150000" step="10000"></div>
                <div class="form-group"><label>Lyuks:</label><input type="number" id="price_suite" value="250000" step="10000"></div>
                <div class="form-group"><label>Nogironlar uchun:</label><input type="number" id="price_accessible" value="120000" step="10000"></div>
            </div>
            <div class="settings-card">
                <h3><i class="fas fa-percent"></i> Chegirma va to'lovlar</h3>
                <div class="form-group"><label>Kech chiqish to'lovi (so'm):</label><input type="number" id="late_checkout_fee" value="50000" step="5000"></div>
                <div class="form-group"><label>Maksimal chegirma (%):</label><input type="number" id="max_discount" value="30" min="0" max="100"></div>
                <div class="form-group"><label>Erta check-in to'lovi (so'm):</label><input type="number" id="early_checkin_fee" value="30000" step="5000"></div>
            </div>
            <div class="settings-card">
                <h3><i class="fas fa-users"></i> Rol huquqlari (RBAC)</h3>
                <div class="form-group"><label>Receptionist check-in:</label><select id="rec_checkin"><option value="yes">✅ Ha</option><option value="no">❌ Yo'q</option></select></div>
                <div class="form-group"><label>Housekeeping tozalash:</label><select id="hk_clean"><option value="yes">✅ Ha</option><option value="no">❌ Yo'q</option></select></div>
                <div class="form-group"><label>RoomService buyurtma:</label><select id="rs_order"><option value="yes">✅ Ha</option><option value="no">❌ Yo'q</option></select></div>
                <div class="form-group"><label>Maintenance muammo:</label><select id="mtc_issue"><option value="yes">✅ Ha</option><option value="no">❌ Yo'q</option></select></div>
            </div>
            <div class="settings-card">
                <h3><i class="fas fa-globe"></i> Umumiy sozlamalar</h3>
                <div class="form-group"><label>Tizim tili:</label><select id="language"><option value="uz">🇺🇿 O'zbek</option><option value="ru">🇷🇺 Русский</option><option value="en">🇬🇧 English</option></select></div>
                <div class="form-group"><label>Valyuta:</label><select id="currency"><option value="UZS">So'm (UZS)</option><option value="USD">$ USD</option></select></div>
                <div class="form-group"><label>WebSocket real vaqt:</label><select id="websocket_enabled"><option value="yes">✅ Yoqilgan</option><option value="no">❌ O'chirilgan</option></select></div>
                <div class="form-group"><label>Yangilanish oralig'i (daqiqa):</label><input type="number" id="refresh_interval" value="5" min="1" max="60"></div>
            </div>
        </div>
    `;

    loadSettings();
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
        saveSettings();
        Utils.showToast("Sozlamalar muvaffaqiyatli saqlandi!", "success");
        // Agar WebSocket sozlamasi o'zgartirilgan bo'lsa, amalda qo'llash
        applyWebSocketSetting();
    });
}

function loadSettings() {
    const saved = localStorage.getItem('hotel_system_settings');
    if (saved) {
        const s = JSON.parse(saved);
        document.getElementById('price_single').value = s.price_single || 100000;
        document.getElementById('price_double').value = s.price_double || 150000;
        document.getElementById('price_suite').value = s.price_suite || 250000;
        document.getElementById('price_accessible').value = s.price_accessible || 120000;
        document.getElementById('late_checkout_fee').value = s.late_checkout_fee || 50000;
        document.getElementById('max_discount').value = s.max_discount || 30;
        document.getElementById('early_checkin_fee').value = s.early_checkin_fee || 30000;
        if (s.rec_checkin) document.getElementById('rec_checkin').value = s.rec_checkin;
        if (s.hk_clean) document.getElementById('hk_clean').value = s.hk_clean;
        if (s.rs_order) document.getElementById('rs_order').value = s.rs_order;
        if (s.mtc_issue) document.getElementById('mtc_issue').value = s.mtc_issue;
        document.getElementById('language').value = s.language || 'uz';
        document.getElementById('currency').value = s.currency || 'UZS';
        document.getElementById('websocket_enabled').value = s.websocket_enabled || 'yes';
        document.getElementById('refresh_interval').value = s.refresh_interval || 5;
    }
}

function saveSettings() {
    const settings = {
        price_single: parseInt(document.getElementById('price_single').value),
        price_double: parseInt(document.getElementById('price_double').value),
        price_suite: parseInt(document.getElementById('price_suite').value),
        price_accessible: parseInt(document.getElementById('price_accessible').value),
        late_checkout_fee: parseInt(document.getElementById('late_checkout_fee').value),
        max_discount: parseInt(document.getElementById('max_discount').value),
        early_checkin_fee: parseInt(document.getElementById('early_checkin_fee').value),
        rec_checkin: document.getElementById('rec_checkin').value,
        hk_clean: document.getElementById('hk_clean').value,
        rs_order: document.getElementById('rs_order').value,
        mtc_issue: document.getElementById('mtc_issue').value,
        language: document.getElementById('language').value,
        currency: document.getElementById('currency').value,
        websocket_enabled: document.getElementById('websocket_enabled').value,
        refresh_interval: parseInt(document.getElementById('refresh_interval').value)
    };
    localStorage.setItem('hotel_system_settings', JSON.stringify(settings));
    // Agar backend API mavjud bo'lsa, so'rov yuborish mumkin
    if (API.updateSettings) API.updateSettings(settings);
}

function applyWebSocketSetting() {
    const wsEnabled = document.getElementById('websocket_enabled').value === 'yes';
    if (!wsEnabled && window.ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
        console.log("WebSocket o‘chirildi (sozlamalar bo‘yicha)");
    } else if (wsEnabled && (!window.ws || ws.readyState !== WebSocket.OPEN)) {
        if (Auth.token) connectWebSocket(Auth.token);
    }
}