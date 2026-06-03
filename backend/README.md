# HotelOS – Real vaqtli mehmonxona boshqaruv tizimi

## Loyiha haqida
HotelOS 5 mikroservis (Reception, Housekeeping, RoomService, Maintenance, Billing) va RBAC asosidagi panel bilan ishlaydigan mehmonxona boshqaruv tizimi.

## Talablar
- Docker va Docker Compose o‘rnatilgan bo‘lishi kerak
- Portlar: 8000-8006, 6379, 5432 bo‘sh bo‘lishi kerak

## Ishga tushirish
```bash
docker-compose up --build
```

## Xizmatlar va portlar
- `panel` – `http://localhost:8000`
- `reception` – `http://localhost:8001`
- `housekeeping` – `http://localhost:8002`
- `roomservice` – `http://localhost:8003`
- `maintenance` – `http://localhost:8004`
- `billing` – `http://localhost:8005`
- `hr` – `http://localhost:8006`

## Umumiy autentifikatsiya
Panel va barcha xizmatlarda JWT token ishlatiladi.
- Login: `POST /login`
- Token: `Bearer <token>`
- Tokenni so‘nggi so‘rovlarda `Authorization` sarlavhasida yuboring.

## Panel (Admin / RBAC panel) API
Panel API asosan foydalanuvchi boshqaruvi, xabarlar, va profil xizmatlarini taqdim etadi.

### Auth va foydalanuvchi
- `POST /login`
  - Kirish va token olish uchun.
  - So‘rovlarga: `username`, `password`.

- `POST /change-password`
  - Parolni o‘zgartirish.
  - Foydalanuvchi o‘z parolini, manager esa boshqalar parolini o‘zgartirishi mumkin.

- `POST /users`
  - Yangi foydalanuvchi yaratish.
  - Faqat `manager` roliga.

- `PUT /users/{username}`
  - Foydalanuvchi ma’lumotlarini yangilash.
  - Faqat `manager` roliga.

- `DELETE /users/{username}`
  - Foydalanuvchini o‘chirish.
  - Faqat `manager` roliga.

- `GET /users`
  - Barcha foydalanuvchilar ro‘yxatini olish.
  - `hr` va `manager` roliga.

- `GET /users/{username}`
  - Foydalanuvchi ma’lumotini olish.
  - `hr` va `manager` roliga.

- `PUT /users/{username}/block`
  - Foydalanuvchini bloklash yoki blokni ochish.
  - `hr` va `manager` roliga.

- `GET /users/{username}/stats`
  - Foydalanuvchi statistikasi.
  - `hr` va `manager` roliga.

### Profil va xabarlar
- `GET /users/messages`
  - Joriy foydalanuvchining xabarlarini olish.

- `PUT /users/messages/{message_id}/read`
  - Xabarga “o‘qildi” statusini berish.

- `GET /admin/messages`
  - Barcha xabarlarni olish.
  - `manager` roliga.

- `POST /admin/messages`
  - Manager xodimlar orasida xabar yuboradi.

- `PUT /admin/messages/{message_id}/read`
  - Manager xabarga o‘qilgan deb belgilaydi.

## HR servisi API
HR servis ishchilarning ma’lumotlari, ish jurnali va maoshlarini boshqaradi.

- `GET /hr/employees`
  - Barcha xodimlarni ko‘rish.
  - `hr` rolini talab qiladi.

- `POST /hr/employees`
  - Yangi xodim yaratish.
  - `hr` rolini talab qiladi.

- `GET /hr/employees/{employee_id}`
  - Bitta xodim ma’lumotini olish.
  - `hr` rolini talab qiladi.

- `PUT /hr/employees/{employee_id}`
  - Xodim ma’lumotlarini yangilash.
  - `hr` rolini talab qiladi.

- `DELETE /hr/employees/{employee_id}`
  - Xodimni o‘chirish.
  - `hr` rolini talab qiladi.

- `POST /hr/employees/{employee_id}/worklogs`
  - Xodim ish vaqtini qo‘shish.
  - `hr` rolini talab qiladi.

- `GET /hr/worklogs`
  - Ish jurnallarini ko‘rish.
  - `hr` rolini talab qiladi.

- `POST /hr/salaries/calculate`
  - Maosh hisoblash.
  - `hr` rolini talab qiladi.
  - Bu endpoint maosh yozuvini yaratish va hisoblash uchun ishlatiladi.

- `GET /hr/salaries`
  - Maosh yozuvlarini ko‘rish.
  - `hr` rolini talab qiladi.

## Reception servisi API
Mehmonlarni joylashtirish, checkout va xona boshqaruvi uchun ishlaydi.

- `POST /reception/checkin`
  - Check-in (mehmonga xona berish).
  - `receptionist` va `manager` rollari uchun.

- `POST /reception/checkout`
  - Check-out (mehmonni chiqarish).
  - `receptionist` va `manager` rollari uchun.

- `GET /reception/rooms`
  - Barcha xonalar holatini ko‘rish.
  - `receptionist` va `manager` rollari uchun.

- `GET /reception/rooms/{room_number}`
  - Bitta xona ma’lumotini olish.
  - `receptionist` rolini talab qiladi.

- `GET /reception/guests`
  - Barcha mehmonlarni ko‘rish.
  - `receptionist` va `manager` rollari uchun.

- `GET /reception/guests/{guest_id}`
  - Bitta mehmon ma’lumotini olish.
  - `receptionist` rolini talab qiladi.

