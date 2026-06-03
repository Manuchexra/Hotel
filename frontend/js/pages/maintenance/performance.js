// maintenance/performance.js
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="performance-page">
            <h2><i class="fas fa-chart-line"></i> Xodim samaradorligi</h2>
            <div class="performance-filters">
                <select id="perfPeriod" class="filter-select">
                    <option value="all">Barcha vaqt</option>
                    <option value="week">Oxirgi 7 kun</option>
                    <option value="month">Oxirgi 30 kun</option>
                </select>
                <button id="refreshPerf" class="btn-gold"><i class="fas fa-sync-alt"></i> Yangilash</button>
            </div>
            <div id="performanceList" class="performance-container">Yuklanmoqda...</div>
        </div>
    `;

    await loadPerformance();

    document.getElementById('refreshPerf').addEventListener('click', loadPerformance);
    document.getElementById('perfPeriod').addEventListener('change', loadPerformance);

    async function loadPerformance() {
        const container = document.getElementById('performanceList');
        const period = document.getElementById('perfPeriod').value;
        document.getElementById('perfOfflineNote')?.remove();
        container.innerHTML = '<div class="loader-container">Yuklanmoqda...</div>';

        let performanceData = [];
        let dataSource = 'api';

        try {
            const data = await API.getPerformance(period, { silent: true });
            performanceData = data.technicians || [];
        } catch {
            try {
                performanceData = await calculateFromIssues(period);
                dataSource = 'issues';
            } catch {
                performanceData = calculateFromLocalStorage(period);
                dataSource = 'local';
            }
        }

        if (performanceData.length === 0) {
            container.innerHTML = '<p class="no-data">Hech qanday maʼlumot topilmadi</p>';
            return;
        }

        if (dataSource === 'local') {
            container.parentElement.insertAdjacentHTML(
                'afterbegin',
                '<p class="priority-info" id="perfOfflineNote">Backend bilan bog\'lanib bo\'lmadi — localStorage ma\'lumotlari ko\'rsatilmoqda.</p>'
            );
        }

        renderPerformance(performanceData);
    }

    async function calculateFromIssues(period) {
        const issuesData = await API.getIssues({ silent: true });
        const issues = issuesData.issues || [];
        localStorage.setItem('maintenance_issues_cache', JSON.stringify(issues));
        return aggregateIssues(issues, period);
    }

    function calculateFromLocalStorage(period) {
        const cached = localStorage.getItem('maintenance_issues_cache');
        if (cached) {
            try {
                return aggregateIssues(JSON.parse(cached), period);
            } catch {
                // ignore invalid cache
            }
        }
        return aggregateFromResolvedKeys(period);
    }

    function aggregateIssues(issues, period) {
        const now = Date.now();
        let filtered = issues;
        if (period === 'week') {
            const weekAgo = now - 7 * 24 * 3600 * 1000;
            filtered = issues.filter(i => toTimestamp(i.created_at) >= weekAgo);
        } else if (period === 'month') {
            const monthAgo = now - 30 * 24 * 3600 * 1000;
            filtered = issues.filter(i => toTimestamp(i.created_at) >= monthAgo);
        }

        const techMap = {};
        filtered.forEach(issue => {
            const tech = issue.assigned_to || 'Tayinlanmagan';
            if (!techMap[tech]) {
                techMap[tech] = { assigned: 0, resolved: 0, totalTime: 0 };
            }
            if (issue.status === 'tayinlangan' || issue.status === 'hal qilingan') {
                techMap[tech].assigned++;
            }
            if (issue.status === 'hal qilingan') {
                techMap[tech].resolved++;
                const created = toTimestamp(issue.created_at);
                const resolved = toTimestamp(issue.resolved_at);
                if (created && resolved) {
                    techMap[tech].totalTime += (resolved - created) / (1000 * 3600);
                }
            }
        });

        return Object.entries(techMap).map(([name, stats]) => ({
            technician: name,
            assigned: stats.assigned,
            resolved: stats.resolved,
            avg_time: stats.resolved > 0 ? (stats.totalTime / stats.resolved).toFixed(1) : 0
        }));
    }

    function aggregateFromResolvedKeys(period) {
        const currentUser = localStorage.getItem('hotel_user') || 'unknown';
        const techMap = {};
        const now = new Date();

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith('mtc_resolved_')) continue;
            const tech = key.replace('mtc_resolved_', '');
            let data;
            try {
                data = JSON.parse(localStorage.getItem(key));
            } catch {
                continue;
            }
            if (!data || !Array.isArray(data.rooms)) continue;
            if (period !== 'all' && data.date) {
                const entryDate = new Date(data.date);
                if (period === 'week' && (now - entryDate) > 7 * 24 * 3600 * 1000) continue;
                if (period === 'month' && (now - entryDate) > 30 * 24 * 3600 * 1000) continue;
            }
            if (!techMap[tech]) {
                techMap[tech] = { assigned: 0, resolved: 0, totalTime: 0 };
            }
            techMap[tech].resolved += data.rooms.length;
            techMap[tech].assigned += data.rooms.length;
        }

        if (Object.keys(techMap).length === 0 && currentUser !== 'unknown') {
            techMap[currentUser] = { assigned: 0, resolved: 0, totalTime: 0 };
        }

        return Object.entries(techMap).map(([name, stats]) => ({
            technician: name,
            assigned: stats.assigned,
            resolved: stats.resolved,
            avg_time: 0
        }));
    }

    function toTimestamp(value) {
        if (!value) return null;
        if (typeof value === 'number') return value * (value < 1e12 ? 1000 : 1);
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? null : parsed;
    }

    function renderPerformance(techs) {
        const container = document.getElementById('performanceList');
        const sorted = [...techs].sort((a, b) => b.resolved - a.resolved);
        container.innerHTML = `
            <table class="data-table performance-table">
                <thead>
                    <tr><th>Texnik xodim</th><th>Tayinlangan</th><th>Hal qilingan</th><th>O‘rtacha vaqt (soat)</th><th>Samaradorlik</th></tr>
                </thead>
                <tbody>
                    ${sorted.map(tech => `
                        <tr>
                            <td><strong>${escapeHtml(tech.technician)}</strong></td>
                            <td>${tech.assigned}</td>
                            <td>${tech.resolved}</td>
                            <td>${tech.avg_time || '-'}</td>
                            <td>${getEfficiencyBadge(tech.resolved, tech.assigned)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    function getEfficiencyBadge(resolved, assigned) {
        if (assigned === 0) return '<span class="badge neutral">0%</span>';
        const percent = (resolved / assigned) * 100;
        if (percent >= 80) return `<span class="badge high">${percent.toFixed(0)}%</span>`;
        if (percent >= 50) return `<span class="badge medium">${percent.toFixed(0)}%</span>`;
        return `<span class="badge low">${percent.toFixed(0)}%</span>`;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }
}
