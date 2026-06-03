// housekeeping/stats.js
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="stats-page">
            <h2><i class="fas fa-chart-bar"></i> Tozalash statistikasi</h2>
            <div class="stats-filters">
                <select id="statsPeriod" class="filter-select">
                    <option value="day">Kunlik</option>
                    <option value="week">Haftalik</option>
                    <option value="month">Oylik</option>
                </select>
                <button id="refreshStats" class="btn-gold"><i class="fas fa-sync-alt"></i> Yangilash</button>
            </div>
            <div id="statsContent" class="stats-content">Yuklanmoqda...</div>
        </div>
    `;

    await loadStats('day');

    document.getElementById('refreshStats').addEventListener('click', () => {
        const period = document.getElementById('statsPeriod').value;
        loadStats(period);
    });
    document.getElementById('statsPeriod').addEventListener('change', () => {
        const period = document.getElementById('statsPeriod').value;
        loadStats(period);
    });

    async function loadStats(period) {
        const container = document.getElementById('statsContent');
        container.innerHTML = '<div class="loader-container">Yuklanmoqda...</div>';
        try {
            // Backend API: GET /housekeeping/stats?period=day/week/month
            const stats = await API.request('housekeeping', `/housekeeping/stats?period=${period}`);
            if (!stats) {
                container.innerHTML = '<p class="no-data">Statistik maʼlumotlar topilmadi</p>';
                return;
            }
            renderStats(stats, period);
        } catch (err) {
            container.innerHTML = `<p class="error">Xatolik: ${err.message}. Agar backendda API mavjud bo‘lmasa, iltimos, /housekeeping/stats endpointini qo‘shing.</p>`;
        }
    }

    function renderStats(stats, period) {
        const container = document.getElementById('statsContent');
        if (!stats) return;
        // stats kutilyapdi: { total_rooms_cleaned, average_time_per_room, most_cleaned_day, chart_data, ... }
        container.innerHTML = `
            <div class="stats-cards">
                <div class="stat-card"><i class="fas fa-broom"></i><div><h3>Tozalangan xonalar</h3><p>${stats.total_rooms_cleaned ?? 0}</p></div></div>
                <div class="stat-card"><i class="fas fa-clock"></i><div><h3>O‘rtacha vaqt (daq)</h3><p>${stats.average_time_per_room ?? 0}</p></div></div>
                <div class="stat-card"><i class="fas fa-trophy"></i><div><h3>Eng ko‘p tozalangan kun</h3><p>${stats.most_cleaned_day ?? '—'}</p></div></div>
            </div>
            <div class="stats-chart">
                <canvas id="statsChart"></canvas>
            </div>
        `;
        // Agar chart.js mavjud bo‘lsa, grafik chizish
        if (stats.chart_data && typeof Chart !== 'undefined') {
            const ctx = document.getElementById('statsChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: stats.chart_data.labels,
                    datasets: [{
                        label: `Tozalangan xonalar (${period === 'day' ? 'kunlik' : period === 'week' ? 'haftalik' : 'oylik'})`,
                        data: stats.chart_data.values,
                        backgroundColor: 'var(--gold)',
                        borderColor: 'var(--gold-dark)',
                        borderWidth: 1
                    }]
                },
                options: { responsive: true, scales: { y: { beginAtZero: true } } }
            });
        } else if (stats.chart_data) {
            // Chart.js yuklanmagan bo'lsa, oddiy jadval ko‘rsatish
            container.innerHTML += `<table class="data-table"><thead><tr><th>Davr</th><th>Soni</th></tr></thead><tbody>
                ${stats.chart_data.labels.map((label, i) => `<tr><td>${label}</td><td>${stats.chart_data.values[i]}</td></tr>`).join('')}
            </tbody></table>`;
        }
    }
}