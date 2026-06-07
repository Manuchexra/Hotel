"""
HotelOS — Seed Script
Har bir jadvalga kamida 50 ta ma'lumot qo'shadi:
  - rooms            (50 xona, 5 qavat × 10)
  - guests           (50 mehmon)
  - menu_items       (50 ta taom)
  - room_service_orders (60 ta buyurtma)
  - maintenance_issues  (55 ta muammo)
  - bills + bill_items  (50 ta hisob)
"""

import os
import sys
import time
import uuid
import random
import hashlib

# ── sys.path sozlash ──────────────────────────────────────────────────────────
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACKEND_DIR)

# ── DB sozlash ────────────────────────────────────────────────────────────────
from common.database import SessionLocal, Base, engine

# ── Modellarni import qilish ──────────────────────────────────────────────────
from services.reception.models import Room, Guest, RoomStatus, RoomType
from services.roomservice.models import MenuItem, RoomServiceOrder, OrderStatus
from services.maintenance.models import MaintenanceIssue, IssueStatus, PriorityLevel, IssueCategory
from services.billing.models import Bill, BillItem

# ── Jadvallarni yaratish ──────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)
print("✅ Jadvallar tayyor")

# ── Yordamchi funksiyalar ─────────────────────────────────────────────────────

def uid():
    return str(uuid.uuid4())

def now_minus(days=0, hours=0):
    return time.time() - days * 86400 - hours * 3600

def pw_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# ── Ma'lumotlar ───────────────────────────────────────────────────────────────

UZBEK_NAMES = [
    "Alisher Karimov", "Bobur Toshmatov", "Dilnoza Yusupova", "Eldor Xasanov",
    "Feruza Mirzayeva", "Gulnora Abdullayeva", "Hamid Rajabov", "Iroda Sobirov",
    "Jasur Normatov", "Kamola Qodirov", "Laziz Ergashev", "Mohira Salimova",
    "Nodir Usmonov", "Ozoda Tursunova", "Pulat Raximov", "Qunduz Holiqov",
    "Ravshan Nazarov", "Sarvinoz Ismoilova", "Timur Xolmatov", "Umida Boymurodov",
    "Vohid Saidov", "Xurshid Mamatov", "Yulduz Hamidov", "Zafar Ortiqov",
    "Aziz Tojiboyev", "Barno Zokirova", "Doniyor Askarov", "Ezgulik Yunusov",
    "Farrux Sultonov", "Gavhar Qosimov", "Hilola Baxtiyorova", "Islom Nishonov",
    "Jamshid Rahimov", "Kamola Haydarov", "Lola Xoʻjayev", "Mansur Qoraboyev",
    "Nargiza Toshpulatov", "Otabek Sanaqulov", "Parviz Razzaqov", "Qodir Maʼmurova",
    "Rustam Mirzaxmedov", "Sevinch Davlatov", "Tohir Alimov", "Ulmas Choriyev",
    "Venera Norqoʻziyev", "Xilola Bahromov", "Yoqimli Jurayev", "Zubayda Qoratoyev",
    "Akbar Hamroyev", "Behzod Iskandarov",
]

