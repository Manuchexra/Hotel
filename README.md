# HotelOS Frontend

## Umumiy ko'rinish

`frontend/` papkasi HotelOS loyihasining brauzer tomonini o'z ichiga oladi. U `index.html`, interaktiv JavaScript modullari, CSS uslublari va xizmatlar bazasi bilan birgalikda ishlaydigan sahifalaradan iborat.

## Tuzilishi

- `frontend/index.html` — asosiy kirish nuqtasi.
- `frontend/js/app.js` — rolga asoslangan marshrutlash, menyu yaratish va sahifalarni dinamik yuklash.
- `frontend/js/api.js` — backend mikroservislariga HTTP so'rovlarini yuboradi.
- `frontend/js/auth.js` — foydalanuvchi autentifikatsiyasi, token saqlash va chiqish funksionalligi.
- `frontend/js/utils.js` — yordamchi funksiyalar, xatolikni ko'rsatish va baza URL konfiguratsiyasi.
- `frontend/js/websocket.js` — real vaqtda bildirishnomalar va kuzatuvlarni boshqarish uchun veb-socket logikasi.
- `frontend/js/pages/` — har bir xizmat uchun alohida sahifa modullari joylashgan.
- `frontend/assets/css/` — umumiy va rolga mos uslublar.

## Frontend arxitekturasi

### `index.html`

- Sahifa `uz` tilida.
- Google Fonts va Font Awesome ikonkalari ishlatilgan.
- `style.css` umumiy uslublar uchun yuklanadi.
- `#role-css` identifikatorli `<link>` elementi sahifa yoki foydalanuvchi roliga qarab dinamika tarzda o'zgartiriladi.
- JavaScript fayllari quyidagi ketma-ketlikda yuklanadi:
  - `utils.js`
  - `api.js`
  - `auth.js`
  - `websocket.js`
  - `app.js`

### `js/app.js`

- `routes` obyekti orqali har bir URL path uchun kerakli sahifa va rol belgilanadi.
- `loadPage(path)` funktsiyasi:
  - sahifa yo'qligini tekshiradi,
  - foydalanuvchi roliga ruxsat borligini tekshiradi,
  - sahifani dinamik `import()` yordamida yuklaydi.
- `renderLayout()` umumiy app layoutini quradi, yon panelni yaratadi, va profil hamda chiqish tugmalarini qo'shadi.
- `getMenuItems(role)` har bir rol uchun alohida navigatsiya menyusini beradi.
- Rolga mos CSS fayllarini avtomatik yuklaydi:
  - `manager` → `/css/admin.css`
  - `hr` → `/css/hr.css`
  - `receptionist` → `/css/reception.css`
  - `housekeeping` → `/css/housekeeping.css`
  - `roomservice` → `/css/roomservice.css`
  - `maintenance` → `/css/maintenance.css`

### `js/api.js`

- `API.request(service, endpoint, options)` barcha HTTP so'rovlarini amalga oshiradi.
- `Utils.getBaseUrl(service)` orqali xizmat manzillari har bir mikroservisga bog‘lanadi:
  - `panel`: `http://localhost:8000`
  - `reception`: `http://localhost:8001`
  - `housekeeping`: `http://localhost:8002`
  - `roomservice`: `http://localhost:8003`
  - `maintenance`: `http://localhost:8004`
  - `billing`: `http://localhost:8005`
- `API` obyekti autentifikatsiya tokenini `Authorization: Bearer` sarlavhasi sifatida yuboradi.
- Frontend quyidagi xizmatlar uchun so'rovlar yuboradi:
  - `login`, `getUsers`, `getUser`
  - `reception` xonalar, check-in, check-out, mehmonlar
  - `housekeeping` tozalash jarayoni va tarix
  - `roomservice` buyurtma yaratish, statusni yangilash, xona bo'yicha buyurtmalar
  - `maintenance` muammolar, ustuvorliklar, texnik xizmatlar
  - `billing` hisob-kitoblar, chegirmalar
  - `messages` va bildirishnomalar

### `js/auth.js`

