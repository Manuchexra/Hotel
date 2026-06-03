// pages/dashboard.js: Dashboard sahifasi

const DashboardPage = (() => {
    async function loadDashboardData() {
        try {
            const info = GuestAuth.getGuestInfo();
            document.getElementById('welcomeName').textContent = info.name;
            document.getElementById('statRoom').textContent = info.room;

            // Get bill to show balance
            // BUG FIX #9: Backend BillOut schemasi: total, final_total, discount_percent
            // Oldin noto'g'ri: bill.total_amount va bill.paid_amount (bunday maydonlar yo'q)
            const token = GuestAuth.getToken();
            const billResponse = await GuestAuth.authenticatedFetch('/billing/guest/bill');

            if (billResponse.ok) {
                const bill = await billResponse.json();
                // final_total - chegirma va barcha to'lovlar hisobga olingan yakuniy summa
                const balance = (bill.final_total !== undefined ? bill.final_total : bill.total) || 0;
                document.getElementById('statBalance').textContent =
                    `$${Math.abs(balance).toFixed(2)}`;
            }
        } catch (err) {
            console.error('Dashboard yuklash xatosi:', err);
        }
    }

    return {
        load: loadDashboardData
    };
})();

// Dashboard sahifasini yuklash
if (document.getElementById('dashboard-page')) {
    DashboardPage.load();
}