MENU_ITEMS = [
    # Nonushta
    ("Ingliz nonushtasi", "Tuxum, bekon, pomidor, qoʻziqorin", 85000, "nonushta"),
    ("Oʻzbek non bilan choy", "Issiq non va qoʻshimcha asal", 25000, "nonushta"),
    ("Qaymoqli qahva", "Espresso, qaymoq, shokolad", 45000, "ichimliklar"),
    ("Tvorog blinchiklar", "Shirin tvorog blinchik + qaymoq", 60000, "nonushta"),
    ("Yulaf bo'tkasi", "Mevali yulaf bo'tqa", 35000, "nonushta"),
    # Salatlar
    ("Grek salati", "Pomidor, bodring, pishloq, zaytun", 65000, "salatlar"),
    ("Cezar salati", "Tovuq, letuk, parmesan, sous", 75000, "salatlar"),
    ("Vinegret", "Lavlagi, kartoshka, no'xat", 40000, "salatlar"),
    ("Olivye salati", "Klassik Olivye", 50000, "salatlar"),
    ("Achichuk", "Pomidor, piyoz, zira bilan", 30000, "salatlar"),
    # Asosiy taomlar
    ("Osh (Plov)", "Oʻzbek milliy taomi, qoʻy goʻshti bilan", 95000, "asosiy"),
    ("Shashlik (3 ta)", "Qoʻy goʻshti, sabzi kabob bilan", 120000, "asosiy"),
    ("Manti (6 ta)", "Qiyma va piyozli manti", 75000, "asosiy"),
    ("Lagʻmon", "Qoʻl bilan ishlangan lapsha, goʻsht", 80000, "asosiy"),
    ("Dimlama", "Goʻsht va sabzavotli dimlama", 90000, "asosiy"),
    ("Chuchvara sho'rva", "Tuxum va qiyma bilan", 65000, "asosiy"),
    ("Qozonkabob", "Goʻsht va sabzavotli qozonkabob", 100000, "asosiy"),
    ("Grilyaj tovuq", "Toʻliq grilled tovuq", 130000, "asosiy"),
    ("Baliq tandir", "Tandirda pishirilgan baliq", 140000, "asosiy"),
    ("Pasta karbonara", "Italyan pastasi, bekon, tuxum", 85000, "asosiy"),
    # Sho'rvalar
    ("Mastava", "Guruch va goʻshtli sho'rva", 55000, "sho'rvalar"),
    ("Shurpa", "Qoʻy goʻshti va sabzavot sho'rvasi", 60000, "sho'rvalar"),
    ("Borscht", "Lavlagi va karam sho'rvasi", 50000, "sho'rvalar"),
    ("Tom Yum", "Tailand sharpali sho'rvasi", 90000, "sho'rvalar"),
    ("Kremli sho'rva", "Qoʻziqorinli krem sho'rvasi", 65000, "sho'rvalar"),
    # Ichimliklar
    ("Limonli choy", "Yangi limon bilan choy", 20000, "ichimliklar"),
    ("Qoʻshimcha choy (dastada)", "Choy dastalari toʻplami", 15000, "ichimliklar"),
    ("Toza suv (0.5L)", "Mineral suv", 10000, "ichimliklar"),
    ("Toza suv (1.5L)", "Mineral suv katta", 18000, "ichimliklar"),
    ("Apelsin sharbati", "Yangi siqilgan apelsin", 35000, "ichimliklar"),
    ("Mango lassi", "Mango va yogurt ichimlik", 40000, "ichimliklar"),
    ("Koʻk choy (asal bilan)", "Oʻzbekcha anʼanaviy choy", 22000, "ichimliklar"),
    ("Cola / Fanta / Sprite", "Bankada gazli ichimlik", 15000, "ichimliklar"),
    ("Energetik ichimlik", "Red Bull 250ml", 25000, "ichimliklar"),
    ("Smoothie (meva)", "Mavsumiy mevalar bilan", 45000, "ichimliklar"),
    # Dessertlar
    ("Napoleon torti", "Klassik Napoleon bir bo'lagi", 45000, "dessertlar"),
    ("Medovik", "Asalli tort bir bo'lagi", 40000, "dessertlar"),
    ("Shirin samsa", "Shirin olmali samsa (2 ta)", 30000, "dessertlar"),
    ("Halva", "Mahalliy halva (100g)", 25000, "dessertlar"),
    ("Qaymoqli dondurma", "Ikki sharli muzqaymoq", 30000, "dessertlar"),
    ("Tiramisu", "Italyan tiramisu", 55000, "dessertlar"),
    ("Cheesecake", "Klassik cheesecake bir bo'lagi", 50000, "dessertlar"),
    # Snacklar
    ("Kartoshka fri", "Tuz va sous bilan", 35000, "snacklar"),
    ("Nuggets (6 ta)", "Tovuq nuggetslari", 50000, "snacklar"),
    ("Pitsa (kichik)", "Margarita pitsa", 75000, "snacklar"),
    ("Burger", "Mol goʻshti burger", 90000, "snacklar"),
    ("Lavash rolli", "Tovuq va sabzavotli rolli", 55000, "snacklar"),
    ("Krakker va pishloq", "Assorted pishloq platter", 60000, "snacklar"),
    ("Qoʻziqorinli bruschetta", "Toasted bruschetta", 45000, "snacklar"),
    ("Chips (100g)", "Mavsumiy chips", 20000, "snacklar"),
    ("Sushi set (8 ta)", "Aralash sushi rolli", 120000, "snacklar"),
]

