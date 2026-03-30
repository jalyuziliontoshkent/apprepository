from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, UploadFile, File
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
import aiofiles, uuid
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os, logging, bcrypt, jwt, secrets, string
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from typing import List, Optional

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI()
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
api_router = APIRouter(prefix="/api")
JWT_ALGORITHM = "HS256"

def get_jwt_secret(): return os.environ["JWT_SECRET"]
def hash_password(pw: str) -> str: return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
def verify_password(plain: str, hashed: str) -> bool: return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_access_token(uid: str, email: str, role: str) -> str:
    return jwt.encode({"sub": uid, "email": email, "role": role, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def generate_order_code():
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))

async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "): raise HTTPException(401, "Not authenticated")
    try:
        p = jwt.decode(auth[7:], get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(p["sub"])})
        if not user: raise HTTPException(401, "User not found")
        user["id"] = str(user["_id"]); del user["_id"]; user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError: raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError: raise HTTPException(401, "Invalid token")

async def require_admin(request: Request) -> dict:
    u = await get_current_user(request)
    if u.get("role") != "admin": raise HTTPException(403, "Admin only")
    return u

async def require_worker(request: Request) -> dict:
    u = await get_current_user(request)
    if u.get("role") != "worker": raise HTTPException(403, "Worker only")
    return u

# ─── Pydantic Models ───
class LoginReq(BaseModel): email: str; password: str
class DealerCreate(BaseModel): name: str; email: str; password: str; phone: str = ""; address: str = ""; credit_limit: float = 0
class DealerUpdate(BaseModel): name: Optional[str] = None; phone: Optional[str] = None; address: Optional[str] = None; credit_limit: Optional[float] = None
class WorkerCreate(BaseModel): name: str; email: str; password: str; phone: str = ""; specialty: str = ""
class MaterialCreate(BaseModel): name: str; category: str; price_per_sqm: float; stock_quantity: float; unit: str = "kv.m"; description: str = ""; image_url: str = ""
class MaterialUpdate(BaseModel): name: Optional[str] = None; category: Optional[str] = None; price_per_sqm: Optional[float] = None; stock_quantity: Optional[float] = None; description: Optional[str] = None; image_url: Optional[str] = None
class OrderItemCreate(BaseModel): material_id: str; material_name: str; width: float; height: float; quantity: int = 1; price_per_sqm: float; notes: str = ""
class OrderCreate(BaseModel): items: List[OrderItemCreate]; notes: str = ""
class OrderStatusUpdate(BaseModel): status: str; rejection_reason: str = ""
class MessageCreate(BaseModel): receiver_id: str; text: str
class AssignItemReq(BaseModel): worker_id: str
class DeliveryInfoReq(BaseModel): driver_name: str; driver_phone: str; plate_number: str = ""

# ─── AUTH ───
@api_router.post("/auth/login")
async def login(req: LoginReq):
    user = await db.users.find_one({"email": req.email.strip().lower()})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Email yoki parol noto'g'ri")
    token = create_access_token(str(user["_id"]), user["email"], user["role"])
    return {"token": token, "user": {"id": str(user["_id"]), "name": user.get("name",""), "email": user["email"], "role": user["role"], "phone": user.get("phone",""), "address": user.get("address",""), "credit_limit": user.get("credit_limit",0), "debt": user.get("debt",0), "specialty": user.get("specialty","")}}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)): return {"user": user}

