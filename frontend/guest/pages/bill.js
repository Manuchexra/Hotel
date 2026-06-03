// pages/bill.js: Hisob-kitob sahifasi

const BillPage = (() => {
    let bill = null;

    async function loadBill() {
        try {
            const response = await GuestAuth.authenticatedFetch('/billing/guest/bill');

            if (!response.ok) throw new Error('Hisob yuklanmadi');

            bill = await response.json();
            renderBill();
        } catch (err) {
            console.error('Bill yuklash xatosi:', err);
            showError('Hisob yuklanmadi: ' + err.message);
        }
    }

    function renderBill() {
        const container = document.getElementById('bill-page') || createBillPage();

        if (!bill) {
            container.innerHTML = '<div class="error">Hisob yuklanmadi</div>';
            return;
        }

        // BUG FIX #10: Backend BillOut schemasi to'g'ri maydon nomlari:
        //   total          — chegirmasiz umumiy summa
        //   discount_percent — chegirma foizi (0-100)
        //   final_total    — chegirmadan keyin to'lanishi kerak bo'lgan summa
        // Oldin noto'g'ri ishlatilgan: total_amount, paid_amount (bunday maydonlar yo'q)
        const total = bill.total || 0;
        const discountPercent = bill.discount_percent || 0;
        const finalTotal = bill.final_total !== undefined ? bill.final_total : total;
        const discountAmount = total - finalTotal;

        // Hisob holati: to'langan yoki to'lanmagan (sodda tekshiruv)
        const statusClass = finalTotal > 0 ? 'unpaid' : 'paid';
        const statusText = finalTotal > 0 ? "To'lanishi Kerak" : "To'langan";

        container.innerHTML = `
            <div class="page-header">
                <h2>To'lov Qilish</h2>
                <p>Sizning xona hisobi</p>
            </div>

            <div class="bill-container">
                <div class="bill-header">
                    <h3>Hisob-kitob ma'lumotlari</h3>
                    <span class="bill-status ${statusClass}">${statusText}</span>
                </div>

                <div class="bill-summary">
                    <div class="summary-item">
                        <span>Jami Summa:</span>
                        <span class="amount">$${total.toFixed(2)}</span>
                    </div>
                    ${discountPercent > 0 ? `
                    <div class="summary-item">
                        <span>Chegirma (${discountPercent}%):</span>
                        <span class="amount paid">-$${discountAmount.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div class="summary-item highlight">
                        <span>To'lanishi Kerak:</span>
                        <span class="amount ${finalTotal > 0 ? 'due' : 'clear'}">
                            $${finalTotal.toFixed(2)}
                        </span>
                    </div>
                </div>

                <div class="bill-details">
                    <h4>Tafsilot:</h4>
                    <table class="bill-table">
                        <tbody>
                            ${(bill.items || []).map(item => `
                                <tr>
                                    <td>${item.description}</td>
                                    <td class="amount">$${(item.amount || 0).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="bill-actions">
                    ${finalTotal > 0 ? `
                        <button class="payment-btn" onclick="goToPayment()">
                            <i class="fas fa-credit-card"></i> To'lovni Amalga Oshirish
                        </button>
                    ` : ''}
                    <button class="print-btn" onclick="printBill()">
                        <i class="fas fa-print"></i> Chop Etish
                    </button>
                </div>

                <div class="bill-footer">
                    <p>Qo'shimcha savollari bo'lsa, recepsionni chaqiring: ext. 0</p>
                </div>
            </div>
        `;
    }

    function createBillPage() {
        const page = document.createElement('section');
        page.id = 'bill-page';
        page.className = 'page';
        document.querySelector('.main-content').appendChild(page);
        return page;
    }

    function showError(message) {
        const container = document.getElementById('bill-page') || createBillPage();
        container.innerHTML = `<div class="error"><i class="fas fa-exclamation-circle"></i> ${message}</div>`;
    }

    return {
        load: loadBill
    };
})();

function printBill() {
    window.print();
}

function goToPayment() {
    alert("To'lov tizimlari integratsiyasi - tez kunda!");
}

// Bill sahifasini yuklash
const navBill = document.querySelector('[data-page="bill"]');
if (navBill) {
    navBill.addEventListener('click', () => BillPage.load());
}
