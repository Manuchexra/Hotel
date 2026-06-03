#!/usr/bin/env python3
"""
HotelOS test ma'lumotlarini yuklash skripti.
Ishlatish: python common/seed.py
"""

import sys
import time
import random
import subprocess
from datetime import datetime, timedelta

try:
    import requests
except ImportError:
    print("❌ requests topilmadi. pip install requests")
    sys.exit(1)

try:
    from faker import Faker
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "faker"])
    from faker import Faker

fake = Faker("uz_UZ")
Faker.seed(42)
random.seed(42)

# ─────────────────────── SOZLAMALAR ──────────────────────────
PANEL_URL        = "http://panel:8000"
RECEPTION_URL    = "http://reception:8000"
HOUSEKEEPING_URL = "http://housekeeping:8000"
ROOMSERVICE_URL  = "http://roomservice:8000"
MAINTENANCE_URL  = "http://maintenance:8000"
BILLING_URL      = "http://billing:8000"
HR_URL           = "http://hr:8000"

ADMIN_USER = "admin"
ADMIN_PASS = "admin123"

# 5 qavat × 10 xona = 50 ta xona
ROOM_TYPE_CYCLE = [
    "bir kishilik", "ikki kishilik", "ikki kishilik",
    "lyuks", "nogiron", "ikki kishilik",
    "bir kishilik", "lyuks", "ikki kishilik", "nogiron",
]

ROOM_PRICES = {
    "bir kishilik":  [80_000, 90_000, 100_000],
    "ikki kishilik": [120_000, 140_000, 160_000],
    "lyuks":         [250_000, 300_000, 350_000],
    "nogiron":       [90_000, 100_000, 110_000],
}

# Xona turi bo'yicha nechta mehmon (jami 40 ta)
CHECKIN_PER_TYPE = {
    "bir kishilik":  8,
    "ikki kishilik": 16,
    "lyuks":         8,
    "nogiron":       8,
}

ROLES = ["receptionist", "housekeeping", "roomservice", "maintenance", "hr"]

MENU_ITEMS = [
    ("Qahva", 3_000), ("Choy", 2_000), ("Sendvich", 8_000), ("Pirog", 5_000),
    ("Suv", 1_500), ("Sharbat", 4_000), ("Manti", 15_000), ("Salad", 10_000),
    ("Muzqaymoq", 3_500), ("Burger", 18_000), ("Pitsa", 28_000),
    ("Shorva", 12_000), ("Lag'mon", 16_000), ("Palov", 20_000),
    ("Kompot", 3_000), ("Mineral suv", 2_500), ("Kakao", 4_500),
]

ISSUE_DESCS = [
    "Kran suv oqizmoqda", "Konditsioner ishlamayapti", "Lampochka yonmayapti",
    "TV ishlamayapti", "Eshik qulfi sinib qolgan", "Wi-Fi yo'q",
    "Sovutgich ishlamayapti", "Dush bosimi past", "Tualet tiqilib qolgan",
    "Rozetka ishlamayapti", "Radiator issiq emas", "Deraza oynasi singan",
    "Lift ishlamayapti", "Issiq suv yo'q", "Balkon eshigi yopilmaydi",
    "Telefon ishlamayapti", "Seif ochilmayapti", "Parda tushib ketgan",
]

# OrderStatus enum qiymatlari (models.py dan)
ORDER_STATUSES = ["Qabul qilindi", "Tayyorlanmoqda", "Yetkazilmoqda", "Yetkazildi"]

DEMO_GUEST = {
    "guest_name":           "Sardor Toshmatov",
    "room_type":            "lyuks",
    "preferred_floor":      3,
    "near_lift":            True,
    "nights":               3,
    "room_price_per_night": 300_000,
}

# ─────────────────────── YORDAMCHILAR ────────────────────────
def log(msg, level="info"):
    c = {
        "info":    "\033[94m",
        "success": "\033[92m",
        "error":   "\033[91m",
        "warn":    "\033[93m",
        "reset":   "\033[0m",
    }
    print(f"{c.get(level,'')}{msg}{c['reset']}", flush=True)


