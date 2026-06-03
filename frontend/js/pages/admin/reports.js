// admin/reports.js
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="reports-container">
            <h2>📊 Hisobotlar</h2>
            <div class="report-filters">
                <label>📅 Davr:</label>
                <select id="periodSelect">
                    <option value="7">So‘nggi 7 kun</option>
                    <option value="30">So‘nggi 30 kun</option>
                    <option value="custom">Maxsus sana</option>
                </select>
                <div id="customDateRange" style="display:none;">
                    <input type="date" id="startDate"> – <input type="date" id="endDate">
                    <button id="applyCustomBtn" class="btn-gold">Qo‘llash</button>
                </div>
                <button id="exportBtn" class="btn-gold">📎 CSV eksport</button>
            </div>
            <div class="stats-cards" id="statsCards">
                <div class="stat-card skeleton">Yuklanmoqda...</div>
                <div class="stat-card skeleton">Yuklanmoqda...</div>
                <div class="stat-card skeleton">Yuklanmoqda...</div>
                <div class="stat-card skeleton">Yuklanmoqda...</div>
            </div>
            <div class="charts-row">
                <div class="chart-card"><canvas id="occupancyChart"></canvas></div>
                <div class="chart-card"><canvas id="issuesChart"></canvas></div>
            </div>
            <div class="charts-row">
                <div class="chart-card"><canvas id="ordersChart"></canvas></div>
                <div class="chart-card" id="revenueInfo"><h3>💰 Taxminiy daromad</h3><p id="revenueAmount">-</p></div>
            </div>
            <div id="reportTable" class="report-table-wrapper"></div>
        </div>
    `;

    // Load Chart.js (if not already)
    if (typeof Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        script.onload = () => loadReportData();
        document.head.appendChild(script);
    } else {
        loadReportData();
    }

    // Event listeners
    document.getElementById('periodSelect').addEventListener('change', (e) => {
        const customDiv = document.getElementById('customDateRange');
        customDiv.style.display = e.target.value === 'custom' ? 'flex' : 'none';
        if (e.target.value !== 'custom') loadReportData();
    });
    document.getElementById('applyCustomBtn')?.addEventListener('click', () => loadReportData(true));
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
}

let charts = {};

async function loadReportData(isCustom = false) {
    // Show skeleton
    document.getElementById('statsCards').innerHTML = `
        <div class="stat-card skeleton">⏳</div><div class="stat-card skeleton">⏳</div>
        <div class="stat-card skeleton">⏳</div><div class="stat-card skeleton">⏳</div>
    `;
    // Fetch all required data
    const [rooms, orders, issues] = await Promise.all([
        API.getRooms(),
        API.getOrders(),
        API.getIssues()
    ]);
    // Occupancy
    const totalRooms = rooms.length;
    const occupied = rooms.filter(r => r.status === 'band').length;
    const occupancyRate = totalRooms ? ((occupied / totalRooms) * 100).toFixed(1) : 0;
    // Orders summary
    const ordersList = orders.orders || [];
    const totalOrders = ordersList.length;
    const deliveredOrders = ordersList.filter(o => o.status === 'Yetkazildi').length;
    // Issues
    const issuesList = issues.issues || [];
    const resolvedIssues = issuesList.filter(i => i.status === 'hal qilingan').length;
    // Approx revenue (from orders)
    const totalRevenue = ordersList.reduce((sum, o) => sum + (o.total_price || 0), 0);
    // Update stats cards
    document.getElementById('statsCards').innerHTML = `
        <div class="stat-card"><i class="fas fa-door-open"></i><div><h3>Bandlik</h3><p>${occupancyRate}% (${occupied}/${totalRooms})</p></div></div>
        <div class="stat-card"><i class="fas fa-receipt"></i><div><h3>Buyurtmalar</h3><p>${totalOrders} (yetkazilgan: ${deliveredOrders})</p></div></div>
        <div class="stat-card"><i class="fas fa-wrench"></i><div><h3>Muammolar</h3><p>Hal qilingan: ${resolvedIssues}</p></div></div>
        <div class="stat-card"><i class="fas fa-chart-line"></i><div><h3>Taxminiy daromad</h3><p>${totalRevenue} so‘m</p></div></div>
    `;
    document.getElementById('revenueAmount').innerHTML = `${totalRevenue} so‘m`;

    // Charts
    // Occupancy chart (room status distribution)
    const statusCounts = { band: 0, toza: 0, iflos: 0, tozalanmoqda: 0, texnik_xizmat: 0 };
    rooms.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });
    const occCtx = document.getElementById('occupancyChart').getContext('2d');
    if (charts.occupancy) charts.occupancy.destroy();
    charts.occupancy = new Chart(occCtx, {
        type: 'doughnut',
        data: { labels: ['Band', 'Toza', 'Iflos', 'Tozalanmoqda', 'Texnik xizmat'],
                datasets: [{ data: [statusCounts.band, statusCounts.toza, statusCounts.iflos, statusCounts.tozalanmoqda, statusCounts.texnik_xizmat],
                            backgroundColor: ['#ef4444', '#10b981', '#f59e0b', '#3b82f6', '#6b7280'] }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
    // Issues by priority
    const priorityCount = { Kritik:0, Yuqori:0, Normal:0, Past:0 };
    issuesList.forEach(i => { priorityCount[i.priority] = (priorityCount[i.priority] || 0) + 1; });
    const issCtx = document.getElementById('issuesChart').getContext('2d');
    if (charts.issues) charts.issues.destroy();
    charts.issues = new Chart(issCtx, {
        type: 'bar',
        data: { labels: ['Kritik', 'Yuqori', 'Normal', 'Past'],
                datasets: [{ label: 'Muammolar soni', data: [priorityCount.Kritik, priorityCount.Yuqori, priorityCount.Normal, priorityCount.Past],
                            backgroundColor: '#d4af37' }] },
        options: { responsive: true }
    });
    // Orders by status
    const orderStatusCount = { 'Qabul qilindi':0, 'Tayyorlanmoqda':0, 'Yetkazilmoqda':0, 'Yetkazildi':0 };
    ordersList.forEach(o => { orderStatusCount[o.status] = (orderStatusCount[o.status] || 0) + 1; });
    const ordCtx = document.getElementById('ordersChart').getContext('2d');
    if (charts.orders) charts.orders.destroy();
    charts.orders = new Chart(ordCtx, {
        type: 'pie',
        data: { labels: ['Qabul qilindi', 'Tayyorlanmoqda', 'Yetkazilmoqda', 'Yetkazildi'],
                datasets: [{ data: [orderStatusCount['Qabul qilindi'], orderStatusCount['Tayyorlanmoqda'], orderStatusCount['Yetkazilmoqda'], orderStatusCount['Yetkazildi']],
                            backgroundColor: ['#d4af37', '#f59e0b', '#3b82f6', '#10b981'] }] },
        options: { responsive: true }
    });
    // Build report table (rooms + guests)
    buildReportTable(rooms, ordersList, issuesList);
}

function buildReportTable(rooms, orders, issues) {
    const tableHtml = `
        <h3>📋 Batafsil ma’lumot</h3>
        <table class="data-table" id="detailTable">
            <thead><tr><th>Xona №</th><th>Holat</th><th>Joriy mehmon</th><th>Buyurtmalar soni</th><th>Muammolar</th></tr></thead>
            <tbody>
                ${rooms.map(room => {
                    const roomOrders = orders.filter(o => o.room_id === room.number);
                    const roomIssues = issues.filter(i => i.room_id === room.number);
                    return `<tr>
                        <td>${room.number}</td>
                        <td>${room.status}</td>
                        <td>${room.current_guest_name || '—'}</td>
                        <td>${roomOrders.length}</td>
                        <td>${roomIssues.length}</td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    `;
    document.getElementById('reportTable').innerHTML = tableHtml;
}

function exportToCSV() {
    const table = document.getElementById('detailTable');
    if (!table) return;
    let csv = [];
    for (let row of table.rows) {
        let rowData = [];
        for (let cell of row.cells) rowData.push(cell.innerText);
        csv.push(rowData.join(','));
    }
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `hotel_report_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}