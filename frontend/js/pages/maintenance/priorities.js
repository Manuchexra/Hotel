// maintenance/priorities.js
const LIMITS_CACHE_KEY = 'maintenance_priority_limits';

export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="priority-page">
            <h2><i class="fas fa-flag-checkered"></i> Ustuvorlik sozlamalari</h2>
            <div class="priority-info">
                <p>Har bir ustuvorlik darajasi uchun maksimal hal qilish vaqti (soat) belgilang.
                Muddat o‘tgan ochiq muammolar avtomatik ravishda yuqori ustuvorlikka ko‘tariladi:
                Past → Normal → Yuqori → Kritik.</p>
            </div>
            <div class="priority-settings">
                <div class="priority-card kritik">
                    <div class="priority-header"><i class="fas fa-skull-crosswalk"></i> Kritik</div>
                    <div class="priority-input"><label>Maksimal vaqt (soat):</label><input type="number" id="time_kritik" min="0.5" step="0.5" value="1"></div>
                    <div class="priority-desc">Eng yuqori ustuvorlik. Shoshilinch muammolar.</div>
                </div>
                <div class="priority-card yuqori">
                    <div class="priority-header"><i class="fas fa-exclamation-triangle"></i> Yuqori</div>
                    <div class="priority-input"><label>Maksimal vaqt (soat):</label><input type="number" id="time_yuqori" min="1" step="1" value="4"></div>
                    <div class="priority-desc">Muddat o‘tsa — Kritik darajaga ko‘tariladi.</div>
                </div>
                <div class="priority-card normal">
                    <div class="priority-header"><i class="fas fa-clock"></i> Normal</div>
                    <div class="priority-input"><label>Maksimal vaqt (soat):</label><input type="number" id="time_normal" min="2" step="1" value="24"></div>
                    <div class="priority-desc">Muddat o‘tsa — Yuqori darajaga ko‘tariladi.</div>
                </div>
                <div class="priority-card past">
                    <div class="priority-header"><i class="fas fa-calendar-week"></i> Past</div>
                    <div class="priority-input"><label>Maksimal vaqt (soat):</label><input type="number" id="time_past" min="4" step="4" value="72"></div>
                    <div class="priority-desc">Muddat o‘tsa — Normal darajaga ko‘tariladi.</div>
                </div>
            </div>
            <div class="priority-actions">
                <button id="savePrioritiesBtn" class="btn-gold"><i class="fas fa-save"></i> Saqlash</button>
                <button id="resetPrioritiesBtn" class="btn-outline"><i class="fas fa-undo-alt"></i> Standartga qaytarish</button>
            </div>
            <div id="priorityMessage" class="action-message"></div>
        </div>
    `;

    await loadSettings();

    document.getElementById('savePrioritiesBtn').addEventListener('click', saveSettings);
    document.getElementById('resetPrioritiesBtn').addEventListener('click', resetSettings);

    async function loadSettings() {
        const defaults = { kritik: 1, yuqori: 4, normal: 24, past: 72 };
        let limits = { ...defaults };

        try {
            const data = await API.getPriorityLimits({ silent: true });
            if (data?.limits) limits = { ...defaults, ...data.limits };
        } catch {
            const saved = localStorage.getItem(LIMITS_CACHE_KEY);
            if (saved) limits = { ...defaults, ...JSON.parse(saved) };
        }

        document.getElementById('time_kritik').value = limits.kritik;
        document.getElementById('time_yuqori').value = limits.yuqori;
        document.getElementById('time_normal').value = limits.normal;
        document.getElementById('time_past').value = limits.past;
    }

    function readLimitsFromForm() {
        return {
            kritik: parseFloat(document.getElementById('time_kritik').value),
            yuqori: parseFloat(document.getElementById('time_yuqori').value),
            normal: parseFloat(document.getElementById('time_normal').value),
            past: parseFloat(document.getElementById('time_past').value)
        };
    }

    async function saveSettings() {
        const limits = readLimitsFromForm();
        localStorage.setItem(LIMITS_CACHE_KEY, JSON.stringify(limits));
        try {
            await API.savePriorityLimits(limits);
            showMessage('Sozlamalar saqlandi va backendga yuborildi', 'success');
        } catch {
            showMessage('Sozlamalar mahalliy saqlandi (backend bilan bog‘lanib bo‘lmadi)', 'info');
        }
    }

    async function resetSettings() {
        document.getElementById('time_kritik').value = 1;
        document.getElementById('time_yuqori').value = 4;
        document.getElementById('time_normal').value = 24;
        document.getElementById('time_past').value = 72;
        await saveSettings();
        showMessage('Standart qiymatlar tiklandi', 'info');
    }

    function showMessage(msg, type) {
        const msgDiv = document.getElementById('priorityMessage');
        msgDiv.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
        setTimeout(() => { msgDiv.innerHTML = ''; }, 3000);
    }
}