def wait(url, retries=40, delay=3):
    for i in range(retries):
        try:
            r = requests.get(f"{url}/health", timeout=3)
            if r.status_code == 200:
                log(f"   ✅ {url} tayyor", "success")
                return True
        except Exception:
            pass
        log(f"   ⏳ {url} kutilmoqda ({i+1}/{retries})...", "warn")
        time.sleep(delay)
    log(f"   ❌ {url} javob bermadi!", "error")
    return False


def get_token():
    """Admin token olish"""
    for attempt in range(5):
        try:
            r = requests.post(
                f"{PANEL_URL}/login",
                json={"username": ADMIN_USER, "password": ADMIN_PASS},
                timeout=10,
            )
            if r.status_code == 200:
                return r.json()["access_token"]
            log(f"   Login xatosi ({attempt+1}): {r.status_code} {r.text[:80]}", "warn")
        except Exception as e:
            log(f"   Login urinish {attempt+1} xato: {e}", "warn")
        time.sleep(2)
    raise Exception("Admin token olinmadi!")


def api(method, url, tok, data=None, silent=False):
    """HTTP so'rov yuborish, xatolarni hisobga olgan holda"""
    headers = {"Authorization": f"Bearer {tok}"}
    try:
        r = requests.request(method, url, headers=headers, json=data, timeout=15)
        if r.status_code not in (200, 201):
            if not silent:
                log(f"   ⚠️  {method} {url.split('/')[-2:]}: {r.status_code} — {r.text[:120]}", "warn")
            return None
        return r.json() if r.text.strip() else {}
    except Exception as e:
        if not silent:
            log(f"   ⚠️  {method} {url}: {e}", "warn")
        return None