MAINTENANCE_DESCRIPTIONS = [
    ("Konditsioner sovutmayapti", IssueCategory.AC, PriorityLevel.HIGH),
    ("WiFi ulanmayapti", IssueCategory.WIFI, PriorityLevel.HIGH),
    ("Vannada issiq suv yoʻq", IssueCategory.WATER, PriorityLevel.CRITICAL),
    ("Chiroq yonmayapti", IssueCategory.ELECTRICAL, PriorityLevel.MEDIUM),
    ("Eshik qulfi ishlamayapti", IssueCategory.OTHER, PriorityLevel.HIGH),
    ("Konditsioner shovqin qilmoqda", IssueCategory.AC, PriorityLevel.MEDIUM),
    ("WiFi tezligi juda past", IssueCategory.WIFI, PriorityLevel.MEDIUM),
    ("Hammomda suv oqib ketyapti", IssueCategory.WATER, PriorityLevel.HIGH),
    ("Rozetka ishlamayapti", IssueCategory.ELECTRICAL, PriorityLevel.MEDIUM),
    ("Televizor ishlamayapti", IssueCategory.OTHER, PriorityLevel.LOW),
    ("Konditsioner qoʻldan kelmasdan yashil rangli", IssueCategory.AC, PriorityLevel.LOW),
    ("WiFi parol notoʻgʻri koʻrsatilgan", IssueCategory.WIFI, PriorityLevel.LOW),
    ("Kran tomib turibdi", IssueCategory.WATER, PriorityLevel.MEDIUM),
    ("Sifon ishlamayapti", IssueCategory.WATER, PriorityLevel.HIGH),
    ("Chiroq miltilab turibdi", IssueCategory.ELECTRICAL, PriorityLevel.MEDIUM),
    ("Karavot singan", IssueCategory.OTHER, PriorityLevel.HIGH),
    ("Parda ilingan emas", IssueCategory.OTHER, PriorityLevel.LOW),
    ("Konditsioner filteri ifloslangan", IssueCategory.AC, PriorityLevel.MEDIUM),
    ("Router qayta yoqish kerak", IssueCategory.WIFI, PriorityLevel.LOW),
    ("Suv qizdirgich ishlamayapti", IssueCategory.WATER, PriorityLevel.CRITICAL),
    ("Sigortalar uchib ketgan", IssueCategory.ELECTRICAL, PriorityLevel.CRITICAL),
    ("Xona raqami tashqarisida koʻrinmayapti", IssueCategory.OTHER, PriorityLevel.LOW),
    ("Mini muzlatgich sovitmayapti", IssueCategory.OTHER, PriorityLevel.MEDIUM),
    ("Konditsioner pult yoʻq", IssueCategory.AC, PriorityLevel.LOW),
    ("WiFi tarmogʻi koʻrinmayapti", IssueCategory.WIFI, PriorityLevel.HIGH),
    ("Vannada bosim juda past", IssueCategory.WATER, PriorityLevel.MEDIUM),
    ("Lyuminessent chiroq titrayapti", IssueCategory.ELECTRICAL, PriorityLevel.LOW),
    ("Komodning tortmasi singan", IssueCategory.OTHER, PriorityLevel.LOW),
    ("Konditsioner isitish rejimi ishlamayapti", IssueCategory.AC, PriorityLevel.HIGH),
    ("Lift ishlamayapti (xona yonida)", IssueCategory.OTHER, PriorityLevel.CRITICAL),
    ("Suv bosimi kritik darajada past", IssueCategory.WATER, PriorityLevel.CRITICAL),
    ("Derazadan shamol kiryapti", IssueCategory.OTHER, PriorityLevel.MEDIUM),
    ("Gilamda dogʻ bor", IssueCategory.OTHER, PriorityLevel.LOW),
    ("Konditsioner buzilgan", IssueCategory.AC, PriorityLevel.CRITICAL),
    ("WiFi tez-tez uziladi", IssueCategory.WIFI, PriorityLevel.MEDIUM),
    ("Qoʻshimcha yostiq kerak", IssueCategory.OTHER, PriorityLevel.LOW),
    ("Komodda suvdan dogʻ bor", IssueCategory.OTHER, PriorityLevel.LOW),
    ("Vannaxona oynasi singan", IssueCategory.OTHER, PriorityLevel.HIGH),
    ("Konditsioner suv tomlayapti", IssueCategory.AC, PriorityLevel.HIGH),
    ("Internet hech qachon ishlamagan", IssueCategory.WIFI, PriorityLevel.CRITICAL),
    ("Duş bosimi juda past", IssueCategory.WATER, PriorityLevel.MEDIUM),
    ("Televizor pulti yoʻq", IssueCategory.OTHER, PriorityLevel.LOW),
    ("Shkaf eshigi yopilmayapti", IssueCategory.OTHER, PriorityLevel.LOW),
    ("Konditsioner hidli havo chiqarmoqda", IssueCategory.AC, PriorityLevel.HIGH),
    ("Asosiy chiroq oʻchib qolgan", IssueCategory.ELECTRICAL, PriorityLevel.HIGH),
    ("Hammomda suv toʻkilib qolgan", IssueCategory.WATER, PriorityLevel.HIGH),
    ("Eshik xalaqit bermoqda", IssueCategory.OTHER, PriorityLevel.MEDIUM),
    ("Zaryad berish paneli ishlamayapti", IssueCategory.ELECTRICAL, PriorityLevel.MEDIUM),
    ("WiFi signal xonada yo'q", IssueCategory.WIFI, PriorityLevel.HIGH),
    ("Konditsioner pultida batareya yo'q", IssueCategory.AC, PriorityLevel.LOW),
    ("Stul singan", IssueCategory.OTHER, PriorityLevel.MEDIUM),
    ("Oyna yopilmayapti", IssueCategory.OTHER, PriorityLevel.MEDIUM),
    ("Gaz plita (oshxona) ishlamayapti", IssueCategory.ELECTRICAL, PriorityLevel.HIGH),
    ("Kir yuvish mashinasi shovqin", IssueCategory.OTHER, PriorityLevel.MEDIUM),
    ("Balkon eshigi qulflangan emas", IssueCategory.OTHER, PriorityLevel.HIGH),
]

