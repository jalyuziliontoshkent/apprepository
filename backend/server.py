from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from typing import List, Optional
import secrets

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user["_id"])
        del user["_id"]
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# --- Pydantic Models ---
class LoginRequest(BaseModel):
    email: str
    password: str

class DealerCreate(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = ""
    address: Optional[str] = ""
    credit_limit: float = 0

class DealerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    credit_limit: Optional[float] = None

class MaterialCreate(BaseModel):
    name: str
    category: str
    price_per_sqm: float
    stock_quantity: float
    unit: str = "kv.m"
    description: Optional[str] = ""

class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price_per_sqm: Optional[float] = None
    stock_quantity: Optional[float] = None
    description: Optional[str] = None

class OrderItemCreate(BaseModel):
    material_id: str
    material_name: str
    width: float
    height: float
    quantity: int = 1
    price_per_sqm: float
    notes: Optional[str] = ""

class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    notes: Optional[str] = ""

class OrderStatusUpdate(BaseModel):
    status: str
    rejection_reason: Optional[str] = ""

class MessageCreate(BaseModel):
    receiver_id: str
    text: str

# --- AUTH ---
@api_router.post("/auth/login")
async def login(req: LoginRequest):
    email = req.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email yoki parol noto'g'ri")
    token = create_access_token(str(user["_id"]), user["email"], user["role"])
    return {
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "name": user.get("name", ""),
            "email": user["email"],
            "role": user["role"],
            "phone": user.get("phone", ""),
            "address": user.get("address", ""),
            "credit_limit": user.get("credit_limit", 0),
            "debt": user.get("debt", 0),
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {"user": user}

# --- DEALERS (Admin only) ---
@api_router.post("/dealers")
async def create_dealer(data: DealerCreate, admin: dict = Depends(require_admin)):
    email = data.email.strip().lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Bu email allaqachon mavjud")
    dealer = {
        "name": data.name,
        "email": email,
        "password_hash": hash_password(data.password),
        "role": "dealer",
        "phone": data.phone or "",
        "address": data.address or "",
        "credit_limit": data.credit_limit,
        "debt": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(dealer)
    dealer["id"] = str(result.inserted_id)
    dealer.pop("_id", None)
    dealer.pop("password_hash", None)
    return dealer

@api_router.get("/dealers")
async def list_dealers(admin: dict = Depends(require_admin)):
    dealers = []
    async for d in db.users.find({"role": "dealer"}, {"password_hash": 0}):
        d["id"] = str(d["_id"])
        del d["_id"]
        dealers.append(d)
    return dealers

@api_router.get("/dealers/{dealer_id}")
async def get_dealer(dealer_id: str, admin: dict = Depends(require_admin)):
    d = await db.users.find_one({"_id": ObjectId(dealer_id), "role": "dealer"}, {"password_hash": 0})
    if not d:
        raise HTTPException(status_code=404, detail="Diler topilmadi")
    d["id"] = str(d["_id"])
    del d["_id"]
    return d

@api_router.put("/dealers/{dealer_id}")
async def update_dealer(dealer_id: str, data: DealerUpdate, admin: dict = Depends(require_admin)):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Hech narsa yangilanmadi")
    await db.users.update_one({"_id": ObjectId(dealer_id)}, {"$set": update_data})
    d = await db.users.find_one({"_id": ObjectId(dealer_id)}, {"password_hash": 0})
    d["id"] = str(d["_id"])
    del d["_id"]
    return d

@api_router.delete("/dealers/{dealer_id}")
async def delete_dealer(dealer_id: str, admin: dict = Depends(require_admin)):
    result = await db.users.delete_one({"_id": ObjectId(dealer_id), "role": "dealer"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Diler topilmadi")
    return {"message": "Diler o'chirildi"}

# --- MATERIALS (Inventory) ---
@api_router.post("/materials")
async def create_material(data: MaterialCreate, admin: dict = Depends(require_admin)):
    mat = data.dict()
    mat["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.materials.insert_one(mat)
    mat["id"] = str(result.inserted_id)
    mat.pop("_id", None)
    return mat

@api_router.get("/materials")
async def list_materials(user: dict = Depends(get_current_user)):
    materials = []
    async for m in db.materials.find():
        m["id"] = str(m["_id"])
        del m["_id"]
        materials.append(m)
    return materials

@api_router.put("/materials/{material_id}")
async def update_material(material_id: str, data: MaterialUpdate, admin: dict = Depends(require_admin)):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Hech narsa yangilanmadi")
    await db.materials.update_one({"_id": ObjectId(material_id)}, {"$set": update_data})
    m = await db.materials.find_one({"_id": ObjectId(material_id)})
    m["id"] = str(m["_id"])
    del m["_id"]
    return m

@api_router.delete("/materials/{material_id}")
async def delete_material(material_id: str, admin: dict = Depends(require_admin)):
    result = await db.materials.delete_one({"_id": ObjectId(material_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Material topilmadi")
    return {"message": "Material o'chirildi"}

# --- ORDERS ---
@api_router.post("/orders")
async def create_order(data: OrderCreate, user: dict = Depends(get_current_user)):
    if user.get("role") != "dealer":
        raise HTTPException(status_code=403, detail="Faqat dilerlar buyurtma yaratishi mumkin")
    items = []
    total_price = 0
    total_sqm = 0
    for item in data.items:
        sqm = item.width * item.height * item.quantity
        price = sqm * item.price_per_sqm
        total_sqm += sqm
        total_price += price
        items.append({
            "material_id": item.material_id,
            "material_name": item.material_name,
            "width": item.width,
            "height": item.height,
            "quantity": item.quantity,
            "sqm": round(sqm, 2),
            "price_per_sqm": item.price_per_sqm,
            "price": round(price, 2),
            "notes": item.notes or "",
        })
    order = {
        "dealer_id": user["id"],
        "dealer_name": user.get("name", ""),
        "items": items,
        "total_sqm": round(total_sqm, 2),
        "total_price": round(total_price, 2),
        "status": "kutilmoqda",
        "notes": data.notes or "",
        "rejection_reason": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.orders.insert_one(order)
    order["id"] = str(result.inserted_id)
    order.pop("_id", None)
    # Update dealer debt
    await db.users.update_one(
        {"_id": ObjectId(user["id"])},
        {"$inc": {"debt": total_price}}
    )
    return order

@api_router.get("/orders")
async def list_orders(user: dict = Depends(get_current_user)):
    query = {}
    if user.get("role") == "dealer":
        query["dealer_id"] = user["id"]
    orders = []
    async for o in db.orders.find(query).sort("created_at", -1):
        o["id"] = str(o["_id"])
        del o["_id"]
        orders.append(o)
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    o = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not o:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")
    if user.get("role") == "dealer" and o["dealer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    o["id"] = str(o["_id"])
    del o["_id"]
    return o

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, data: OrderStatusUpdate, admin: dict = Depends(require_admin)):
    valid_statuses = ["kutilmoqda", "tasdiqlangan", "tayyorlanmoqda", "yetkazildi", "rad_etilgan"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Noto'g'ri status. Ruxsat etilgan: {valid_statuses}")
    update = {"status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if data.status == "rad_etilgan" and data.rejection_reason:
        update["rejection_reason"] = data.rejection_reason
    await db.orders.update_one({"_id": ObjectId(order_id)}, {"$set": update})
    o = await db.orders.find_one({"_id": ObjectId(order_id)})
    o["id"] = str(o["_id"])
    del o["_id"]
    return o

# --- CHAT ---
@api_router.post("/messages")
async def send_message(data: MessageCreate, user: dict = Depends(get_current_user)):
    msg = {
        "sender_id": user["id"],
        "sender_name": user.get("name", ""),
        "sender_role": user.get("role", ""),
        "receiver_id": data.receiver_id,
        "text": data.text,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.messages.insert_one(msg)
    msg["id"] = str(result.inserted_id)
    msg.pop("_id", None)
    return msg

@api_router.get("/messages/{partner_id}")
async def get_messages(partner_id: str, user: dict = Depends(get_current_user)):
    messages = []
    query = {
        "$or": [
            {"sender_id": user["id"], "receiver_id": partner_id},
            {"sender_id": partner_id, "receiver_id": user["id"]},
        ]
    }
    async for m in db.messages.find(query).sort("created_at", 1):
        m["id"] = str(m["_id"])
        del m["_id"]
        messages.append(m)
    # Mark as read
    await db.messages.update_many(
        {"sender_id": partner_id, "receiver_id": user["id"], "read": False},
        {"$set": {"read": True}}
    )
    return messages

@api_router.get("/messages/unread/count")
async def get_unread_count(user: dict = Depends(get_current_user)):
    count = await db.messages.count_documents({"receiver_id": user["id"], "read": False})
    return {"count": count}

@api_router.get("/chat/partners")
async def get_chat_partners(user: dict = Depends(get_current_user)):
    if user.get("role") == "admin":
        dealers = []
        async for d in db.users.find({"role": "dealer"}, {"password_hash": 0}):
            d["id"] = str(d["_id"])
            del d["_id"]
            # Get last message and unread count
            last_msg = await db.messages.find_one(
                {"$or": [
                    {"sender_id": user["id"], "receiver_id": d["id"]},
                    {"sender_id": d["id"], "receiver_id": user["id"]},
                ]},
                sort=[("created_at", -1)]
            )
            unread = await db.messages.count_documents({"sender_id": d["id"], "receiver_id": user["id"], "read": False})
            d["last_message"] = last_msg.get("text", "") if last_msg else ""
            d["last_message_time"] = last_msg.get("created_at", "") if last_msg else ""
            d["unread_count"] = unread
            dealers.append(d)
        return dealers
    else:
        # Dealer sees only admin
        admin = await db.users.find_one({"role": "admin"}, {"password_hash": 0})
        if admin:
            admin["id"] = str(admin["_id"])
            del admin["_id"]
            last_msg = await db.messages.find_one(
                {"$or": [
                    {"sender_id": user["id"], "receiver_id": admin["id"]},
                    {"sender_id": admin["id"], "receiver_id": user["id"]},
                ]},
                sort=[("created_at", -1)]
            )
            unread = await db.messages.count_documents({"sender_id": admin["id"], "receiver_id": user["id"], "read": False})
            admin["last_message"] = last_msg.get("text", "") if last_msg else ""
            admin["last_message_time"] = last_msg.get("created_at", "") if last_msg else ""
            admin["unread_count"] = unread
            return [admin]
        return []

# --- STATISTICS (Admin) ---
@api_router.get("/statistics")
async def get_statistics(admin: dict = Depends(require_admin)):
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"status": "kutilmoqda"})
    approved_orders = await db.orders.count_documents({"status": "tasdiqlangan"})
    preparing_orders = await db.orders.count_documents({"status": "tayyorlanmoqda"})
    delivered_orders = await db.orders.count_documents({"status": "yetkazildi"})
    rejected_orders = await db.orders.count_documents({"status": "rad_etilgan"})
    total_dealers = await db.users.count_documents({"role": "dealer"})
    total_materials = await db.materials.count_documents({})

    # Total revenue from delivered orders
    pipeline = [
        {"$match": {"status": {"$in": ["tasdiqlangan", "tayyorlanmoqda", "yetkazildi"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_price"}}}
    ]
    result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = result[0]["total"] if result else 0

    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "approved_orders": approved_orders,
        "preparing_orders": preparing_orders,
        "delivered_orders": delivered_orders,
        "rejected_orders": rejected_orders,
        "total_dealers": total_dealers,
        "total_materials": total_materials,
        "total_revenue": round(total_revenue, 2),
    }

# --- SEED ---
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@curtain.uz")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Admin yaratildi: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Admin paroli yangilandi")
    # Seed demo materials
    mat_count = await db.materials.count_documents({})
    if mat_count == 0:
        demo_materials = [
            {"name": "Blackout Parda", "category": "Parda", "price_per_sqm": 85000, "stock_quantity": 500, "unit": "kv.m", "description": "Yorug'lik o'tkazmaydigan parda", "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Tull Parda", "category": "Parda", "price_per_sqm": 45000, "stock_quantity": 800, "unit": "kv.m", "description": "Shaffof tull parda", "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Roller Jalyuzi", "category": "Jalyuzi", "price_per_sqm": 120000, "stock_quantity": 300, "unit": "kv.m", "description": "Zamonaviy roller jalyuzi", "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Gorizontal Jalyuzi", "category": "Jalyuzi", "price_per_sqm": 95000, "stock_quantity": 400, "unit": "kv.m", "description": "Alyuminiy gorizontal jalyuzi", "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Vertikal Jalyuzi", "category": "Jalyuzi", "price_per_sqm": 75000, "stock_quantity": 350, "unit": "kv.m", "description": "Ofis uchun vertikal jalyuzi", "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Rimskaya Parda", "category": "Parda", "price_per_sqm": 110000, "stock_quantity": 200, "unit": "kv.m", "description": "Premium rimskaya parda", "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.materials.insert_many(demo_materials)
        logger.info("Demo materiallar yaratildi")
    # Seed demo dealer
    demo_dealer = await db.users.find_one({"email": "dealer@test.uz"})
    if demo_dealer is None:
        await db.users.insert_one({
            "email": "dealer@test.uz",
            "password_hash": hash_password("dealer123"),
            "name": "Test Diler",
            "role": "dealer",
            "phone": "+998901234567",
            "address": "Toshkent, Yunusobod tumani",
            "credit_limit": 50000000,
            "debt": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Demo diler yaratildi: dealer@test.uz")

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.messages.create_index([("sender_id", 1), ("receiver_id", 1)])
    await db.orders.create_index("dealer_id")
    await seed_admin()
    logger.info("Server ishga tushdi!")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