# ─────────────────────── ASOSIY JARAYON ──────────────────────
def main():
    log("=" * 65, "success")
    log("🚀  HotelOS seed boshlandi", "success")
    log("=" * 65, "success")

    # ── 1. Barcha servislar tayyor bo'lishini kutish ──
    log("\n⏳ Servislar tekshirilmoqda...")
    for svc_url in [PANEL_URL, RECEPTION_URL, HOUSEKEEPING_URL,
                    ROOMSERVICE_URL, MAINTENANCE_URL, BILLING_URL, HR_URL]:
        if not wait(svc_url):
            log(f"❌ {svc_url} ishga tushmadi, seed to'xtatildi", "error")
            sys.exit(1)
    log("✅ Barcha servislar tayyor!\n", "success")

    tok_ = get_token()
    log("✅ Admin token olindi\n", "success")

    # ── 2. XONALAR ──────────────────────────────────────────
    log("🏠 Xonalar yaratilmoqda (5 qavat × 10 = 50 ta)...")
    existing_rooms = api("GET", f"{RECEPTION_URL}/reception/rooms", tok_, silent=True) or []
    existing_nums  = {r["number"] for r in existing_rooms if isinstance(r, dict)}
    rooms_created  = 0

    for floor in range(1, 6):
        for pos in range(1, 11):
            room_no = floor * 100 + pos
            if room_no in existing_nums:
                continue
            rtype = ROOM_TYPE_CYCLE[(pos - 1) % 10]
            # RoomCreate schemasi: number, floor, type, status (distance_to_lift yo'q)
            r = api("POST", f"{RECEPTION_URL}/reception/rooms", tok_, {
                "number": room_no,
                "floor":  floor,
                "type":   rtype,
                "status": "toza",
            })
            if r:
                rooms_created += 1
                log(f"   Xona {room_no} ({rtype}, {floor}-qavat) ✓")
            time.sleep(0.05)

    all_rooms = api("GET", f"{RECEPTION_URL}/reception/rooms", tok_, silent=True) or []
    room_numbers = [r["number"] for r in all_rooms if isinstance(r, dict)]
    log(f"✅ {len(all_rooms)} ta xona (yangi: {rooms_created})\n", "success")

    # ── 3. XODIMLAR (panel users) ───────────────────────────
    log("👥 Xodimlar yaratilmoqda (har roldan 3 ta)...")
    users = []
    for role in ROLES:
        for i in range(1, 4):
            uname = f"{role[:10]}{i}"   # username 10 belgidan oshmasin
            fname = fake.name()
            # POST /users → require_role("manager") → admin token bilan ishlaydi
            r = api("POST", f"{PANEL_URL}/users", tok_, {
                "username": uname,
                "fullname": fname,
                "role":     role,
                "password": "pass123",
            }, silent=True)
            if r and r.get("username"):
                log(f"   {uname} ({role}) ✓")
            else:
                log(f"   {uname} allaqachon mavjud yoki xato", "warn")
                fname = uname   # fallback
            users.append({"username": uname, "role": role, "fullname": fname})
            time.sleep(0.05)
    log(f"✅ {len(users)} ta xodim (15 ta)\n", "success")

    # ── 4. HR XODIMLARI (Employee jadvaliga) ────────────────
    log("👔 HR employees yaratilmoqda...")
    salary_by_role = {
        "receptionist": (15_000,  0),
        "housekeeping": (0,  8_000_000),
        "roomservice":  (0,  9_000_000),
        "maintenance":  (0, 10_000_000),
        "hr":           (0, 12_000_000),
    }
    hr_employees = []
    for u in users:
        hourly, monthly = salary_by_role.get(u["role"], (0, 8_000_000))
        emp = api("POST", f"{HR_URL}/hr/employees", tok_, {
            "fullname":       u["fullname"],
            "role":           u["role"],
            "hourly_rate":    float(hourly),
            "monthly_salary": float(monthly),
            "active":         True,
        }, silent=True)
        if emp and emp.get("id"):
            hr_employees.append(emp)
            log(f"   HR xodim: {u['username']} → id={emp['id'][:8]}...")
        else:
            log(f"   HR xodim {u['username']} yaratilmadi (allaqachon bor?)", "warn")
        time.sleep(0.05)
    log(f"✅ {len(hr_employees)} ta HR xodim\n", "success")

    # ── 5. MAOSH (6 oy) ─────────────────────────────────────
    log("💰 Ishlar vaqtlari va maosh hisobi (6 oy × xodim)...")
    salary_count = 0
    for emp in hr_employees[:12]:   # birinchi 12 ta xodim uchun
        eid = emp.get("id")
        if not eid:
            continue
        for month_back in range(1, 7):
            base_date = datetime.now() - timedelta(days=30 * month_back)
            month_str  = base_date.strftime("%Y-%m")
            # Haftalar bo'yicha worklog
            for week in range(4):
                work_date = base_date + timedelta(days=week * 7)
                api("POST", f"{HR_URL}/hr/employees/{eid}/worklogs", tok_, {
                    "date":           work_date.strftime("%Y-%m-%d"),
                    "hours_worked":   float(random.choice([8, 9, 10])),
                    "overtime_hours": float(random.choice([0, 0, 1, 2])),
                    "bonus":          float(random.choice([0, 0, 100_000, 200_000])),
                }, silent=True)
            # Maosh hisoblash
            sal = api("POST", f"{HR_URL}/hr/salaries/calculate", tok_, {
                "employee_id": eid,
                "month":       month_str,
            }, silent=True)
            if sal and sal.get("id"):
                salary_count += 1
            time.sleep(0.03)
    log(f"✅ {salary_count} ta maosh yozuvi\n", "success")

    # ── 6. MEHMONLAR JOYLASHTIRISH ───────────────────────────
    log("🏨 Mehmonlar joylashtirilmoqda (xona turlariga mos)...")
    guests = []
    total_checkins = 0

    for rtype, count in CHECKIN_PER_TYPE.items():
        type_ok = 0
        for _ in range(count):
            r = api("POST", f"{RECEPTION_URL}/reception/checkin", tok_, {
                "guest_name":           fake.name(),
                "room_type":            rtype,
                "preferred_floor":      random.choice([None, 1, 2, 3, 4, 5]),
                "near_lift":            random.choice([True, False]),
                "nights":               random.randint(1, 10),
                "room_price_per_night": float(random.choice(ROOM_PRICES[rtype])),
            })
            if r and r.get("success"):
                guest = {
                    "id":       r["guest_id"],
                    "name":     r["guest_name"],
                    "room":     r["room_number"],
                    "login":    r.get("login",    f"guest_{r['room_number']}"),
                    "password": r.get("password", f"room{r['room_number']}"),
                }
                guests.append(guest)
                type_ok += 1
                total_checkins += 1
                log(f"   {r['guest_name']} → xona {r['room_number']} ({rtype})")
            else:
                log(f"   ⚠️  {rtype} uchun xona topilmadi yoki to'liq", "warn")
            time.sleep(0.05)
        log(f"   {rtype}: {type_ok}/{count} ✓", "success" if type_ok == count else "warn")

    log(f"✅ {total_checkins} ta mehmon joylashtirildi\n", "success")

    # ── 7. DEMO MEHMON ──────────────────────────────────────
    log("👤 Demo mehmon (Sardor Toshmatov, lyuks)...")
    demo = None
    r = api("POST", f"{RECEPTION_URL}/reception/checkin", tok_, DEMO_GUEST)
    if r and r.get("success"):
        demo = {
            "name":     r["guest_name"],
            "room":     r["room_number"],
            "login":    r.get("login",    f"guest_{r['room_number']}"),
            "password": r.get("password", f"room{r['room_number']}"),
        }
        guests.append({
            "id":   r["guest_id"],
            "name": r["guest_name"],
            "room": r["room_number"],
        })
        log(f"   ✅ {demo['name']} → xona {demo['room']}", "success")
        log(f"   Login: {demo['login']}  |  Parol: {demo['password']}", "success")
    else:
        log("   ⚠️  Demo mehmon joylashtirilmadi (lyuks xonalar to'liq bo'lishi mumkin)", "warn")
    print()

    if not guests:
        log("⚠️  Mehmon yo'q — buyurtma va muammo qo'shilmaydi", "warn")

    # ── 8. XONA XIZMATI BUYURTMALARI (300 ta) ───────────────
    log("🍽️  Xona xizmati buyurtmalari (300 ta)...")
    order_count = 0
    if guests:
        for i in range(300):
            g = random.choice(guests)
            items = [
                {"name": name, "price": float(price)}
                for name, price in random.choices(MENU_ITEMS, k=random.randint(1, 4))
            ]
            r = api("POST", f"{ROOMSERVICE_URL}/roomservice/orders/create", tok_, {
                "room_id":  g["room"],
                "guest_id": g["id"],
                "items":    items,
            }, silent=True)
            if r and r.get("order_id"):
                oid = r["order_id"]
                order_count += 1
                # Tasodifiy holat yangilash (Qabul qilindi allaqachon default)
                new_status = random.choice(ORDER_STATUSES[1:])  # 1..3
                api("PUT", f"{ROOMSERVICE_URL}/roomservice/orders/{oid}/status",
                    tok_, {"status": new_status}, silent=True)
                if i % 75 == 0:
                    log(f"   {order_count} ta buyurtma qo'shildi...")
            time.sleep(0.02)
    log(f"✅ {order_count} ta buyurtma\n", "success")

    # ── 9. TEXNIK MUAMMOLAR (200 ta) ────────────────────────
    log("🔧 Texnik muammolar (200 ta)...")
    issue_count = 0
    rnums = room_numbers if room_numbers else [g["room"] for g in guests]
    if rnums:
        for i in range(200):
            r = api("POST", f"{MAINTENANCE_URL}/maintenance/issues/create", tok_, {
                "room_id":     random.choice(rnums),
                "description": random.choice(ISSUE_DESCS),
                "priority":    random.choice(["Kritik", "Yuqori", "Normal", "Past"]),
            }, silent=True)
            if r and r.get("issue_id"):
                iid = r["issue_id"]
                issue_count += 1
                # 60% tayinlash
                if random.random() < 0.6:
                    tech = random.choice(users)["username"]
                    assigned = api(
                        "PUT",
                        f"{MAINTENANCE_URL}/maintenance/issues/{iid}/assign",
                        tok_,
                        {"technician_name": tech},
                        silent=True,
                    )
                    # Tayinlangan bo'lsa 65% hal qilish
                    if assigned and random.random() < 0.65:
                        api(
                            "PUT",
                            f"{MAINTENANCE_URL}/maintenance/issues/{iid}/resolve",
                            tok_,
                            silent=True,
                        )
                if i % 50 == 0:
                    log(f"   {issue_count} ta muammo...")
            time.sleep(0.02)
    log(f"✅ {issue_count} ta texnik muammo\n", "success")

    # ── 10. TOZALASH (iflos xonalar) ─────────────────────────
    log("🧹 Xonalar tozalanmoqda...")
    cleaned_count = 0
    fresh_rooms = api("GET", f"{RECEPTION_URL}/reception/rooms", tok_, silent=True) or []
    dirty_rooms  = [
        r["number"] for r in fresh_rooms
        if isinstance(r, dict) and r.get("status") == "iflos"
    ]
    for rn in dirty_rooms[:40]:
        started = api("POST", f"{HOUSEKEEPING_URL}/housekeeping/start", tok_,
                      {"room_id": rn}, silent=True)
        if started:
            if random.random() < 0.75:
                api("POST", f"{HOUSEKEEPING_URL}/housekeeping/finish", tok_,
                    {"room_id": rn}, silent=True)
                cleaned_count += 1
        time.sleep(0.03)
    log(f"✅ {cleaned_count} ta xona tozalandi\n", "success")

    # ── XULOSA ───────────────────────────────────────────────
    log("=" * 65, "success")
    log("🏨  HotelOS seed muvaffaqiyatli yakunlandi!", "success")
    log("=" * 65, "success")
    log(f"   🏠  Xonalar:      {len(all_rooms)} ta  (5 qavat × 10)", "info")
    log(f"   👷  Xodimlar:     {len(users)} ta  (har roldan 3 ta)", "info")
    log(f"   👔  HR xodimlar:  {len(hr_employees)} ta", "info")
    log(f"   💰  Maosh:        {salary_count} ta yozuv", "info")
    log(f"   🏨  Mehmonlar:    {total_checkins} ta  (xona sig'imiga mos)", "info")
    log(f"   🍽️   Buyurtmalar:  {order_count} ta", "info")
    log(f"   🔧  Muammolar:    {issue_count} ta", "info")
    log(f"   🧹  Tozalashlar:  {cleaned_count} ta", "info")
    log("", "info")
    log("  ── Default login / parollar ──", "success")
    log("   admin        / admin123    → manager", "success")
    log("   reception    / rec123      → receptionist", "success")
    log("   house        / house123    → housekeeping", "success")
    log("   rs           / rs123       → roomservice", "success")
    log("   mtc          / mtc123      → maintenance", "success")
    log("   hr           / hr123       → hr", "success")
    log("   receptioni1..3 / pass123   → receptionist", "success")
    log("   housekeepin1..3/ pass123   → housekeeping", "success")
    log("   roomservice1..3/ pass123   → roomservice", "success")
    log("   maintenanc1..3 / pass123   → maintenance", "success")
    log("   hr1..3         / pass123   → hr", "success")
    if demo:
        log("", "info")
        log("  ── Demo mehmon (guest paneli) ──", "success")
        log(f"   Ism:    {demo['name']}", "success")
        log(f"   Xona:   {demo['room']}", "success")
        log(f"   Login:  {demo['login']}", "success")
        log(f"   Parol:  {demo['password']}", "success")
        log(f"   URL:    http://localhost:3011/login.html", "success")
    log("=" * 65, "success")


if __name__ == "__main__":
    main()
