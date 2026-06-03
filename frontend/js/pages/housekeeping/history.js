// housekeeping/history.js
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="history-page">
            <h2><i class="fas fa-history"></i> Tozalash tarixi</h2>
            <div class="history-filters">
                <input type="text" id="searchHistory" placeholder="🔍 Xona raqami bo‘yicha..." class="search-input">
                <input type="date" id="filterDate" class="filter-date">
                <button id="refreshHistory" class="btn-gold"><i class="fas fa-sync-alt"></i> Yangilash</button>
            </div>
            <div id="historyList" class="history-list-wrapper">Yuklanmoqda...</div>
        </div>
    `;

    let allHistory = [];
    await loadHistory();

    document.getElementById('refreshHistory').addEventListener('click', loadHistory);
    document.getElementById('searchHistory').addEventListener('input', filterAndRender);
    document.getElementById('filterDate').addEventListener('change', filterAndRender);

    async function loadHistory() {
        const container = document.getElementById('historyList');
        container.innerHTML = '<div class="loader-container">Yuklanmoqda...</div>';
        try {
            // Backend API: GET /housekeeping/history
            // Kutilayotgan format: [{ id, room_id, cleaned_by, started_at, finished_at, duration_minutes }]
            const history = await API.request('housekeeping', '/housekeeping/history');
            if (!history || history.length === 0) {
                container.innerHTML = '<p class="no-data">Hech qanday tozalash tarixi topilmadi</p>';
                return;
            }
            allHistory = history;
            filterAndRender();
        } catch (err) {
            container.innerHTML = `<p class="error">Xatolik: ${err.message}. Agar backendda API mavjud bo‘lmasa, iltimos, /housekeeping/history endpointini qo‘shing.</p>`;
        }
    }

    function filterAndRender() {
        const searchTerm = document.getElementById('searchHistory').value.toLowerCase();
        const filterDate = document.getElementById('filterDate').value;
        let filtered = allHistory.filter(record => {
            const matchRoom = record.room_id.toString().includes(searchTerm);
            let matchDate = true;
            if (filterDate) {
                const recordDate = new Date(record.finished_at).toISOString().slice(0,10);
                matchDate = recordDate === filterDate;
            }
            return matchRoom && matchDate;
        });
        renderTable(filtered);
    }

    function renderTable(records) {
        const container = document.getElementById('historyList');
        if (records.length === 0) {
            container.innerHTML = '<p class="no-data">Hech qanday yozuv topilmadi</p>';
            return;
        }
        container.innerHTML = `
            <table class="data-table history-table">
                <thead>
                    <tr><th>Xona №</th><th>Tozalagan xodim</th><th>Boshlangan vaqt</th><th>Tugagan vaqt</th><th>Davomiyligi (daq)</th></tr>
                </thead>
                <tbody>
                    ${records.map(record => `
                        <tr>
                            <td>${record.room_id}</td>
                            <td>${record.cleaned_by || '—'}</td>
                            <td>${new Date(record.started_at).toLocaleString()}</td>
                            <td>${new Date(record.finished_at).toLocaleString()}</td>
                            <td>${record.duration_minutes ?? '—'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
}