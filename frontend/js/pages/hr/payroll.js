// hr/payroll.js
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="payroll-page">
            <h2><i class="fas fa-money-bill-wave"></i> Maoshlar boshqaruvi</h2>
            <div class="payroll-card">
                <h3><i class="fas fa-calculator"></i> Yangi maosh hisoblash</h3>
                <form id="calculateForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Xodim</label>
                            <select id="employeeSelect" required></select>
                        </div>
                        <div class="form-group">
                            <label>Oy (YYYY-MM)</label>
                            <input type="month" id="monthInput" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Qo‘shimcha vaqt (soat)</label>
                            <input type="number" id="overtime" step="0.5" value="0">
                        </div>
                        <div class="form-group">
                            <label>Bonus (so‘m)</label>
                            <input type="number" id="bonus" step="100000" value="0">
                        </div>
                    </div>
                    <button type="submit" class="btn-gold"><i class="fas fa-calculator"></i> Hisoblash</button>
                </form>
                <div id="calcResult" class="result-card" style="display:none;"></div>
            </div>

            <div class="payroll-card">
                <h3><i class="fas fa-history"></i> Maosh tarixi</h3>
                <div class="filters">
                    <input type="text" id="searchEmployee" placeholder="Xodim nomi bo‘yicha...">
                    <input type="month" id="filterMonth" placeholder="Oy">
                    <button id="refreshBtn" class="btn-gold-small"><i class="fas fa-sync-alt"></i> Yangilash</button>
                </div>
                <div id="salariesList" class="salaries-table-wrapper">Yuklanmoqda...</div>
            </div>
        </div>
    `;

    let allSalaries = [];
    let employees = [];

    await loadEmployees();
    await loadSalaries();

    document.getElementById('calculateForm').addEventListener('submit', calculateSalary);
    document.getElementById('refreshBtn').addEventListener('click', loadSalaries);
    document.getElementById('searchEmployee').addEventListener('input', filterSalaries);
    document.getElementById('filterMonth').addEventListener('change', filterSalaries);

    async function loadEmployees() {
        try {
            const users = await API.request('panel', '/users');
            employees = users.filter(u => u.role !== 'manager'); // faqat xodimlar
            const select = document.getElementById('employeeSelect');
            select.innerHTML = '<option value="">Tanlang</option>' +
                employees.map(emp => `<option value="${emp.username}">${emp.fullname || emp.username} (${emp.role})</option>`).join('');
        } catch (err) {
            console.error(err);
        }
    }

    async function loadSalaries() {
        const container = document.getElementById('salariesList');
        container.innerHTML = '<div class="loader-container">Yuklanmoqda...</div>';
        try {
            const data = await API.request('panel', '/admin/salaries');
            allSalaries = data || [];
            filterSalaries();
        } catch (err) {
            container.innerHTML = `<p class="error">Xatolik: ${err.message}</p>`;
        }
    }

    function filterSalaries() {
        const searchTerm = document.getElementById('searchEmployee').value.toLowerCase();
        const filterMonth = document.getElementById('filterMonth').value;
        let filtered = allSalaries.filter(s => {
            const emp = employees.find(e => e.username === s.employee_id);
            const name = (emp?.fullname || s.employee_id).toLowerCase();
            const matchSearch = name.includes(searchTerm);
            const matchMonth = filterMonth ? s.month === filterMonth : true;
            return matchSearch && matchMonth;
        });
        renderSalaries(filtered);
    }

    function renderSalaries(salaries) {
        const container = document.getElementById('salariesList');
        if (salaries.length === 0) {
            container.innerHTML = '<p class="no-data">Hech qanday maosh topilmadi</p>';
            return;
        }
        // Eng yangisi tepada
        salaries.sort((a,b) => b.month.localeCompare(a.month));
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr><th>Xodim</th><th>Oy</th><th>Asosiy soat</th><th>Qo‘shimcha</th><th>Bonus</th><th>Yalpi</th><th>Soliq</th><th>Aniq</th><th>Hisoblangan sana</th></tr>
                </thead>
                <tbody>
                    ${salaries.map(s => {
                        const emp = employees.find(e => e.username === s.employee_id);
                        const empName = emp?.fullname || s.employee_id;
                        return `
                            <tr>
                                <td>${escapeHtml(empName)}</td><td>${s.month}</td>
                                <td>${s.total_hours || 160}</td><td>${s.overtime_hours || 0}</td>
                                <td>${s.bonus?.toLocaleString() || '0'}</td>
                                <td>${s.gross_salary?.toLocaleString()}</td>
                                <td>${s.tax?.toLocaleString()}</td>
                                <td><strong>${s.net_salary?.toLocaleString()}</strong> so‘m</td>
                                <td>${new Date(s.created_at).toLocaleDateString()}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    async function calculateSalary(e) {
        e.preventDefault();
        const employeeId = document.getElementById('employeeSelect').value;
        const month = document.getElementById('monthInput').value;
        const overtime = parseFloat(document.getElementById('overtime').value) || 0;
        const bonus = parseFloat(document.getElementById('bonus').value) || 0;
        if (!employeeId || !month) {
            Utils.showToast('Xodim va oyni tanlang', 'error');
            return;
        }
        try {
            // Avval xodimning ma'lumotlarini olish
            const users = await API.request('panel', '/users');
            const emp = users.find(u => u.username === employeeId);
            if (!emp) throw new Error('Xodim topilmadi');
            const baseHours = 160;
            let gross = 0;
            if (emp.hourly_rate) {
                gross = baseHours * emp.hourly_rate + overtime * emp.hourly_rate * 1.5 + bonus;
            } else {
                gross = (emp.monthly_salary || 5000000) + bonus;
            }
            const tax = gross * 0.12;
            const net = gross - tax;
            const resultDiv = document.getElementById('calcResult');
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <h4>Hisobot</h4>
                <p><strong>${emp.fullname || emp.username}</strong> - ${month}</p>
                <p>Asosiy soat: ${baseHours} | Qo‘shimcha: ${overtime}</p>
                <p>Bonus: ${bonus.toLocaleString()} so‘m</p>
                <p>Yalpi: ${gross.toLocaleString()} so‘m | Soliq: ${tax.toLocaleString()} so‘m</p>
                <p><strong>Aniq maosh: ${net.toLocaleString()} so‘m</strong></p>
                <button id="confirmSaveBtn" class="btn-gold">Saqlash</button>
            `;
            document.getElementById('confirmSaveBtn').onclick = async () => {
                const payload = {
                    employee_id: employeeId,
                    month: month,
                    total_hours: baseHours,
                    overtime_hours: overtime,
                    bonus: bonus,
                    gross_salary: gross,
                    tax: tax,
                    net_salary: net
                };
                await API.request('panel', '/admin/salary/calculate', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                Utils.showToast('Maosh saqlandi', 'success');
                resultDiv.style.display = 'none';
                await loadSalaries();
                document.getElementById('calculateForm').reset();
            };
        } catch (err) {
            Utils.showToast('Xatolik: ' + err.message, 'error');
        }
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}