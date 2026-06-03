// pages/issues.js: Muammo xabar qilish sahifasi

const IssuesPage = (() => {
    let issues = [];

    async function loadIssues() {
        try {
            const response = await GuestAuth.authenticatedFetch('/maintenance/issues/all');

            if (response.ok) {
                const data = await response.json();
                issues = data.issues || [];
                renderIssues();
            }
        } catch (err) {
            console.error('Muammolar yuklash xatosi:', err);
        }
    }

    function renderIssues() {
        const container = document.getElementById('issues-page') || createIssuesPage();
        const info = GuestAuth.getGuestInfo();

        const roomIssues = issues.filter(i => i.room_id === info.room);

        container.innerHTML = `
            <div class="page-header">
                <h2>Muammo Haqida Xabar Qilish</h2>
                <p>Texnik muammolar va shikoyatlar</p>
            </div>

            <div class="issues-container">
                <div class="form-section">
                    <h3><i class="fas fa-plus-circle"></i> Yangi Muammo Qo'shish</h3>
                    <form id="issueForm" class="issue-form">
                        <div class="form-group">
                            <label>Muammo Tavsifi:</label>
                            <textarea name="description" required placeholder="Muammoni batafsil tavsiflang..." rows="4"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Ustuvorlik:</label>
                            <select name="priority" required>
                                <option value="">Tanlang...</option>
                                <option value="Past">Past (Bugungi kuni)</option>
                                <option value="Normal">O'rta (Yaringa qadar)</option>
                                <option value="Yuqori">Yuqori (SHOSHQA)</option>
                                <option value="Kritik">Kritik (Darhol)</option>
                            </select>
                        </div>
                        <button type="submit" class="submit-btn">
                            <i class="fas fa-paper-plane"></i> Jo'natish
                        </button>
                    </form>
                </div>

                <div class="issues-list-section">
                    <h3><i class="fas fa-list"></i> Mening Muammolarim</h3>
                    ${roomIssues.length === 0 ? `
                        <div class="empty-state">
                            <i class="fas fa-check-circle"></i>
                            <p>Hech qanday muammo yo'q!</p>
                        </div>
                    ` : `
                        <div class="issues-list">
                            ${roomIssues.map(issue => `
                                <div class="issue-item status-${issue.status}">
                                    <div class="issue-header">
                                        <h4>${issue.description}</h4>
                                        <span class="issue-status">
                                            <span class="status-badge ${issue.status}">
                                                ${getStatusLabel(issue.status)}
                                            </span>
                                        </span>
                                    </div>
                                    <div class="issue-meta">
                                        <span><i class="fas fa-flag"></i> ${getPriorityLabel(issue.priority)}</span>
                                        <span><i class="fas fa-clock"></i> ${formatDate(issue.created_at)}</span>
                                        ${issue.assigned_to ? `<span><i class="fas fa-user"></i> ${issue.assigned_to}</span>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        document.getElementById('issueForm').addEventListener('submit', submitIssue);
    }

    async function submitIssue(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
            const token = GuestAuth.getToken();
            const info = GuestAuth.getGuestInfo();

            // BUG FIX #11: Backend PriorityLevel enum qiymatlari: Past, Normal, Yuqori, Kritik
            // Oldin noto'g'ri: 'low', 'medium', 'high' (bunday qiymatlar yo'q)
            const response = await GuestAuth.authenticatedFetch('/maintenance/guest/issue', {
                method: 'POST',

                body: JSON.stringify({
                    room_id: info.room,
                    description: formData.get('description'),
                    priority: formData.get('priority')  // Endi to'g'ri: Past/Normal/Yuqori/Kritik
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || "Muammo qo'shda xato");
            }

            alert("Muammo muvaffaqiyatli qo'shildi!");
            e.target.reset();
            await loadIssues();
        } catch (err) {
            alert('Xato: ' + err.message);
        }
    }

    function getStatusLabel(status) {
        const labels = {
            'pending': '⏳ Kutilmoqda',
            'assigned': '👤 Tayinlangan',
            'in_progress': '🔧 Bajarilmoqda',
            'resolved': '✅ Hal Qilindi'
        };
        return labels[status] || status;
    }

    // BUG FIX #11: Backend enum qiymatlari bilan mos label
    function getPriorityLabel(priority) {
        const labels = {
            'Past': '↓ Past',
            'Normal': "→ O'rta",
            'Yuqori': '↑ Yuqori',
            'Kritik': '🔴 Kritik',
            // Eski qiymatlar uchun fallback (agar bazada bo'lsa)
            'low': '↓ Past',
            'medium': "→ O'rta",
            'high': '↑ Yuqori'
        };
        return labels[priority] || priority;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const d = typeof dateStr === 'number'
                ? new Date(dateStr * 1000)
                : new Date(dateStr);
            return d.toLocaleDateString('uz-UZ');
        } catch {
            return dateStr;
        }
    }

    function createIssuesPage() {
        const page = document.createElement('section');
        page.id = 'issues-page';
        page.className = 'page';
        document.querySelector('.main-content').appendChild(page);
        return page;
    }

    return {
        load: loadIssues,
        render: renderIssues
    };
})();

// Issues sahifasini yuklash
const navIssues = document.querySelector('[data-page="issues"]');
if (navIssues) {
    navIssues.addEventListener('click', () => IssuesPage.load());
}