ROOM_TYPE_PRICE = {
    RoomType.SINGLE: 350000,
    RoomType.DOUBLE: 550000,
    RoomType.SUITE: 1200000,
    RoomType.ACCESSIBLE: 450000,
}

# ── Seed funksiyalari ─────────────────────────────────────────────────────────

def seed_rooms(db):
    if db.query(Room).count() >= 50:
        print("   ↳ rooms: allaqachon mavjud, o'tkazib yuborildi")
        return []
    room_type_cycle = [
        RoomType.SINGLE, RoomType.DOUBLE, RoomType.DOUBLE,
        RoomType.SUITE, RoomType.ACCESSIBLE, RoomType.DOUBLE,
        RoomType.SINGLE, RoomType.SUITE, RoomType.DOUBLE, RoomType.ACCESSIBLE,
    ]
    statuses = [RoomStatus.CLEAN] * 6 + [RoomStatus.DIRTY] * 2 + [RoomStatus.OCCUPIED] * 2
    rooms = []
    for floor in range(1, 6):
        for num in range(1, 11):
            room_number = floor * 100 + num
            rtype = room_type_cycle[(num - 1) % len(room_type_cycle)]
            near_lift = num <= 2
            rooms.append(Room(
                id=uid(),
                number=room_number,
                floor=floor,
                type=rtype,
                status=random.choice(statuses),
                last_cleaned_at=now_minus(days=random.randint(0, 3)),
                distance_to_lift=10 if near_lift else random.randint(20, 80),
            ))
    db.add_all(rooms)
    db.flush()
    print(f"   ↳ rooms: {len(rooms)} ta qoʻshildi")
    return rooms


