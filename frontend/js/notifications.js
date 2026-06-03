// notifications.js
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="notifications-header">
            <h2><i class="fas fa-bell"></i> Bildirishnomalar</h2>
            <button id="clearSystemBtn" class="btn-outline"><i class="fas fa-trash-alt"></i> Tizim hodisalarini tozalash</button>
        </div>
        <div id="notificationsList" class="notifications-list">Yuklanmoqda...</div>
    `;

    await loadAll();

    document.getElementById('clearSystemBtn').addEventListener('click', () => {
        if (confirm('Barcha tizim hodisalarini o‘chirmoqchimisiz? (Xabarlar o‘chmaydi)')) {
            localStorage.removeItem('hotel_system_notifications');
            loadAll();
            Utils.showToast('Tizim hodisalari o‘chirildi', 'success');
        }
    });

    window.addEventListener('ws-message', (e) => {
        const data = e.detail;
        if (data.channel === 'staff.message') {
            // Yangi xabar keldi – qayta yuklash
            loadAll();
            Utils.showToast(`Yangi xabar: ${data.data?.fromName || 'Admin'} → sizga`, 'info');
        } else if (data.channel) {
            // Tizim hodisasi
            addSystemNotification(data.channel, data.data);
            loadAll();
        }
    });
}

async function loadAll() {
    const container = document.getElementById('notificationsList');
    try {
        // 1. Shaxsiy xabarlarni backenddan olish (faqat o‘zimga kelganlar)
        const myMessages = await API.getMyMessages();
        const messages = myMessages.messages || [];
        
        // 2. Tizim hodisalarini localStorage dan olish
        const systemNotifs = getSystemNotifications();
        
        // 3. Birlashtirish
        let allItems = [
            ...messages.map(msg => ({
                id: `msg_${msg.id}`,
                type: 'message',
                channel: 'staff.message',
                title: '✉️ Xabar',
                message: `${msg.fromName || msg.from}: ${msg.text}`,
                timestamp: msg.timestamp,
                read: msg.read,
                rawId: msg.id
            })),
            ...systemNotifs
        ];
        allItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        if (allItems.length === 0) {
            container.innerHTML = '<div class="empty-notifications">📭 Hozircha bildirishnomalar yo‘q</div>';
            return;
        }
        
        container.innerHTML = allItems.map(item => `
            <div class="notification-item ${item.read ? 'read' : 'unread'}" data-id="${item.id}">
                <div class="notification-icon"><i class="fas ${getIconForChannel(item.channel)}"></i></div>
                <div class="notification-content">
                    <div class="notification-title">${item.title}</div>
                    <div class="notification-message">${escapeHtml(item.message)}</div>
                    <div class="notification-time">${formatTime(item.timestamp)}</div>
                </div>
                <div class="notification-actions">
                    ${(!item.read && item.type === 'message') ? `<button class="mark-read-btn" data-id="${item.rawId}">✓ O‘qildi</button>` : ''}
                    ${(item.type === 'system') ? `<button class="delete-notif-btn" data-id="${item.id}"><i class="fas fa-times"></i></button>` : ''}
                </div>
            </div>
        `).join('');
        
        // Xabarlarni o‘qilgan deb belgilash
        document.querySelectorAll('.mark-read-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const msgId = parseInt(btn.dataset.id);
                await API.markMessageRead(msgId);
                await loadAll();
            });
        });
        // Tizim hodisalarini o‘chirish
        document.querySelectorAll('.delete-notif-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const notifId = btn.closest('.notification-item').dataset.id;
                deleteSystemNotification(notifId);
                loadAll();
            });
        });
    } catch (err) {
        container.innerHTML = `<p class="error">Xatolik: ${err.message}</p>`;
    }
}

// ==================== TIZIM HODISALARI (localStorage) ====================
function getSystemNotifications() {
    const stored = localStorage.getItem('hotel_system_notifications');
    return stored ? JSON.parse(stored) : [];
}

function saveSystemNotifications(notifs) {
    localStorage.setItem('hotel_system_notifications', JSON.stringify(notifs));
}

function addSystemNotification(channel, data) {
    const notifs = getSystemNotifications();
    const newNotif = {
        id: `sys_${Date.now()}_${Math.random()}`,
        type: 'system',
        channel: channel,
        title: getTitleForChannel(channel),
        message: formatSystemMessage(channel, data),
        timestamp: new Date().toISOString(),
        read: false
    };
    notifs.push(newNotif);
    if (notifs.length > 200) notifs.shift();
    saveSystemNotifications(notifs);
    if (document.getElementById('notificationsList')) setTimeout(() => loadAll(), 100);
}

function deleteSystemNotification(id) {
    let notifs = getSystemNotifications();
    notifs = notifs.filter(n => n.id !== id);
    saveSystemNotifications(notifs);
}

function formatSystemMessage(channel, data) {
    switch (channel) {
        case 'room.status.update': return `${data.room_id}-xona holati "${data.status}" ga o‘zgartirildi`;
        case 'order.status.updated': return `${data.order_id} buyurtma holati "${data.status}"`;
        case 'issue.created': return `${data.room_id}-xonada muammo: ${data.description} (${data.priority})`;
        case 'issue.assigned': return `${data.room_id}-xonadagi muammo ${data.technician || ''} ga tayinlandi`;
        case 'issue.resolved': return `${data.room_id}-xonadagi muammo hal qilindi`;
        case 'cleaning.queue.updated': return `Tozalash navbati yangilandi (${data.queue?.length || 0} ta xona)`;
        case 'guest.checked_in': return `Yangi mehmon ${data.guest_name} (xona ${data.room_id}) joylashtirildi`;
        case 'guest.checked_out': return `Mehmon ${data.guest_name} chiqarildi (xona ${data.room_id})`;
        case 'billing.bill_updated': return `Hisob yangilandi: ${data.guest_id} uchun yangi summa ${data.new_total}`;
        default: return JSON.stringify(data);
    }
}

function getTitleForChannel(channel) {
    const titles = {
        'staff.message': '✉️ Xabar',
        'room.status.update': '🚪 Xona holati',
        'order.status.updated': '🍽️ Buyurtma',
        'issue.created': '🔧 Yangi Muammo',
        'issue.assigned': '👤 Muammo Tayinlandi',
        'issue.resolved': '✅ Muammo Hal Qilindi',
        'cleaning.queue.updated': '🧹 Tozalash navbati',
        'guest.checked_in': '🏨 Check-in',
        'guest.checked_out': '🚪 Check-out',
        'billing.bill_updated': '💰 Hisob-kitob'
    };
    return titles[channel] || '📢 Bildirishnoma';
}

function getIconForChannel(channel) {
    const icons = {
        'staff.message': 'fa-envelope',
        'room.status.update': 'fa-door-open',
        'order.status.updated': 'fa-utensils',
        'issue.created': 'fa-exclamation-triangle',
        'issue.assigned': 'fa-user-check',
        'issue.resolved': 'fa-check-circle',
        'cleaning.queue.updated': 'fa-broom',
        'guest.checked_in': 'fa-sign-in-alt',
        'guest.checked_out': 'fa-sign-out-alt',
        'billing.bill_updated': 'fa-receipt'
    };
    return icons[channel] || 'fa-bell';
}

function formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'hoziroq';
    if (diffMins < 60) return `${diffMins} daqiqa oldin`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} soat oldin`;
    return date.toLocaleDateString();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}