# ─── AUTH: Update own profile ───
@api_router.put("/auth/profile")
async def update_profile(request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    upd = {}
    new_email = body.get("email", "").strip().lower()
    new_password = body.get("password", "").strip()
    current_password = body.get("current_password", "").strip()
    if not current_password:
        raise HTTPException(400, "Joriy parolni kiriting")
    # Verify current password
    db_user = await db.users.find_one({"_id": ObjectId(user["id"])})
    if not db_user or not verify_password(current_password, db_user["password_hash"]):
        raise HTTPException(400, "Joriy parol noto'g'ri")
    if new_email and new_email != db_user["email"]:
        existing = await db.users.find_one({"email": new_email, "_id": {"$ne": ObjectId(user["id"])}})
        if existing:
            raise HTTPException(400, "Bu email allaqachon mavjud")
        upd["email"] = new_email
    if new_password:
        if len(new_password) < 4:
            raise HTTPException(400, "Parol kamida 4 ta belgi")
        upd["password_hash"] = hash_password(new_password)
    if not upd:
        raise HTTPException(400, "O'zgartirish yo'q")
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": upd})
    updated = await db.users.find_one({"_id": ObjectId(user["id"])}, {"password_hash": 0})
    updated["id"] = str(updated["_id"]); del updated["_id"]
    # Generate new token with updated email
    token = create_access_token(updated["id"], updated.get("email",""), updated.get("role",""))
    return {"user": updated, "token": token, "message": "Profil yangilandi"}

# ─── DEALERS ───
@api_router.post("/dealers")
async def create_dealer(d: DealerCreate, admin: dict = Depends(require_admin)):
    if await db.users.find_one({"email": d.email.strip().lower()}): raise HTTPException(400, "Email mavjud")
    doc = {"name": d.name, "email": d.email.strip().lower(), "password_hash": hash_password(d.password), "role": "dealer", "phone": d.phone, "address": d.address, "credit_limit": d.credit_limit, "debt": 0, "created_at": datetime.now(timezone.utc).isoformat()}
    r = await db.users.insert_one(doc); doc["id"] = str(r.inserted_id); doc.pop("_id", None); doc.pop("password_hash", None); return doc

@api_router.get("/dealers")
async def list_dealers(admin: dict = Depends(require_admin)):
    out = []
    async for d in db.users.find({"role": "dealer"}, {"password_hash": 0}): d["id"] = str(d["_id"]); del d["_id"]; out.append(d)
    return out

@api_router.put("/dealers/{did}")
async def update_dealer(did: str, data: DealerUpdate, admin: dict = Depends(require_admin)):
    upd = {k: v for k, v in data.dict().items() if v is not None}
    if not upd: raise HTTPException(400, "No data")
    await db.users.update_one({"_id": ObjectId(did)}, {"$set": upd})
    d = await db.users.find_one({"_id": ObjectId(did)}, {"password_hash": 0}); d["id"] = str(d["_id"]); del d["_id"]; return d

@api_router.delete("/dealers/{did}")
async def delete_dealer(did: str, admin: dict = Depends(require_admin)):
    r = await db.users.delete_one({"_id": ObjectId(did), "role": "dealer"})
    if r.deleted_count == 0: raise HTTPException(404, "Not found")
    return {"message": "Deleted"}

# ─── WORKERS ───
@api_router.post("/workers")
async def create_worker(w: WorkerCreate, admin: dict = Depends(require_admin)):
    if await db.users.find_one({"email": w.email.strip().lower()}): raise HTTPException(400, "Email mavjud")
    doc = {"name": w.name, "email": w.email.strip().lower(), "password_hash": hash_password(w.password), "role": "worker", "phone": w.phone, "specialty": w.specialty, "created_at": datetime.now(timezone.utc).isoformat()}
    r = await db.users.insert_one(doc); doc["id"] = str(r.inserted_id); doc.pop("_id", None); doc.pop("password_hash", None); return doc

@api_router.get("/workers")
async def list_workers(admin: dict = Depends(require_admin)):
    out = []
    async for w in db.users.find({"role": "worker"}, {"password_hash": 0}): w["id"] = str(w["_id"]); del w["_id"]; out.append(w)
    return out

@api_router.delete("/workers/{wid}")
async def delete_worker(wid: str, admin: dict = Depends(require_admin)):
    r = await db.users.delete_one({"_id": ObjectId(wid), "role": "worker"})
    if r.deleted_count == 0: raise HTTPException(404, "Not found")
    return {"message": "Deleted"}

# ─── MATERIALS ───
@api_router.post("/materials")
async def create_material(d: MaterialCreate, admin: dict = Depends(require_admin)):
    doc = d.dict(); doc["created_at"] = datetime.now(timezone.utc).isoformat()
    r = await db.materials.insert_one(doc); doc["id"] = str(r.inserted_id); doc.pop("_id", None); return doc

@api_router.get("/materials")
async def list_materials(user: dict = Depends(get_current_user)):
    out = []
    async for m in db.materials.find(): m["id"] = str(m["_id"]); del m["_id"]; out.append(m)
    return out

@api_router.put("/materials/{mid}")
async def update_material(mid: str, d: MaterialUpdate, admin: dict = Depends(require_admin)):
    upd = {k: v for k, v in d.dict().items() if v is not None}
    if not upd: raise HTTPException(400, "No data")
    await db.materials.update_one({"_id": ObjectId(mid)}, {"$set": upd})
    m = await db.materials.find_one({"_id": ObjectId(mid)}); m["id"] = str(m["_id"]); del m["_id"]; return m

@api_router.delete("/materials/{mid}")
async def delete_material(mid: str, admin: dict = Depends(require_admin)):
    r = await db.materials.delete_one({"_id": ObjectId(mid)})
    if r.deleted_count == 0: raise HTTPException(404, "Not found")
    return {"message": "Deleted"}

# ─── ORDERS ───
@api_router.post("/orders")
async def create_order(data: OrderCreate, user: dict = Depends(get_current_user)):
    if user.get("role") != "dealer": raise HTTPException(403, "Faqat dilerlar")
    items = []; total_price = 0; total_sqm = 0
    for it in data.items:
        sqm = it.width * it.height * it.quantity
        price = sqm * it.price_per_sqm
        total_sqm += sqm; total_price += price
        items.append({"material_id": it.material_id, "material_name": it.material_name, "width": it.width, "height": it.height, "quantity": it.quantity, "sqm": round(sqm, 2), "price_per_sqm": it.price_per_sqm, "price": round(price, 2), "notes": it.notes, "assigned_worker_id": "", "assigned_worker_name": "", "worker_status": "pending"})
    order_code = generate_order_code()
    order = {"order_code": order_code, "dealer_id": user["id"], "dealer_name": user.get("name",""), "items": items, "total_sqm": round(total_sqm,2), "total_price": round(total_price,2), "status": "kutilmoqda", "notes": data.notes, "rejection_reason": "", "delivery_info": None, "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}
    r = await db.orders.insert_one(order); order["id"] = str(r.inserted_id); order.pop("_id", None)
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$inc": {"debt": total_price}})
    return order

@api_router.get("/orders")
async def list_orders(user: dict = Depends(get_current_user)):
    q = {}
    if user.get("role") == "dealer": q["dealer_id"] = user["id"]
    out = []
    async for o in db.orders.find(q).sort("created_at", -1): o["id"] = str(o["_id"]); del o["_id"]; out.append(o)
    return out

@api_router.get("/orders/{oid}")
async def get_order(oid: str, user: dict = Depends(get_current_user)):
    o = await db.orders.find_one({"_id": ObjectId(oid)})
    if not o: raise HTTPException(404, "Not found")
    if user.get("role") == "dealer" and o["dealer_id"] != user["id"]: raise HTTPException(403)
    o["id"] = str(o["_id"]); del o["_id"]; return o

@api_router.put("/orders/{oid}/status")
async def update_order_status(oid: str, data: OrderStatusUpdate, admin: dict = Depends(require_admin)):
    valid = ["kutilmoqda","tasdiqlangan","tayyorlanmoqda","tayyor","yetkazilmoqda","yetkazildi","rad_etilgan"]
    if data.status not in valid: raise HTTPException(400, f"Invalid status")
    upd = {"status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if data.status == "rad_etilgan" and data.rejection_reason: upd["rejection_reason"] = data.rejection_reason
    await db.orders.update_one({"_id": ObjectId(oid)}, {"$set": upd})
    o = await db.orders.find_one({"_id": ObjectId(oid)}); o["id"] = str(o["_id"]); del o["_id"]; return o

# ─── WORKER: Assign item to worker ───
@api_router.put("/orders/{oid}/items/{item_idx}/assign")
async def assign_item_to_worker(oid: str, item_idx: int, data: AssignItemReq, admin: dict = Depends(require_admin)):
    order = await db.orders.find_one({"_id": ObjectId(oid)})
    if not order: raise HTTPException(404, "Order not found")
    if item_idx >= len(order["items"]): raise HTTPException(400, "Invalid item index")
    worker = await db.users.find_one({"_id": ObjectId(data.worker_id), "role": "worker"}, {"password_hash": 0})
    if not worker: raise HTTPException(404, "Worker not found")
    await db.orders.update_one({"_id": ObjectId(oid)}, {"$set": {f"items.{item_idx}.assigned_worker_id": data.worker_id, f"items.{item_idx}.assigned_worker_name": worker["name"], f"items.{item_idx}.worker_status": "assigned"}})
    o = await db.orders.find_one({"_id": ObjectId(oid)}); o["id"] = str(o["_id"]); del o["_id"]; return o

# ─── WORKER: Get my assigned items ───
@api_router.get("/worker/tasks")
async def get_worker_tasks(user: dict = Depends(get_current_user)):
    if user.get("role") != "worker": raise HTTPException(403)
    tasks = []
    async for o in db.orders.find({"status": {"$in": ["tasdiqlangan","tayyorlanmoqda"]}}):
        for idx, item in enumerate(o.get("items", [])):
            if item.get("assigned_worker_id") == user["id"]:
                tasks.append({"order_id": str(o["_id"]), "order_code": o.get("order_code",""), "dealer_name": o.get("dealer_name",""), "item_index": idx, "material_name": item["material_name"], "width": item["width"], "height": item["height"], "sqm": item["sqm"], "notes": item.get("notes",""), "worker_status": item.get("worker_status","assigned"), "created_at": o["created_at"]})
    return tasks

# ─── WORKER: Mark item as completed ───
@api_router.put("/worker/tasks/{oid}/{item_idx}/complete")
async def complete_worker_task(oid: str, item_idx: int, user: dict = Depends(get_current_user)):
    if user.get("role") != "worker": raise HTTPException(403)
    order = await db.orders.find_one({"_id": ObjectId(oid)})
    if not order: raise HTTPException(404)
    if item_idx >= len(order["items"]): raise HTTPException(400)
    if order["items"][item_idx].get("assigned_worker_id") != user["id"]: raise HTTPException(403, "Not your task")
    await db.orders.update_one({"_id": ObjectId(oid)}, {"$set": {f"items.{item_idx}.worker_status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()}})
    order = await db.orders.find_one({"_id": ObjectId(oid)})
    all_done = all(it.get("worker_status") == "completed" for it in order["items"] if it.get("assigned_worker_id"))
    if all_done:
        await db.orders.update_one({"_id": ObjectId(oid)}, {"$set": {"status": "tayyor", "updated_at": datetime.now(timezone.utc).isoformat()}})
    o = await db.orders.find_one({"_id": ObjectId(oid)}); o["id"] = str(o["_id"]); del o["_id"]; return o

# ─── DELIVERY: Assign delivery info directly to order ───
@api_router.put("/orders/{oid}/delivery")
async def assign_delivery(oid: str, data: DeliveryInfoReq, admin: dict = Depends(require_admin)):
    order = await db.orders.find_one({"_id": ObjectId(oid)})
    if not order: raise HTTPException(404, "Buyurtma topilmadi")
    d_info = {"driver_name": data.driver_name, "driver_phone": data.driver_phone, "plate_number": data.plate_number}
    await db.orders.update_one({"_id": ObjectId(oid)}, {"$set": {"delivery_info": d_info, "status": "yetkazilmoqda", "updated_at": datetime.now(timezone.utc).isoformat()}})
    o = await db.orders.find_one({"_id": ObjectId(oid)}); o["id"] = str(o["_id"]); del o["_id"]; return o

# ─── DELIVERY: Admin confirms delivery ───
@api_router.put("/orders/{oid}/confirm-delivery")
async def confirm_delivery(oid: str, admin: dict = Depends(require_admin)):
    order = await db.orders.find_one({"_id": ObjectId(oid)})
    if not order: raise HTTPException(404, "Buyurtma topilmadi")
    await db.orders.update_one({"_id": ObjectId(oid)}, {"$set": {"status": "yetkazildi", "updated_at": datetime.now(timezone.utc).isoformat()}})
    o = await db.orders.find_one({"_id": ObjectId(oid)}); o["id"] = str(o["_id"]); del o["_id"]; return o

# ─── CHAT ───
@api_router.post("/messages")
async def send_message(data: MessageCreate, user: dict = Depends(get_current_user)):
    msg = {"sender_id": user["id"], "sender_name": user.get("name",""), "sender_role": user.get("role",""), "receiver_id": data.receiver_id, "text": data.text, "read": False, "created_at": datetime.now(timezone.utc).isoformat()}
    r = await db.messages.insert_one(msg); msg["id"] = str(r.inserted_id); msg.pop("_id", None); return msg

@api_router.get("/messages/{pid}")
async def get_messages(pid: str, user: dict = Depends(get_current_user)):
    q = {"$or": [{"sender_id": user["id"], "receiver_id": pid}, {"sender_id": pid, "receiver_id": user["id"]}]}
    out = []
    async for m in db.messages.find(q).sort("created_at", 1): m["id"] = str(m["_id"]); del m["_id"]; out.append(m)
    await db.messages.update_many({"sender_id": pid, "receiver_id": user["id"], "read": False}, {"$set": {"read": True}})
    return out

@api_router.get("/chat/partners")
async def get_chat_partners(user: dict = Depends(get_current_user)):
    if user.get("role") == "admin":
        out = []
        async for d in db.users.find({"role": {"$in": ["dealer"]}}, {"password_hash": 0}):
            d["id"] = str(d["_id"]); del d["_id"]
            lm = await db.messages.find_one({"$or": [{"sender_id": user["id"], "receiver_id": d["id"]}, {"sender_id": d["id"], "receiver_id": user["id"]}]}, sort=[("created_at", -1)])
            uc = await db.messages.count_documents({"sender_id": d["id"], "receiver_id": user["id"], "read": False})
            d["last_message"] = lm.get("text","") if lm else ""; d["last_message_time"] = lm.get("created_at","") if lm else ""; d["unread_count"] = uc
            out.append(d)
        return out
    else:
        admin = await db.users.find_one({"role": "admin"}, {"password_hash": 0})
        if not admin: return []
        admin["id"] = str(admin["_id"]); del admin["_id"]
        lm = await db.messages.find_one({"$or": [{"sender_id": user["id"], "receiver_id": admin["id"]}, {"sender_id": admin["id"], "receiver_id": user["id"]}]}, sort=[("created_at", -1)])
        uc = await db.messages.count_documents({"sender_id": admin["id"], "receiver_id": user["id"], "read": False})
        admin["last_message"] = lm.get("text","") if lm else ""; admin["last_message_time"] = lm.get("created_at","") if lm else ""; admin["unread_count"] = uc
        return [admin]

# ─── IMAGE UPLOAD ───
@api_router.post("/upload-image")
async def upload_image(file: UploadFile = File(...), user: dict = Depends(require_admin)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Faqat rasm fayllari ruxsat etiladi")
    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = UPLOAD_DIR / filename
    async with aiofiles.open(filepath, "wb") as f:
        content = await file.read()
        await f.write(content)
    image_url = f"/api/uploads/{filename}"
    return {"image_url": image_url}

# ─── STATISTICS ───
@api_router.get("/statistics")
async def get_statistics(admin: dict = Depends(require_admin)):
    pipe = [{"$match": {"status": {"$in": ["tasdiqlangan","tayyorlanmoqda","tayyor","yetkazilmoqda","yetkazildi"]}}}, {"$group": {"_id": None, "total": {"$sum": "$total_price"}}}]
    res = await db.orders.aggregate(pipe).to_list(1)
    return {
        "total_orders": await db.orders.count_documents({}),
        "pending_orders": await db.orders.count_documents({"status": "kutilmoqda"}),
        "approved_orders": await db.orders.count_documents({"status": "tasdiqlangan"}),
        "preparing_orders": await db.orders.count_documents({"status": "tayyorlanmoqda"}),
        "ready_orders": await db.orders.count_documents({"status": "tayyor"}),
        "delivering_orders": await db.orders.count_documents({"status": "yetkazilmoqda"}),
        "delivered_orders": await db.orders.count_documents({"status": "yetkazildi"}),
        "rejected_orders": await db.orders.count_documents({"status": "rad_etilgan"}),
        "total_dealers": await db.users.count_documents({"role": "dealer"}),
        "total_workers": await db.users.count_documents({"role": "worker"}),
        "total_materials": await db.materials.count_documents({}),
        "total_revenue": round(res[0]["total"],2) if res else 0,
    }

# ─── SEED ───
async def seed_admin():
    email = os.environ.get("ADMIN_EMAIL","admin@curtain.uz")
    pw = os.environ.get("ADMIN_PASSWORD","admin123")
    ex = await db.users.find_one({"email": email})
    if not ex:
        await db.users.insert_one({"email": email, "password_hash": hash_password(pw), "name": "Admin", "role": "admin", "created_at": datetime.now(timezone.utc).isoformat()})
        logger.info(f"Admin yaratildi: {email}")
    elif not verify_password(pw, ex["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(pw)}})
    if await db.materials.count_documents({}) == 0:
        await db.materials.insert_many([
            {"name":"Blackout Parda","category":"Parda","price_per_sqm":7.0,"stock_quantity":500,"unit":"kv.m","description":"Yorug'lik o'tkazmaydigan parda","image_url":"https://images.pexels.com/photos/4814070/pexels-photo-4814070.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940","created_at":datetime.now(timezone.utc).isoformat()},
            {"name":"Tull Parda","category":"Parda","price_per_sqm":3.5,"stock_quantity":800,"unit":"kv.m","description":"Shaffof tull parda","image_url":"https://images.unsplash.com/photo-1574197635162-68e4b468e4e9?w=600","created_at":datetime.now(timezone.utc).isoformat()},
            {"name":"Roller Jalyuzi","category":"Jalyuzi","price_per_sqm":10.0,"stock_quantity":300,"unit":"kv.m","description":"Zamonaviy roller jalyuzi","image_url":"https://images.pexels.com/photos/19166538/pexels-photo-19166538.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940","created_at":datetime.now(timezone.utc).isoformat()},
            {"name":"Gorizontal Jalyuzi","category":"Jalyuzi","price_per_sqm":8.0,"stock_quantity":400,"unit":"kv.m","description":"Alyuminiy gorizontal jalyuzi","image_url":"https://images.unsplash.com/photo-1603299938527-d035bc6fc2c8?w=600","created_at":datetime.now(timezone.utc).isoformat()},
            {"name":"Vertikal Jalyuzi","category":"Jalyuzi","price_per_sqm":6.0,"stock_quantity":350,"unit":"kv.m","description":"Ofis uchun vertikal jalyuzi","image_url":"https://images.pexels.com/photos/8955198/pexels-photo-8955198.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940","created_at":datetime.now(timezone.utc).isoformat()},
            {"name":"Rimskaya Parda","category":"Parda","price_per_sqm":9.0,"stock_quantity":200,"unit":"kv.m","description":"Premium rimskaya parda","image_url":"https://images.unsplash.com/photo-1729277980958-092c5e9e2ea4?w=600","created_at":datetime.now(timezone.utc).isoformat()},
        ])
        logger.info("Materiallar yaratildi")
    if not await db.users.find_one({"email": "dealer@test.uz"}):
        await db.users.insert_one({"email":"dealer@test.uz","password_hash":hash_password("dealer123"),"name":"Test Diler","role":"dealer","phone":"+998901234567","address":"Toshkent, Yunusobod","credit_limit":5000,"debt":0,"created_at":datetime.now(timezone.utc).isoformat()})
        logger.info("Demo diler yaratildi")
    if not await db.users.find_one({"email": "worker@test.uz"}):
        await db.users.insert_one({"email":"worker@test.uz","password_hash":hash_password("worker123"),"name":"Aziz Ishchi","role":"worker","phone":"+998901112233","specialty":"Jalyuzi o'rnatish","created_at":datetime.now(timezone.utc).isoformat()})
        logger.info("Demo ishchi yaratildi")

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.messages.create_index([("sender_id",1),("receiver_id",1)])
    await db.orders.create_index("dealer_id")
    await db.orders.create_index("order_code")
    # Fix old orders without order_code
    async for o in db.orders.find({"$or": [{"order_code": {"$exists": False}}, {"order_code": ""}]}):
        await db.orders.update_one({"_id": o["_id"]}, {"$set": {"order_code": generate_order_code()}})
    await seed_admin()
    logger.info("Server ishga tushdi!")

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("shutdown")
async def shutdown_db_client(): client.close()
