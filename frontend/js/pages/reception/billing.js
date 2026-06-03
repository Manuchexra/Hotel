// reception/billing.js
export default async function () {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <h2>Hisob-kitob</h2>
        <div class="form-row"><label>Mehmon:</label><select id="guestSelectBilling"><option value="">Tanlang...</option></select></div>
        <div class="form-row"><label>Mehmon ID:</label><input type="text" id="guestIdBilling" placeholder="Mehmon ID"></div>
        <button id="loadBillBtn" class="btn-gold">Hisobni ko‘rish</button>
        <div id="billInfo" class="billing-view"></div>
    `;

    const div = document.getElementById('billInfo');
    const select = document.getElementById('guestSelectBilling');
    const input = document.getElementById('guestIdBilling');

    const loadBill = async (guestId) => {
        if (!guestId) {
            Utils.showToast('Mehmon ID kiriting', 'error');
            return;
        }
        let bill = null;
        try {
            bill = await API.getBill(guestId);
        } catch (e) {
            div.innerHTML = '<div class="error">Hisob topilmadi</div>';
            return;
        }
        if (!bill) {
            div.innerHTML = '<div class="error">Hisob topilmadi</div>';
            return;
        }
        div.innerHTML = `
            <h3>${bill.guest_name} (xona ${bill.room_id})</h3>
            <table class="data-table"><thead><tr><th>Xizmat</th><th>Summa</th></tr></thead><tbody>
                ${bill.items.map(i => `<tr><td>${i.description}</td><td>${i.amount} so‘m</td></tr>`).join('')}
            </tbody></table>
            <p><strong>Jami: ${bill.total} so‘m</strong> | Chegirma: ${bill.discount_percent}% | <strong>Yakuniy: ${bill.final_total} so‘m</strong></p>
            <button id="checkoutBtn" class="btn-gold">Check-out</button>
        `;
        document.getElementById('checkoutBtn').onclick = async () => {
            try {
                const res = await API.checkout(guestId);
                if (res.success) {
                    Utils.showToast(`Mehmon ${res.guest_name} chiqarildi`, 'success');
                    window.location.hash = '/reception/guests';
                } else {
                    Utils.showToast(res.message || 'Xatolik', 'error');
                }
            } catch (e) {
                Utils.showToast('Xatolik', 'error');
            }
        };
    };

    document.getElementById('loadBillBtn').onclick = async () => {
        const guestId = input.value.trim();
        await loadBill(guestId);
    };

    select.onchange = async () => {
        const guestId = select.value;
        if (!guestId) return;
        input.value = guestId;
        await loadBill(guestId);
    };

    try {
        const guests = await API.getGuests();
        if (guests && guests.length) {
            select.innerHTML = [
                '<option value="">Tanlang...</option>',
                ...guests.map(g => `<option value="${g.id}">${g.name} (xona ${g.room_id || '-'}) — ${g.id.slice(-8)}</option>`)
            ].join('');
        }
    } catch (e) {
    }

    const guestIdFromRoute = window.__route?.query?.guestId?.trim();
    if (guestIdFromRoute) {
        input.value = guestIdFromRoute;
        if (select.querySelector(`option[value="${guestIdFromRoute}"]`)) {
            select.value = guestIdFromRoute;
        }
        await loadBill(guestIdFromRoute);
    }
}
