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
        // Shaxsiy xabar (staff.message)
        if (data && data.channel === 'staff.message' && data.data) {
            const currentUser = localStorage.getItem('hotel_user');
            if (currentUser && data.data.to === currentUser) {
                const stored = localStorage.getItem('hotel_notifications');
                const notifications = stored ? JSON.parse(stored) : [];
                const msg = data.data;
                const timestamp = msg.timestamp || new Date().toISOString();
                const newNotif = {
                    id: Date.now(),
                    channel: 'staff.message',
                    message: (msg.fromName || msg.from) + ': ' + msg.text,
                    timestamp,
                    read: false
                };
                notifications.push(newNotif);
                if (notifications.length > 100) notifications.shift();
                localStorage.setItem('hotel_notifications', JSON.stringify(notifications));
                Utils.showToast('Yangi xabar: ' + newNotif.message, 'info');
            }
        }

        // Rol asosidagi bildirishnoma — checkout -> housekeeping, va boshqa voqealar
        if (data && data.channel === 'staff.notification' && data.data) {
            const notif = data.data;
            const stored = localStorage.getItem('hotel_notifications');
            const notifications = stored ? JSON.parse(stored) : [];
            const newNotif = {
                id: Date.now(),
                channel: 'staff.notification',
                title: notif.title || 'Bildirishnoma',
                message: notif.message || '',
                room_id: notif.room_id,
                level: notif.level || 'info',
                timestamp: new Date().toISOString(),
                read: false
            };
            notifications.push(newNotif);
            if (notifications.length > 100) notifications.shift();
            localStorage.setItem('hotel_notifications', JSON.stringify(notifications));

            const toastType = notif.level === 'warning' ? 'warning' : 'info';
            Utils.showToast('[!] ' + newNotif.title + ': ' + newNotif.message, toastType);
            _updateNotificationBadge(notifications.filter(function(n){ return !n.read; }).length);
        }

        // Xona muammosi bildirishnomalari (maintenance xodimlari uchun)
        if (data && (data.channel === 'issue.created' || data.channel === 'issue.assigned') && data.data) {
            const notif = data.data;
            const stored = localStorage.getItem('hotel_notifications');
            const notifications = stored ? JSON.parse(stored) : [];
            const newNotif = {
                id: Date.now(),
                channel: data.channel,
                title: notif.title || (data.channel === 'issue.created' ? '🔧 Yangi Muammo' : '👤 Muammo Tayinlandi'),
                message: notif.message || '',
                room_id: notif.room_id,
                level: notif.level || 'info',
                timestamp: new Date().toISOString(),
                read: false
            };
            notifications.push(newNotif);
            if (notifications.length > 100) notifications.shift();
            localStorage.setItem('hotel_notifications', JSON.stringify(notifications));

            const toastType = notif.level === 'warning' ? 'warning' : 'info';
            Utils.showToast(newNotif.title + ': ' + newNotif.message, toastType);
            _updateNotificationBadge(notifications.filter(function(n){ return !n.read; }).length);
        }
    } catch (e) {}

    // Xabarlarni tegishli page moduliga yuborish (ws-message event)
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
