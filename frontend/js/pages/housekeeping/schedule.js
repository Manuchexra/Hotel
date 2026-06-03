// housekeeping/schedule.js
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="schedule-page">
            <h2><i class="fas fa-calendar-alt"></i> Tozalash jadvali</h2>
            <div class="schedule-filters">
                <input type="date" id="scheduleDate" class="filter-date">
                <button id="refreshSchedule" class="btn-gold"><i class="fas fa-sync-alt"></i> Yangilash</button>
            </div>
            <div id="scheduleList" class="schedule-list-wrapper">Yuklanmoqda...</div>
        </div>
    `;

    let scheduleData = [];
    const today = new Date().toISOString().slice(0,10);
    document.getElementById('scheduleDate').value = today;

    await loadSchedule();

    document.getElementById('refreshSchedule').addEventListener('click', loadSchedule);
    document.getElementById('scheduleDate').addEventListener('change', () => renderSchedule());

    async function loadSchedule() {
        const container = document.getElementById('scheduleList');
        container.innerHTML = '<div class="loader-container">Yuklanmoqda...</div>';
        try {
            // Backend API: GET /housekeeping/schedule
            // Kutilayotgan format: [{ id, room_id, scheduled_date, shift, priority, status, assigned_to }]
            const schedule = await API.request('housekeeping', '/housekeeping/schedule');
            if (!schedule || schedule.length === 0) {
                container.innerHTML = '<p class="no-data">Hech qanday tozalash jadvali topilmadi</p>';
                return;
            }
            scheduleData = schedule;
            renderSchedule();
        } catch (err) {
            container.innerHTML = `<p class="error">Xatolik: ${err.message}. Agar backendda API mavjud bo‘lmasa, iltimos, /housekeeping/schedule endpointini qo‘shing.</p>`;
        }
    }

    function renderSchedule() {
        const selectedDate = document.getElementById('scheduleDate').value;
        const filtered = scheduleData.filter(item => item.scheduled_date === selectedDate);
        const container = document.getElementById('scheduleList');
        if (filtered.length === 0) {
            container.innerHTML = '<p class="no-data">${selectedDate} sanasiga hech qanday rejalashtirilgan tozalash yo‘q</p>';
            return;
        }
        container.innerHTML = `
            <table class="data-table schedule-table">
                <thead>
                    <tr><th>Xona №</th><th>Smena</th><th>Ustuvorlik</th><th>Holat</th><th>Mas’ul xodim</th></tr>
                </thead>
                <tbody>
                    ${filtered.map(item => `
                        <tr>
                            <td>${item.room_id}</td>
                            <td>${item.shift || 'Kunduzgi'}</td>
                            <td><span class="priority-${item.priority?.toLowerCase()}">${item.priority || 'Oddiy'}</span></td>
                            <td>${item.status === 'completed' ? '✅ Bajarilgan' : (item.status === 'in_progress' ? '🔄 Jarayonda' : '⏳ Kutilmoqda')}</td>
                            <td>${item.assigned_to || '—'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
}