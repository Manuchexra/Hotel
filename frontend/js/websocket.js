// websocket.js
let ws = null;
let reconnectAttempts = 0;
const maxReconnect = 5;

function connectWebSocket(token) {
    const wsUrl = 'ws://localhost:8000/ws/panel?token=' + token;
    ws = new WebSocket(wsUrl);
    window.ws = ws;
    ws.onopen = () => {
        console.log('WebSocket ulandi');
        reconnectAttempts = 0;
    };
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        } catch(e) { console.error(e); }
    };
    ws.onclose = () => {
        console.log('WebSocket uzildi');
        if (reconnectAttempts < maxReconnect && Auth.isAuthenticated()) {
            setTimeout(() => connectWebSocket(Auth.token), 3000);
            reconnectAttempts++;
        }
    };
    ws.onerror = (err) => console.error('WebSocket error', err);
}

function handleWebSocketMessage(data) {
    try {
        // Toast ko'rsatish va badge yangilash
        if (data && data.data) {
            const notif = data.data;
            const level = notif.level || 'info';
            const toastType = level === 'warning' ? 'warning' : 'info';

            if (data.channel === 'staff.message') {
                Utils.showToast('📩 ' + (notif.title || 'Yangi xabar'), 'info');
            } else if (data.channel === 'staff.broadcast') {
                Utils.showToast('📢 ' + (notif.title || 'Bildirishnoma') + ': ' + (notif.message || ''), notif.level || 'info');
            } else if (data.channel === 'staff.notification') {
                Utils.showToast('[!] ' + (notif.title || 'Bildirishnoma') + ': ' + (notif.message || ''), toastType);
            } else if (data.channel === 'issue.created' || data.channel === 'issue.assigned') {
                const title = notif.title || (data.channel === 'issue.created' ? '🔧 Yangi Muammo' : '👤 Muammo Tayinlandi');
                Utils.showToast(title + ': ' + (notif.message || ''), toastType);
            }
        }

        // Badge yangilash — hotel_system_notifications kalit bilan o'qish
        const stored = localStorage.getItem('hotel_system_notifications');
        const sysNotifs = stored ? JSON.parse(stored) : [];
        _updateNotificationBadge(sysNotifs.filter(function(n){ return !n.read; }).length);

    } catch (e) {}

    // Barcha sahifalar va notifications.js uchun ws-message event yuborish
    // notifications.js bu eventni tutib hotel_system_notifications ga saqlaydi
    const event = new CustomEvent('ws-message', { detail: data });
    window.dispatchEvent(event);
}

function _updateNotificationBadge(count) {
    const badge = document.querySelector('.notification-badge, #notifBadge, .notif-count');
    if (badge) {
        badge.textContent = count > 0 ? count : '';
        badge.style.display = count > 0 ? 'block' : 'none';
    }
}

window.closeWebSocket = () => {
    if (ws) ws.close();
};