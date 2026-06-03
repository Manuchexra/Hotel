// maintenance/history.js
const ISSUES_CACHE_KEY = 'maintenance_issues_cache';

export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="history-page">
            <h2><i class="fas fa-history"></i> Muammolar tarixi</h2>
            <div class="history-filters">
                <input type="text" id="searchHistory" placeholder="🔍 Xona raqami yoki tavsif bo‘yicha..." class="search-input">
                <select id="statusFilter" class="filter-select">
                    <option value="all">Barcha holat</option>
                    <option value="yangi">Yangi</option>
                    <option value="tayinlangan">Tayinlangan</option>
                    <option value="hal qilingan">Hal qilingan</option>
                </select>
                <select id="priorityFilter" class="filter-select">
                    <option value="all">Barcha prioritet</option>
                    <option value="Kritik">Kritik</option>
                    <option value="Yuqori">Yuqori</option>
                    <option value="Normal">Normal</option>
                    <option value="Past">Past</option>
                </select>
                <input type="date" id="dateFrom" class="filter-date" placeholder="Sana dan">
                <input type="date" id="dateTo" class="filter-date" placeholder="Sana gacha">
                <button id="refreshHistory" class="btn-gold"><i class="fas fa-sync-alt"></i> Yangilash</button>
            </div>
            <div id="historyOfflineNote"></div>
            <div id="historyList" class="history-list-wrapper">Yuklanmoqda...</div>
        </div>
    `;

    let allIssues = [];
    await loadHistory();

    document.getElementById('refreshHistory').addEventListener('click', loadHistory);
    document.getElementById('searchHistory').addEventListener('input', filterAndRender);
    document.getElementById('statusFilter').addEventListener('change', filterAndRender);
    document.getElementById('priorityFilter').addEventListener('change', filterAndRender);
    document.getElementById('dateFrom').addEventListener('change', filterAndRender);
    document.getElementById('dateTo').addEventListener('change', filterAndRender);

    async function loadHistory() {
        const container = document.getElementById('historyList');
        const noteEl = document.getElementById('historyOfflineNote');
        noteEl.innerHTML = '';
        container.innerHTML = '<div class="loader-container">Yuklanmoqda...</div>';

        let fromCache = false;
        try {
            const data = await API.getIssues({ silent: true });
            allIssues = data?.issues || [];
            saveIssuesCache(allIssues);
        } catch {
            allIssues = loadIssuesFromCache();
            fromCache = true;
            if (allIssues.length === 0) {
                allIssues = buildIssuesFromResolvedStorage();
            }
        }

        if (fromCache) {
            noteEl.innerHTML = '<p class="priority-info">Backend bilan bog\'lanib bo\'lmadi — saqlangan ma\'lumotlar ko\'rsatilmoqda.</p>';
        }

        if (allIssues.length === 0) {
            container.innerHTML = '<p class="no-data">Hech qanday muammo topilmadi</p>';
            return;
        }

        filterAndRender();
    }

    function filterAndRender() {
        const searchTerm = document.getElementById('searchHistory').value.toLowerCase();
        const status = document.getElementById('statusFilter').value;
        const priority = document.getElementById('priorityFilter').value;
        const dateFrom = document.getElementById('dateFrom').value;
        const dateTo = document.getElementById('dateTo').value;

        let filtered = allIssues.filter(issue => {
            const matchSearch = issue.room_id?.toString().includes(searchTerm) ||
                               (issue.description && issue.description.toLowerCase().includes(searchTerm));
            const matchStatus = status === 'all' ? true : issue.status === status;
            const matchPriority = priority === 'all' ? true : issue.priority === priority;
            let matchDate = true;
            if (dateFrom && issue.created_at) {
                const issueDate = toDateString(issue.created_at);
                if (issueDate && issueDate < dateFrom) matchDate = false;
            }
            if (dateTo && matchDate && issue.created_at) {
                const issueDate = toDateString(issue.created_at);
                if (issueDate && issueDate > dateTo) matchDate = false;
            }
            return matchSearch && matchStatus && matchPriority && matchDate;
        });
        renderTable(filtered);
    }

    function renderTable(issues) {
        const container = document.getElementById('historyList');
        if (issues.length === 0) {
            container.innerHTML = '<p class="no-data">Hech qanday yozuv topilmadi</p>';
            return;
        }
        container.innerHTML = `
            <table class="data-table history-table">
                <thead>
                    <tr>
                        <th>ID</th><th>Xona №</th><th>Tavsif</th><th>Prioritet</th><th>Holat</th><th>Texnik</th><th>Yaratilgan vaqt</th>
                    </tr>
                </thead>
                <tbody>
                    ${issues.map(issue => `
                        <tr>
                            <td>${String(issue.id).slice(-6)}</td>
                            <td>${issue.room_id}</td>
                            <td>${escapeHtml(issue.description)}</td>
                            <td><span class="priority-badge priority-${String(issue.priority).toLowerCase()}">${issue.priority}</span></td>
                            <td>${getStatusText(issue.status)}</td>
                            <td>${issue.assigned_to || '—'}</td>
                            <td>${formatDateTime(issue.created_at)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    function getStatusText(status) {
        if (status === 'yangi') return '🟡 Yangi';
        if (status === 'tayinlangan') return '🔵 Tayinlangan';
        if (status === 'hal qilingan') return '✅ Hal qilingan';
        return status;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }
}

function saveIssuesCache(issues) {
    localStorage.setItem(ISSUES_CACHE_KEY, JSON.stringify(issues));
}

function loadIssuesFromCache() {
    try {
        const cached = localStorage.getItem(ISSUES_CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    } catch {
        return [];
    }
}

function buildIssuesFromResolvedStorage() {
    const issues = [];
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
        if (!data?.rooms?.length) continue;
        data.rooms.forEach((roomId, idx) => {
            issues.push({
                id: `local-${tech}-${roomId}-${idx}`,
                room_id: roomId,
                description: 'Hal qilingan muammo (mahalliy yozuv)',
                priority: 'Normal',
                status: 'hal qilingan',
                assigned_to: tech,
                created_at: data.date ? new Date(data.date).getTime() / 1000 : Date.now() / 1000
            });
        });
    }
    return issues;
}

function toDateString(value) {
    if (!value) return null;
    const ms = typeof value === 'number' ? value * (value < 1e12 ? 1000 : 1) : Date.parse(value);
    if (Number.isNaN(ms)) return null;
    return new Date(ms).toISOString().slice(0, 10);
}

function formatDateTime(value) {
    if (!value) return '—';
    const ms = typeof value === 'number' ? value * (value < 1e12 ? 1000 : 1) : Date.parse(value);
    if (Number.isNaN(ms)) return '—';
    return new Date(ms).toLocaleString();
}

export { saveIssuesCache, loadIssuesFromCache, ISSUES_CACHE_KEY };