- Token va foydalanuvchi ma'lumotlarini `localStorage`da saqlaydi:
  - `hotel_token`
  - `hotel_user`
  - `hotel_role`
- `init()` sahifa yuklanganda mavjud tokenni tekshiradi.
- `login(username, password)` panel backendga so'rov yuboradi va token oladi.
- `logout()` tokenlarni o'chiradi, websocketni yopadi va foydalanuvchini login sahifasiga yo'naltiradi.
- `getRole()` va `isAuthenticated()` yordamchi metodlar orqali rol va autentifikatsiya holati aniqlanadi.

### `js/utils.js`

- DOM element yaratish va xabar ko'rsatish uchun umumiy yordamchi funksiyalar.
- `handleError` xatolikni konsolga chop etadi va toast orqali foydalanuvchiga ko'rsatadi.
- `getBaseUrl(service)` frontendni backend mikroservislari portlariga bog'laydi.

## Sahifalar va rollar

`frontend/js/pages/` papkasi quyidagi modul tuzilmasiga ega:

- `admin/` — boshqaruv paneli, xonalar, hisobotlar, xodimlar, mijozlar, sozlamalar.
- `hr/` — HR dashboard, xodimlar, maoshlar.
- `reception/` — qabul paneli, check-in, mehmonlar, billing, xonalar boshqaruvi.
- `housekeeping/` — tozalash dashboardi, tarix, jadval, statistika.
- `maintenance/` — texnik xizmat, muammo tarixi, ustuvorliklar, samaradorlik.
- `roomservice/` — xona xizmati dashboardi, menyu, buyurtma tarixi, xona bo'yicha buyurtmalar.

Bu sahifa modullari `app.js` orqali dinamik yuklanadi va har bir rolga maxsus menyular taqdim etadi.

## Har bir sahifa haqida batafsil

### Admin sahifalari
- `/admin` — boshqaruv paneli.
  - Xonalar, tozalash navbati, faol muammolar va kunlik daromad statistikalarini ko‘rsatadi.
  - `API.getRooms()`, `API.getCleaningQueue()`, `API.getIssues()`, `API.getOrders()` orqali ma’lumot oladi.
  - `Chart.js` grafiklarni chizadi.
  - WebSocket hodisalari (`room.status.update`, `cleaning.queue.updated`, `issue.resolved`, `order.status.updated`) kelganda ma’lumotlarni yangilaydi.

- `/admin/rooms` — xonalar ro‘yxati va boshqaruvi.
  - Xonalarni ro‘yxat ko‘rinishida ko‘rsatadi.
  - Yangi xona qo‘shish, xona ma’lumotlarini tahrirlash va o‘chirish uchun modal oynalar ishlaydi.
  - `API.getRooms()`, `API.createRoom()`, `API.updateRoom()`, `API.deleteRoom()` chaqiriladi.
  - Backend mavjud bo‘lmasa, lokal saqlash (localStorage) fallback funksionalligi ishlashi mumkin.

- `/admin/reports` — hisobotlar bo‘limi.
  - Davrni tanlash, maxsus sana diapazonini qo‘llash va CSV eksport qilish imkoniyati mavjud.
  - `API.getRooms()`, `API.getOrders()`, `API.getIssues()` ma’lumotlarini o‘qib, bandlik, buyurtma va muammo statistikalarini hisoblaydi.
  - Hisobot jadvali va grafiklar yaratadi.

- `/admin/staff` — xodimlar / foydalanuvchilar boshqaruvi.
  - Foydalanuvchi roli, holati va to‘liq statistikani ko‘rsatadi.
  - Foydalanuvchini yaratish, tahrirlash, bloklash/aktivlash va xabar yuborish funksiyalari.
  - `panel` xizmatidan real `GET /users`, `POST /users`, `PUT /users/{username}`, `PUT /users/{username}/block` va xabar API’lari ishlatiladi.

- `/admin/customers` — mijozlar / mehmonlar boshqaruvi.
  - Mehmonlar ro‘yxatini yuklaydi, qidiradi va filtrlaydi.
  - Har bir mehmon uchun xona va billing ma’lumotlarini ko‘rsatadi.
  - `API.getGuests()`, `API.getRooms()`, `API.getBill()` ishlatiladi.

