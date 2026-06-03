// pages/checkout.js: Chiqish sahifasi

const CheckoutPage = (() => {
    function renderCheckout() {
        const container = document.getElementById('checkout-page') || createCheckoutPage();
        const info = GuestAuth.getGuestInfo();

        container.innerHTML = `
            <div class="page-header">
                <h2>Chiqish Jarayoni</h2>
                <p>Xona raqami: <strong>${info.room}</strong></p>
            </div>

            <div class="checkout-container">
                <div class="checkout-steps">
                    <div class="step">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <h3>Hisobni Tekshirish</h3>
                            <p>Barcha to'lovlarni ko'rib chiqing va tugatishni tasdiqlang</p>
                            <button class="step-btn" onclick="reviewBill()">
                                Hisobni Ko'rish
                            </button>
                        </div>
                    </div>

                    <div class="step">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <h3>Xonani Tekshirish</h3>
                            <p>Iltimos, xonani bo'shatishdan oldin barcha shaxsiy edalrini olib boring</p>
                            <div class="checklist">
                                <label><input type="checkbox"> Shaxsiy narsalarni tekshirdim</label>
                                <label><input type="checkbox"> Daraja-jinsiyatlarini tekshirdim</label>
                                <label><input type="checkbox"> Xonani yopib ketish kerak</label>
                            </div>
                        </div>
                    </div>

                    <div class="step">
                        <div class="step-number">3</div>
                        <div class="step-content">
                            <h3>Chiqishni Tasdiqlash</h3>
                            <p>Chiqishni tugatish uchun quyidagi tugmani bosing</p>
                            <form id="checkoutForm" class="checkout-form">
                                <div class="form-group">
                                    <label>Chiqish vaqti:</label>
                                    <input type="text" id="checkoutTime" readonly value="">
                                </div>
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" name="confirm" required>
                                        Xonani bo'shatib tasdiqlayapman va barcha to'lovlar amalga oshirilgan
                                    </label>
                                </div>
                                <button type="submit" class="checkout-btn" onclick="processCheckout(event)">
                                    <i class="fas fa-sign-out-alt"></i> Chiqishni Yakunlash
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="checkout-info">
                    <h4><i class="fas fa-info-circle"></i> Muhim Ma'lumot</h4>
                    <ul>
                        <li>Check-out vaqti: <strong>12:00 (tushdan oldin)</strong></li>
                        <li>Kechiqqan chiqish uchun qo'shimcha hisob-kitob qo'llaniladi</li>
                        <li>Xona sifatini tekshirish uchun hizmatchilar kelib ketadilar</li>
                        <li>Shikoyatlar bo'lsa, recepsionni chaqiring</li>
                    </ul>
                </div>
            </div>
        `;

        document.getElementById('checkoutTime').value = new Date().toLocaleString('uz-UZ');
        setupCheckoutForm();
    }

    function setupCheckoutForm() {
        const form = document.getElementById('checkoutForm');
        if (form) {
            form.addEventListener('submit', processCheckout);
        }
    }

    async function processCheckout(e) {
        e.preventDefault();

        const confirmCheck = document.querySelector('input[name="confirm"]').checked;
        if (!confirmCheck) {
            alert('Iltimos barcha shartlarni tasdiqlang');
            return;
        }

        const confirmed = confirm('Chiqishni yakunlaysizmi? Buning bilan xona tugatiladi va hisob tugatiladi.');
        if (!confirmed) return;

        try {
            const info = GuestAuth.getGuestInfo();

            const response = await GuestAuth.authenticatedFetch('/reception/guest/checkout', {
                method: 'POST',
                body: JSON.stringify({
                    guest_id: info.guestId,
                    room_id: info.room
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Chiqish amalga oshmadi');
            }

            alert('✅ Muvaffaqiyatli chiqtingiz! Rahmat, bizni tanlaganguningiz uchun!');
            setTimeout(() => {
                GuestAuth.logout();
            }, 2000);
        } catch (err) {
            alert('❌ Xato: ' + err.message);
        }
    }

    function createCheckoutPage() {
        const page = document.createElement('section');
        page.id = 'checkout-page';
        page.className = 'page';
        document.querySelector('.main-content').appendChild(page);
        return page;
    }

    return {
        render: renderCheckout
    };
})();

function reviewBill() {
    switchPage('bill');
}

// Checkout sahifasini ko'rsatganda yuklash
const navCheckout = document.querySelector('[data-page="checkout"]');
if (navCheckout) {
    navCheckout.addEventListener('click', () => CheckoutPage.render());
}