def seed_guests(db, rooms):
    if db.query(Guest).count() >= 50:
        print("   ↳ guests: allaqachon mavjud, o'tkazib yuborildi")
        return db.query(Guest).limit(50).all()

    occupied_rooms = [r for r in rooms if r.status == RoomStatus.OCCUPIED]
    guests = []
    for i, name in enumerate(UZBEK_NAMES):
        rtype = random.choice(list(RoomType))
        nights = random.randint(1, 14)
        price = ROOM_TYPE_PRICE[rtype]
        room_id = None
        if i < len(occupied_rooms):
            room_id = occupied_rooms[i].number
        login = name.split()[0].lower() + str(random.randint(10, 99))
        guests.append(Guest(
            id=uid(),
            name=name,
            room_type=rtype,
            preferred_floor=random.randint(1, 5),
            near_lift=random.choice([True, False]),
            nights=nights,
            room_price_per_night=float(price),
            room_id=room_id,
            login=login,
            password_hash=pw_hash("parol123"),
        ))
    db.add_all(guests)
    db.flush()
    print(f"   ↳ guests: {len(guests)} ta qoʻshildi")
    return guests


def seed_menu(db):
    if db.query(MenuItem).count() >= 50:
        print("   ↳ menu_items: allaqachon mavjud, o'tkazib yuborildi")
        return db.query(MenuItem).all()

    items = []
    for name, desc, price, category in MENU_ITEMS:
        items.append(MenuItem(
            id=uid(),
            name=name,
            description=desc,
            price=float(price),
            category=category,
            is_available=random.random() > 0.1,  # 90% mavjud
        ))
    db.add_all(items)
    db.flush()
    print(f"   ↳ menu_items: {len(items)} ta qoʻshildi")
    return items


def seed_orders(db, guests, menu_items):
    if db.query(RoomServiceOrder).count() >= 50:
        print("   ↳ room_service_orders: allaqachon mavjud, o'tkazib yuborildi")
        return

    statuses = [
        OrderStatus.PENDING, OrderStatus.PENDING,
        OrderStatus.PREPARING,
        OrderStatus.ON_THE_WAY,
        OrderStatus.DELIVERED, OrderStatus.DELIVERED, OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,
    ]
    orders = []
    for i in range(60):
        guest = random.choice(guests)
        n_items = random.randint(1, 4)
        chosen = random.sample(menu_items, min(n_items, len(menu_items)))
        items_data = [{"name": m.name, "price": m.price} for m in chosen]
        total = sum(m.price for m in chosen)
        status = random.choice(statuses)
        order = RoomServiceOrder(
            id=uid(),
            room_id=guest.room_id or random.randint(101, 510),
            guest_id=guest.id,
            items=items_data,
            total_price=total,
            status=status,
            created_at=now_minus(days=random.randint(0, 30)),
            updated_at=now_minus(days=random.randint(0, 5)),
        )
        if status == OrderStatus.DELIVERED:
            order.rating = random.randint(3, 5)
            order.comment = random.choice([
                "Juda yaxshi xizmat!", "Ovqat mazali edi", "Tez yetkazib berishdi",
                "Rahmat, juda mamnun", None, None,
            ])
            order.feedback_submitted_at = now_minus(hours=random.randint(1, 24))
        orders.append(order)
    db.add_all(orders)
    db.flush()
    print(f"   ↳ room_service_orders: {len(orders)} ta qoʻshildi")


def seed_maintenance(db, guests):
    if db.query(MaintenanceIssue).count() >= 50:
        print("   ↳ maintenance_issues: allaqachon mavjud, o'tkazib yuborildi")
        return

    issue_statuses = [
        IssueStatus.OPEN, IssueStatus.OPEN,
        IssueStatus.ASSIGNED,
        IssueStatus.IN_PROGRESS,
        IssueStatus.COMPLETED,
        IssueStatus.CLOSED,
    ]
    employee_ids = [uid() for _ in range(8)]  # 8 ta xodim
    issues = []
    for i, (desc, category, priority) in enumerate(MAINTENANCE_DESCRIPTIONS[:55]):
        guest = random.choice(guests)
        status = random.choice(issue_statuses)
        room_id = guest.room_id or random.randint(101, 510)
        issue = MaintenanceIssue(
            id=uid(),
            room_id=room_id,
            reported_by=guest.id,
            category=category,
            description=desc,
            priority=priority,
            status=status,
            created_at=now_minus(days=random.randint(0, 60)),
            updated_at=now_minus(days=random.randint(0, 10)),
        )
        if status in (IssueStatus.ASSIGNED, IssueStatus.IN_PROGRESS,
                      IssueStatus.COMPLETED, IssueStatus.CLOSED):
            issue.assigned_to = random.choice(employee_ids)
        if status in (IssueStatus.COMPLETED, IssueStatus.CLOSED):
            issue.resolved_at = now_minus(days=random.randint(0, 5))
        if status == IssueStatus.CLOSED:
            issue.feedback_rating = random.randint(3, 5)
            issue.feedback_comment = random.choice([
                "Muammo hal qilindi, rahmat", "Tezda kelishdi", "Yaxshi ish", None,
            ])
        issues.append(issue)
    db.add_all(issues)
    db.flush()
    print(f"   ↳ maintenance_issues: {len(issues)} ta qoʻshildi")