- `/admin/settings` — tizim sozlamalari.
  - Xona narxlari, chegirmalar, RBAC huquqlari, til va valyuta sozlamalari mavjud.
  - Sozlamalar localStorage`ga saqlanadi va agar mavjud bo‘lsa, backendga `API.updateSettings()` orqali ham yuborilishi mumkin.
  - WebSocket va yangilanish oralig‘i kabi konfiguratsiyalarni boshqaradi.

### HR sahifalari
- `/hr` — HR dashboardi.
  - Xodimlar soni, jami maoshlar, o‘rtacha maosh va oylik maosh dinamikasi grafiklari.
  - `panel` servisi orqali `GET /users` va `GET /admin/salaries` ma’lumotlarini yuklaydi.

- `/hr/staff` — HR xodimlar ro‘yxati.
  - Xodimlarni qidirish, filtrlar bo‘yicha saralash va tafsilotlar modalini ko‘rsatish.
  - Ishga qabul qilish sanasi, bo‘lim va holat kabi ma’lumotlarni taqdim etadi.

- `/hr/payroll` — maosh hisoblash.
  - Xodim va oy tanlanadi, qo‘shimcha vaqt va bonus kiritiladi.
  - Hisoblash natijalari ko‘rsatiladi va `POST /admin/salary/calculate` orqali saqlanadi.
  - Maosh tarixi jadvali qidirish va filtrlash bilan ko‘rsatiladi.

### Reception sahifalari
- `/reception` — qabul paneli.
  - Xonalar grid ko‘rinishida ko‘rsatiladi va ularning holati yangilanadi.
  - Tezkor check-in tugmasi orqali `/reception/checkin` sahifasiga o‘tadi.
  - WebSocket yordamida xona statuslarini dinamika yangilaydi.

- `/reception/checkin` — yangi mehmonni joylashtirish.
  - Ism, xona turi, afzal qavat, kechalar soni va narx kiritiladi.
  - `API.checkin()` chaqirilib, backendga yangi check-in yuboradi.

- `/reception/guests` — joriy mehmonlar ro‘yxati.
  - Mehmonlar jadvalini ko‘rsatadi va `guest.checked_in` / `guest.checked_out` hodisalarini tinglaydi.
  - Har bir mehmon uchun billing sahifasiga o‘tish imkoniyati mavjud.

- `/reception/billing` — billing / hisob-kitob sahifasi.
  - Mehmon ID yoki tanlangan mehmon orqali hisob yuklanadi.
  - `API.getBill(guestId)` orqali hisob tafsilotlarini oladi.
  - Check-out tugmasi orqali `API.checkout()` chaqiriladi.

- `/reception/room-management` — xona holatini boshqarish.
  - Xona holatini ko‘rsatadi va yangilash uchun forma beradi.
  - Serverda `API.updateRoomStatus()` endpointi mavjud bo‘lsa, uni chaqiradi; aks holda foydalanuvchiga backendda kerakli API qo‘shish zarurligini bildiradi.

### Housekeeping sahifalari
- `/housekeeping` — tozalash dashboardi.
  - Tozalash navbati, bugungi tozalangan xonalar va holatini o‘zgartirish panellari mavjud.
  - `API.startCleaning()`, `API.finishCleaning()` va `API.getCleaningQueue()` orqali tozalash jarayoni nazorat qilinadi.
  - `cleaning.queue.updated` va `room.status.update` hodisalari kelganda sahifa yangilanadi.

- `/housekeeping/history` — tozalash tarixi.
  - `API.request('housekeeping', '/housekeeping/history')` dan tarixni yuklaydi.
  - Xona raqami va sana bo‘yicha qidirish va filtr qo‘llanadi.

- `/housekeeping/schedule` — tozalash jadvali.
  - `API.request('housekeeping', '/housekeeping/schedule')` orqali jadvalni ko‘rsatadi.
  - Sana bo‘yicha filtr va jadval ko‘rinishi mavjud.

- `/housekeeping/stats` — statistik ma’lumotlar.
  - `API.request('housekeeping', '/housekeeping/stats?period=...')` orqali kunlik, haftalik va oylik statistikani oladi.
  - Grafik yoki jadval tarzida natija taqdim etiladi.

### RoomService sahifalari
- `/roomservice` — xona xizmati dashboardi.
  - Faol buyurtmalar va bugungi yetkazilganlar soni ko‘rsatiladi.
  - Yangi buyurtma modal oynasi orqali buyurtma yaratiladi.
  - Buyurtma holatini o‘zgartirish orqali `API.updateOrderStatus()` ishlatiladi.

- `/roomservice/menu` — menyu.
  - Statik menyu elementlari mavjud.
  - Xona raqami so‘raladi va `API.createOrder()` orqali buyurtma yuboriladi.

- `/roomservice/history` — buyurtma tarixi.
  - `API.getOrders()` orqali barcha buyurtmalarni yuklaydi.
  - Xona, holat va sanaga ko‘ra filtrlanadi.

- `/roomservice/by-room` — xona bo‘yicha buyurtmalar.
  - Xona raqamiga qarab buyurtmalarni qidiradi.
  - `API.getOrdersByRoom(roomId)` va `API.getRooms()` dan xona ma’lumotini ko‘rsatadi.

### Umumiy sahifalar
- `/profile` — foydalanuvchi profili.
  - `API.request('panel', '/profile')` orqali shaxsiy ma’lumotlar va karta ma’lumotlarini oladi.
  - Avatarni yuklash, profilni yangilash va parolni o‘zgartirish funksiyalari bor.
  - Parol o‘zgartirish uchun `API.request('panel', '/change-password')` ishlatiladi.

- `/notifications` — bildirishnomalar.
  - `API.getMyMessages()` orqali shaxsiy xabarlar yuklanadi.
  - WebSocket hodisalari `localStorage`ga saqlanadi va tizim bildirishnomalari sifatida ko‘rinadi.
  - Xabarni o‘qilgan deb belgilash va tizim bildirishnomalarini o‘chirish mavjud.

## CSS va dizayn

- `frontend/assets/css/style.css` — umumiy dizayn uchun asosiy uslublar.
- `frontend/assets/css/admin.css` — boshqaruv paneli uchun maxsus ranglar va kosmik ko'rinish.
- `frontend/assets/css/hr.css` — HR bo'limi uchun maxsus ranglar.
- `frontend/assets/css/reception.css` — qabul bo'limi uslublari.
- `frontend/assets/css/housekeeping.css` — tozalash bo'limi uslublari.
- `frontend/assets/css/roomservice.css` — xona xizmati bo'limi uslublari.
- `frontend/assets/css/maintenance.css` — texnik xizmat uchun maxsus uslublar.

## Ishga tushirish

1. Backend mikroservislarini ishga tushiring (`backend/docker-compose.yml` orqali yoki har bir xizmatni alohida):
   - `panel`: `http://localhost:8000`
   - `reception`: `http://localhost:8001`
   - `housekeeping`: `http://localhost:8002`
   - `roomservice`: `http://localhost:8003`
   - `maintenance`: `http://localhost:8004`
   - `billing`: `http://localhost:8005`

2. `frontend/` papkasini statik serverga ulang. Masalan:

```bash
cd frontend
python -m http.server 8080
```

3. Brauzerda `http://localhost:8080` manziliga o'ting.

4. Login qilgandan so'ng foydalanuvchi roliga mos bo'lgan sahifalar va menyular avtomatik ravishda yuklanadi.

## Muhim eslatma

- Frontend `api.js` faylida backend portlari aniq belgilangan, agar backend portlari o'zgarsa, `Utils.getBaseUrl()`ni moslashtiring.
- Har bir bo'lim uchun sahifa fayllari `js/pages/` papkasida joylashgan, shuning uchun yangi bo'lim qo'shmoqchi bo'lsangiz, shu joyga yangi modul faylini qo'ying.
- Navbat va sahifa ruxsatlari `app.js`dagi `routes` va `getMenuItems()` orqali boshqariladi.
