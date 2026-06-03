// profile.js
export default async function () {
    const username = localStorage.getItem('hotel_user') || 'admin';
    const role = Auth.getRole() || 'manager';

    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="profile-container">
            <div class="profile-header">
                <div class="avatar-container" id="avatarContainer">
                    <img id="avatarImg" src="/assets/default-avatar.png" alt="Avatar" class="profile-avatar-img">
                    <button id="changeAvatarBtn" class="avatar-edit-btn"><i class="fas fa-camera"></i></button>
                    <input type="file" id="avatarInput" accept="image/*" style="display:none">
                </div>
                <h2 id="displayName">${username}</h2>
                <span class="role-badge">${role}</span>
                <p class="profile-username">@${username}</p>
            </div>

            <div class="profile-card">
                <h3><i class="fas fa-user"></i> Shaxsiy ma'lumotlar</h3>
                <form id="profileForm">
                    <div class="form-row">
                        <div class="form-group"><label>Ism</label><input type="text" id="firstName" placeholder="Ismingiz"></div>
                        <div class="form-group"><label>Familiya</label><input type="text" id="lastName" placeholder="Familiyangiz"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Email</label><input type="email" id="email" placeholder="example@mail.com"></div>
                        <div class="form-group"><label>Telefon</label><input type="tel" id="phone" placeholder="+998 xx xxx xx xx"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Til</label><select id="language">
                            <option value="uz">O'zbekcha</option>
                            <option value="ru">Русский</option>
                            <option value="en">English</option>
                        </select></div>
                        <div class="form-group"><label>Valyuta</label><select id="currency">
                            <option value="UZS">So'm (UZS)</option>
                            <option value="USD">$ USD</option>
                        </select></div>
                    </div>
                    <button type="submit" class="btn-gold"><i class="fas fa-save"></i> Ma'lumotlarni saqlash</button>
                </form>
                <div id="profileMessage" class="message"></div>
            </div>

            <div class="profile-card">
                <h3><i class="fas fa-credit-card"></i> Karta ma'lumotlari</h3>
                <form id="cardForm">
                    <div class="form-row">
                        <div class="form-group"><label>Karta raqami</label><input type="text" id="cardNumber" placeholder="1234 5678 9012 3456" maxlength="19"></div>
                        <div class="form-group"><label>Karta egasi</label><input type="text" id="cardHolder" placeholder="FAMILIYA ISM"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Amal qilish muddati</label><input type="text" id="expiryDate" placeholder="MM/YY"></div>
                        <div class="form-group"><label>CVV</label><input type="password" id="cvv" placeholder="***" maxlength="4"></div>
                    </div>
                    <button type="submit" class="btn-gold"><i class="fas fa-save"></i> Kartani saqlash</button>
                </form>
                <div id="cardMessage" class="message"></div>
            </div>

            <div class="profile-card">
                <h3><i class="fas fa-key"></i> Parolni o'zgartirish</h3>
                <form id="changePasswordForm">
                    <div class="form-group"><label>Joriy parol</label><input type="password" id="currentPassword" required></div>
                    <div class="form-group"><label>Yangi parol</label><input type="password" id="newPassword" required minlength="6"></div>
                    <div class="form-group"><label>Yangi parol (takror)</label><input type="password" id="confirmPassword" required></div>
                    <button type="submit" class="btn-gold"><i class="fas fa-save"></i> Parolni o'zgartirish</button>
                </form>
                <div id="passwordMessage" class="message"></div>
            </div>
        </div>
    `;

    // Load profile data from backend
    let profileData = {};
    let cardData = {};

    try {
        const data = await API.request('panel', '/profile');
        profileData = data.profile || {};
        cardData = data.card || {};
        // Populate form fields
        document.getElementById('firstName').value = profileData.first_name || '';
        document.getElementById('lastName').value = profileData.last_name || '';
        document.getElementById('email').value = profileData.email || '';
        document.getElementById('phone').value = profileData.phone || '';
        document.getElementById('language').value = profileData.language || 'uz';
        document.getElementById('currency').value = profileData.currency || 'UZS';
        if (profileData.avatar) document.getElementById('avatarImg').src = profileData.avatar;
        document.getElementById('displayName').innerText = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || username;
        
        document.getElementById('cardNumber').value = cardData.card_number || '';
        document.getElementById('cardHolder').value = cardData.card_holder || '';
        document.getElementById('expiryDate').value = cardData.expiry_date || '';
        // CVV never stored, leave empty
    } catch (err) {
        console.error('Failed to load profile', err);
        Utils.showToast('Profil maʼlumotlarini yuklashda xatolik', 'error');
    }

    // Avatar upload
    const avatarInput = document.getElementById('avatarInput');
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const avatarImg = document.getElementById('avatarImg');
    changeAvatarBtn.addEventListener('click', () => avatarInput.click());
    avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const base64 = ev.target.result;
                avatarImg.src = base64;
                try {
                    await API.request('panel', '/profile/avatar', {
                        method: 'PUT',
                        body: JSON.stringify({ avatar: base64 })
                    });
                    Utils.showToast('Avatar yangilandi', 'success');
                } catch (err) {
                    Utils.showToast('Avatar saqlanmadi: ' + err.message, 'error');
                }
            };
            reader.readAsDataURL(file);
        } else {
            Utils.showToast('Faqat rasm fayli tanlang', 'error');
        }
    });

    // Save personal info
    const profileForm = document.getElementById('profileForm');
    const profileMsg = document.getElementById('profileMessage');
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            first_name: document.getElementById('firstName').value,
            last_name: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            language: document.getElementById('language').value,
            currency: document.getElementById('currency').value
        };
        try {
            await API.request('panel', '/profile', {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            profileMsg.innerHTML = '<div class="success-message">Ma\'lumotlar saqlandi</div>';
            setTimeout(() => profileMsg.innerHTML = '', 3000);
            Utils.showToast('Profil yangilandi', 'success');
            // Update display name
            document.getElementById('displayName').innerText = `${payload.first_name} ${payload.last_name}`.trim() || localStorage.getItem('hotel_user');
        } catch (err) {
            profileMsg.innerHTML = `<div class="error-message">Xatolik: ${err.message}</div>`;
        }
    });

    // Save card info
    const cardForm = document.getElementById('cardForm');
    const cardMsg = document.getElementById('cardMessage');
    cardForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            card_number: document.getElementById('cardNumber').value.replace(/\s/g, ''),
            card_holder: document.getElementById('cardHolder').value,
            expiry_date: document.getElementById('expiryDate').value
        };
        // Basic validation
        if (payload.card_number && !/^\d{13,19}$/.test(payload.card_number)) {
            cardMsg.innerHTML = '<div class="error-message">Karta raqami noto‘g‘ri</div>';
            return;
        }
        if (payload.expiry_date && !/^\d{2}\/\d{2}$/.test(payload.expiry_date)) {
            cardMsg.innerHTML = '<div class="error-message">Amal qilish muddati MM/YY formatida bo‘lishi kerak</div>';
            return;
        }
        try {
            await API.request('panel', '/profile/card', {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            cardMsg.innerHTML = '<div class="success-message">Karta ma\'lumotlari saqlandi</div>';
            setTimeout(() => cardMsg.innerHTML = '', 3000);
            Utils.showToast('Karta saqlandi', 'success');
        } catch (err) {
            cardMsg.innerHTML = `<div class="error-message">Xatolik: ${err.message}</div>`;
        }
    });

    // Change password
    const pwdForm = document.getElementById('changePasswordForm');
    const pwdMsg = document.getElementById('passwordMessage');
    pwdForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const current = document.getElementById('currentPassword').value;
        const newPwd = document.getElementById('newPassword').value;
        const confirm = document.getElementById('confirmPassword').value;
        if (newPwd !== confirm) {
            pwdMsg.innerHTML = '<div class="error-message">Yangi parollar mos kelmadi!</div>';
            return;
        }
        if (newPwd.length < 6) {
            pwdMsg.innerHTML = '<div class="error-message">Parol kamida 6 belgidan iborat bo‘lishi kerak!</div>';
            return;
        }
        try {
            await API.request('panel', '/change-password', {
                method: 'POST',
                body: JSON.stringify({ current_password: current, new_password: newPwd })
            });
            pwdMsg.innerHTML = '<div class="success-message">Parol muvaffaqiyatli o‘zgartirildi!</div>';
            pwdForm.reset();
            Utils.showToast('Parol o‘zgartirildi', 'success');
        } catch (err) {
            pwdMsg.innerHTML = `<div class="error-message">Xatolik: ${err.message}</div>`;
        }
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}