def seed_bills(db, guests):
    if db.query(Bill).count() >= 50:
        print("   ↳ bills: allaqachon mavjud, o'tkazib yuborildi")
        return

    extra_charges = [
        ("Minibar (pivo)", 25000), ("Minibar (suv)", 10000),
        ("Kir yuvish xizmati", 50000), ("Parking (1 kun)", 30000),
        ("Xona tozalash qo'shimcha", 40000), ("Telefon qo'ng'iroqlari", 15000),
        ("Spa xizmati", 150000), ("Restoran tushligi", 95000),
        ("Kech chiqish jarima", 100000), ("Zarar: stul sindirildi", 200000),
    ]
    bills = []
    for guest in guests:
        room_cost = guest.room_price_per_night * guest.nights
        is_closed = random.random() > 0.4
        bill = Bill(
            id=uid(),
            guest_id=guest.id,
            room_id=guest.room_id or random.randint(101, 510),
            guest_name=guest.name,
            total=room_cost,
            discount_percent=random.choice([0, 0, 0, 5, 10, 15]),
            is_closed=is_closed,
            closed_at=now_minus(days=random.randint(0, 5)) if is_closed else None,
            created_at=now_minus(days=guest.nights + random.randint(0, 3)),
        )
        # Asosiy xona narxi
        items = [
            BillItem(
                id=uid(), bill_id=bill.id,
                description=f"Xona {bill.room_id} - {guest.nights} kecha",
                amount=room_cost,
                timestamp=bill.created_at,
            )
        ]
        # 1-3 ta qo'shimcha to'lov
        for _ in range(random.randint(0, 3)):
            desc, amount = random.choice(extra_charges)
            items.append(BillItem(
                id=uid(), bill_id=bill.id,
                description=desc,
                amount=float(amount),
                timestamp=now_minus(days=random.randint(0, guest.nights)),
            ))
        total_with_extras = sum(i.amount for i in items)
        bill.total = total_with_extras * (1 - bill.discount_percent / 100)
        bills.append(bill)
        db.add(bill)
        for item in items:
            db.add(item)
    db.flush()
    print(f"   ↳ bills: {len(bills)} ta qoʻshildi (bill_items ham)")


# ── Asosiy seed funksiyasi ────────────────────────────────────────────────────

def run_seed():
    print("\n🌱 HotelOS Seed boshlanyapti...\n")
    with SessionLocal() as db:
        rooms = seed_rooms(db)
        if not rooms:
            rooms = db.query(Room).all()

        guests = seed_guests(db, rooms)
        if not guests:
            guests = db.query(Guest).limit(50).all()

        menu_items = seed_menu(db)

        seed_orders(db, guests, menu_items)
        seed_maintenance(db, guests)
        seed_bills(db, guests)

        db.commit()

    print("\n✅ Seed muvaffaqiyatli yakunlandi!")
    print("   Jadvallar to'ldirildi:")
    print("   • rooms              → 50 ta xona (5 qavat × 10)")
    print("   • guests             → 50 ta mehmon")
    print("   • menu_items         → 50 ta taom/ichimlik")
    print("   • room_service_orders→ 60 ta buyurtma")
    print("   • maintenance_issues → 55 ta texnik muammo")
    print("   • bills + bill_items → 50 ta hisob (qo'shimcha to'lovlar bilan)")


if __name__ == "__main__":
    run_seed()
