// roomservice/menu.js
export default function () {
    const content = document.getElementById('pageContent');
    const menu = [
        { name: 'Qahva', price: 3 }, { name: 'Choy', price: 2 }, { name: 'Sendvich', price: 5 },
        { name: 'Pirog', price: 4 }, { name: 'Suv', price: 1 }
    ];
    content.innerHTML = `
        <h2>Menyu</h2>
        <div class="menu-items">${menu.map(item => `
            <div class="menu-item"><h3>${item.name}</h3><p>${item.price} so‘m</p>
            <button class="btn-small" data-name="${item.name}" data-price="${item.price}">Buyurtma qilish</button></div>
        `).join('')}</div>
        <div id="orderResult"></div>
    `;
    document.querySelectorAll('.menu-item button').forEach(btn => {
        btn.addEventListener('click', async () => {
            const roomId = prompt('Xona raqamini kiriting:');
            if (!roomId) return;
            const guestId = prompt('Mehmon ID (ixtiyoriy):') || null;
            const items = [{ name: btn.dataset.name, price: parseFloat(btn.dataset.price) }];
            const result = await API.createOrder({ room_id: parseInt(roomId), guest_id: guestId, items });
            if (result.success) Utils.showToast(`Buyurtma qabul qilindi (ID: ${result.order_id})`, 'success');
            else Utils.showToast('Xatolik', 'error');
        });
    });
}
