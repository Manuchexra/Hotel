// hr/dashboard.js
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="hr-dashboard">
            <h2><i class="fas fa-chart-line"></i> HR boshqaruvi</h2>

            <div class="hr-stats">
                <div class="stat-card"><i class="fas fa-users"></i><div><h3>Xodimlar soni</h3><p id="empCount">-</p></div></div>
                <div class="stat-card"><i class="fas fa-money-bill-wave"></i><div><h3>Jami maoshlar</h3><p id="totalSalaries">-</p></div></div>
                <div class="stat-card"><i class="fas fa-chart-simple"></i><div><h3>O‘rtacha maosh</h3><p id="avgSalary">-</p></div></div>
                <div class="stat-card"><i class="fas fa-calendar-alt"></i><div><h3>Bu oy hisoblangan</h3><p id="monthTotal">-</p></div></div>
            </div>

            <div class="charts-row">
                <div class="chart-card">
                    <h3><i class="fas fa-chart-pie"></i> Xodimlar (rol bo‘yicha)</h3>
                    <canvas id="employeesChart"></canvas>
                </div>
                <div class="chart-card">
                    <h3><i class="fas fa-chart-line"></i> Maosh dinamikasi (so‘nggi 6 oy)</h3>
                    <canvas id="salaryTrendChart"></canvas>
                </div>
            </div>

            <div class="hr-card">
                <h3><i class="fas fa-history"></i> So‘nggi maoshlar</h3>
                <div id="salariesList" class="salaries-table-wrapper">Yuklanmoqda...</div>
            </div>
        </div>
    `;

    if (typeof Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        script.onload = () => init();
        document.head.appendChild(script);
    } else {
        init();
    }

    async function init() {
        await loadStats();
        await loadSalaries();
        await loadCharts();
    }
}

let employeesChart = null, salaryTrendChart = null;

async function loadStats() {
    try {
        // API: GET /users (barcha foydalanuvchilar, role hr)
        const users = await API.request('panel', '/users');
        const staff = users?.filter(u => u.role !== 'manager') || [];
        const empCount = staff.length;
        document.getElementById('empCount').innerText = empCount;

        // API: GET /admin/salaries
        const salaries = await API.request('panel', '/admin/salaries');
        const totalSalaries = salaries?.reduce((s, v) => s + v.net_salary, 0) || 0;
        document.getElementById('totalSalaries').innerText = totalSalaries.toLocaleString() + ' so‘m';

        const avgSalary = empCount ? Math.round(totalSalaries / empCount) : 0;
        document.getElementById('avgSalary').innerText = avgSalary.toLocaleString() + ' so‘m';

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthSalaries = salaries?.filter(s => s.month === currentMonth) || [];
        const monthTotal = monthSalaries.reduce((s, v) => s + v.net_salary, 0);
        document.getElementById('monthTotal').innerText = monthTotal.toLocaleString() + ' so‘m';
    } catch (err) {
        console.error(err);
        Utils.showToast(err.message || 'Xatolik', 'error');
    }
}

async function loadSalaries() {
    const container = document.getElementById('salariesList');
    try {
        const salaries = await API.request('panel', '/admin/salaries');
        if (!salaries || salaries.length === 0) {
            container.innerHTML = '<p class="no-data">Hali maosh hisoblanmagan</p>';
            return;
        }
        // Xodim ismlarini olish uchun GET /users
        const users = await API.request('panel', '/users');
        const userMap = {};
        users.forEach(u => userMap[u.username] = u.fullname || u.username);

        const sorted = [...salaries].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr><th>Xodim</th><th>Oy</th><th>Soatlar</th><th>Bonus</th><th>Yalpi (so‘m)</th><th>Aniq (so‘m)</th><th>Sana</th></tr>
                </thead>
                <tbody>
                    ${sorted.map(s => `
                        <tr>
                            <td>${escapeHtml(userMap[s.employee_id] || s.employee_id)}</td>
                            <td>${s.month}</td>
                            <td>${s.total_hours || 160}</td>
                            <td>${s.bonus}</td>
                            <td>${s.gross_salary}</td>
                            <td>${s.net_salary}</td>
                            <td>${new Date(s.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        container.innerHTML = `<p>Xatolik: ${err.message}</p>`;
    }
}

async function loadCharts() {
    try {
        // Xodimlar ro‘yxati (GET /users)
        const users = await API.request('panel', '/users');
        const roles = ['receptionist', 'housekeeping', 'roomservice', 'maintenance', 'manager', 'hr'];
        const roleCount = {};
        roles.forEach(r => roleCount[r] = 0);
        users.forEach(u => {
            if (roleCount[u.role] !== undefined) roleCount[u.role]++;
        });
        const labels = roles.map(r => r.charAt(0).toUpperCase() + r.slice(1));
        const data = roles.map(r => roleCount[r]);

        const ctx = document.getElementById('employeesChart').getContext('2d');
        if (employeesChart) employeesChart.destroy();
        employeesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: ['#d4af37', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { color: 'var(--text-light)' } }
                }
            }
        });

        // Maosh dinamikasi (so‘nggi 6 oy)
        const salaries = await API.request('panel', '/admin/salaries');
        const now = new Date();
        const months = [];
        const monthlyTotal = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            months.push(monthStr);
            const total = salaries?.filter(s => s.month === monthStr).reduce((sum, s) => sum + s.net_salary, 0) || 0;
            monthlyTotal.push(total);
        }
        const ctxTrend = document.getElementById('salaryTrendChart').getContext('2d');
        if (salaryTrendChart) salaryTrendChart.destroy();
        salaryTrendChart = new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Maoshlar yig‘indisi (so‘m)',
                    data: monthlyTotal,
                    borderColor: 'var(--gold)',
                    backgroundColor: 'rgba(212,175,55,0.1)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: { responsive: true }
        });
    } catch (err) {
        console.error(err);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}