- `PUT /reception/rooms/{room_number}/status`
  - Xona holatini o‘zgartirish.
  - Faqat `manager` roliga.

- `POST /reception/rooms`
  - Yangi xona qo‘shish.
  - `manager` roliga.

- `PUT /reception/rooms/{room_number}`
  - Xona ma’lumotlarini yangilash.
  - `manager` roliga.

- `DELETE /reception/rooms/{room_number}`
  - Xona o‘chirish.
  - `manager` roliga.

## Housekeeping servisi API
Tozalash navbati, statistika va tozalash holatini boshqaradi.

- `POST /housekeeping/start`
  - Xonani tozalashni boshlash.
  - `housekeeping` va `manager` rollari uchun.

- `POST /housekeeping/finish`
  - Tozalashni tugatish.
  - `housekeeping` va `manager` rollari uchun.

- `GET /housekeeping/queue`
  - Tozalash navbatini ko‘rish.
  - `housekeeping` va `manager` rollari uchun.

- `GET /housekeeping/cleaned`
  - Bugungi tozalangan xonalar ro‘yxati.
  - `housekeeping` va `manager` rollari uchun.

- `GET /housekeeping/history`
  - Tozalash tarixini ko‘rish.
  - `housekeeping` va `manager` rollari uchun.

- `GET /housekeeping/schedule`
  - Tozalash jadvalini ko‘rish.
  - `housekeeping` va `manager` rollari uchun.

- `GET /housekeeping/stats`
  - Tozalash statistikasi.
  - `housekeeping` va `manager` rollari uchun.

## RoomService servisi API
Xona xizmatiga buyurtma berish va buyurtma holatini kuzatish uchun.

- `POST /roomservice/orders/create`
  - Yangi buyurtma yaratish.
  - `roomservice` va `manager` rollari uchun.

- `PUT /roomservice/orders/{order_id}/status`
  - Buyurtma holatini yangilash.
  - `roomservice` va `manager` rollari uchun.

- `GET /roomservice/orders/room/{room_id}`
  - Xonaga tegishli buyurtmalarni ko‘rish.
  - `roomservice`, `receptionist`, va `manager` rollari uchun.

- `GET /roomservice/orders`
  - Barcha buyurtmalar ro‘yxatini ko‘rish.
  - `roomservice` va `manager` rollari uchun.

## Maintenance servisi API
Texnik muammolarni yaratish, tayinlash, hal qilish va prioritizatsiya.

- `POST /maintenance/issues/create`
  - Yangi texnik muammo yaratish.
  - `maintenance` rolini talab qiladi.

- `PUT /maintenance/issues/{issue_id}/assign`
  - Muammoni texnik xodimga tayinlash.
  - `maintenance` rolini talab qiladi.

- `PUT /maintenance/issues/{issue_id}/resolve`
  - Muammoni hal qilingan deb belgilash.
  - `maintenance` rolini talab qiladi.

- `GET /maintenance/priority/queue`
  - Ustuvorlik navbatini ko‘rish.
  - `maintenance` rolini talab qiladi.

- `GET /maintenance/priority/limits`
  - Prioritet vaqt chegaralarini olish.
  - `maintenance` rolini talab qiladi.

- `PUT /maintenance/priority/limits`
  - Prioritet vaqt chegaralarini yangilash.
  - `maintenance` rolini talab qiladi.

- `GET /maintenance/performance`
  - Texnik xodimlar samaradorligini ko‘rish.
  - `maintenance` rolini talab qiladi.

- `GET /maintenance/issues`
  - Barcha muammolar ro‘yxatini ko‘rish.
  - `maintenance` va `manager` rollari uchun.

## Billing servisi API
Mehmon hisobi, qo‘shimcha xizmatlar va chegirmalar.

- `GET /billing/{guest_id}`
  - Guest hisobini ko‘rish.
  - `receptionist` va `manager` rollari uchun.

- `POST /billing/add`
  - Hisobga qo‘shimcha to‘lov qo‘shish.
  - `receptionist` va `manager` rollari uchun.

- `POST /billing/discount`
  - Chegirma qo‘llash.
  - Faqat `manager` rolini talab qiladi.

- `POST /billing/finalize`
  - Hisobni yopish.
  - `receptionist` va `manager` rollari uchun.

## Qo‘shimcha eslatmalar
- `panel` `static` va SPA manzillari bilan ishlaydi: `GET /`, `GET /dashboard`, va umumiy `GET /{full_path:path}`.
- Har bir mikroservis `health` endpointiga ega: masalan, `GET /health`.
- Servislar PostgreSQL va Redis bilan bog‘lanadi; bu backendda sessiyalar, xabarlar va ma’lumotlar saqlanishini ta’minlash uchun ishlatiladi.

## Foydalanish
- `manager` — foydalanuvchi boshqaruvi, xona boshqaruvi, xabarlar, chegirmalar.
- `receptionist` — check-in/check-out, mehmon va xona boshqaruvi, hisob-kitob.
- `housekeeping` — tozalash navbatlari, tozalash holati va statistikani boshqarish.
- `roomservice` — buyurtma yaratish va buyurtma holatini yangilash.
- `maintenance` — texnik muammolarni yaratish, tayinlash, hal qilish, samaradorlik va prioritetlarni boshqarish.
- `hr` — xodimlar, ish jurnali va maosh yozuvlarini boshqarish.
