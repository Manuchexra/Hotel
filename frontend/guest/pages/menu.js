// pages/menu.js: Ovqat buyurtmasi sahifasi

const menuItems = [
    { id: 1, name: 'Fried Chicken', category: 'Main', price: 15, description: 'Crispy fried chicken with fries', image: '🍗' },
    { id: 2, name: 'Pizza Margherita', category: 'Main', price: 12, description: 'Classic Italian pizza', image: '🍕' },
    { id: 3, name: 'Caesar Salad', category: 'Salad', price: 8, description: 'Fresh garden vegetables', image: '🥗' },
    { id: 4, name: 'Burger', category: 'Main', price: 10, description: 'Juicy beef burger', image: '🍔' },
    { id: 5, name: 'Pasta Carbonara', category: 'Main', price: 13, description: 'Italian pasta with cream sauce', image: '🍝' },
    { id: 6, name: 'Coca Cola', category: 'Drink', price: 2, description: 'Cold soft drink', image: '🥤' },
    { id: 7, name: 'Chocolate Cake', category: 'Dessert', price: 6, description: 'Rich chocolate dessert', image: '🍰' },
    { id: 8, name: 'Ice Cream', category: 'Dessert', price: 4, description: 'Vanilla ice cream', image: '🍦' }
];

let cart = [];

function renderMenu() {
    const container = document.getElementById('menu-page') || createMenuPage();
    container.innerHTML = `
        <div class="page-header">
            <h2>Ovqat Buyurtmasi</h2>
            <p>Sizga yoqadigan taomlarni tanlang</p>
        </div>
        <div class="menu-container">
            <div class="menu-list">
                ${menuItems.map(item => `
                    <div class="menu-item">
                        <div class="item-image">${item.image}</div>
                        <div class="item-details">
                            <h3>${item.name}</h3>
                            <p>${item.description}</p>
                            <span class="item-category">${item.category}</span>
                        </div>
                        <div class="item-price">
                            <span>$${item.price}</span>
                            <button class="add-btn" onclick="addToCart(${item.id})" title="Savatga qo'shish">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="cart-sidebar">
                <h3>Savat</h3>
                <div class="cart-items" id="cartItems">
                    <p class="empty-cart">Savat bo'sh</p>
                </div>
                <div class="cart-summary">
                    <div class="summary-row">
                        <span>Jami:</span>
                        <span id="cartTotal">$0.00</span>
                    </div>
                </div>
                <button class="checkout-btn" id="placeOrderBtn" onclick="placeOrder()" disabled>
                    Buyurtma Qilish
                </button>
            </div>
        </div>
    `;
    updateCartDisplay();
}

function addToCart(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    const existing = cart.find(c => c.id === itemId);

    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ ...item, quantity: 1 });
    }

    updateCartDisplay();
}

function removeFromCart(itemId) {
    cart = cart.filter(i => i.id !== itemId);
    updateCartDisplay();
}

function updateCartDisplay() {
    const container = document.getElementById('cartItems');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = "<p class=\"empty-cart\">Savat bo'sh</p>";
    } else {
        container.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div>
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-qty">Miqdor: ${item.quantity}</div>
                </div>
                <div class="cart-item-price">
                    <span>$${(item.price * item.quantity).toFixed(2)}</span>
                    <button class="remove-btn" onclick="removeFromCart(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalEl = document.getElementById('cartTotal');
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

    const btn = document.getElementById('placeOrderBtn');
    if (btn) btn.disabled = cart.length === 0;
}

async function placeOrder() {
    if (cart.length === 0) {
        alert("Savat bo'sh!");
        return;
    }

    try {
        const info = GuestAuth.getGuestInfo();

        // BUG FIX #12: Backend OrderItemSchema faqat { name, price } qabul qiladi,
        // quantity maydoni yo'q. Bir xil mahsulot N martta buyurtma qilinsa,
        // uni N ta alohida yozuv sifatida yuboramiz (price * 1 har biri uchun).
        // Narxni ko'paytirib, nomga miqdor qo'shib yuboramiz.
        const orderItems = cart.flatMap(item =>
            Array.from({ length: item.quantity }, () => ({
                name: item.quantity > 1 ? `${item.name}` : item.name,
                price: item.price
            }))
        );

        const response = await GuestAuth.authenticatedFetch('/roomservice/guest/order', {
            method: 'POST',
            body: JSON.stringify({
                room_id: info.room,
                items: orderItems,
                special_requests: ''
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Buyurtma joylashda xato');
        }

        alert('Buyurtma muvaffaqiyatli joylashtirildi!');
        cart = [];
        updateCartDisplay();
    } catch (err) {
        alert('Xato: ' + err.message);
    }
}

function createMenuPage() {
    const page = document.createElement('section');
    page.id = 'menu-page';
    page.className = 'page';
    document.querySelector('.main-content').appendChild(page);
    return page;
}

const navMenu = document.querySelector('[data-page="menu"]');
if (navMenu) {
    navMenu.addEventListener('click', renderMenu);
}

if (!document.querySelector('.menu-list')) {
    renderMenu();
}
