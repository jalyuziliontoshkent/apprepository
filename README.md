# Lion Blinds — bitta repoda backend + mobil ilova

| Papka | Nima |
|--------|------|
| `backend/` | FastAPI API |
| `frontend/` | Expo (React Native) — `eas build` |
| `render.yaml` | **Render Blueprint** — bitta fayl bilan API deploy |
| `requirements.txt` | Repozitoriy **ildizida** — Render shu yerdan `pip install` qiladi |

`.env` fayllar Git ga tushmasin (`.gitignore` da).

---

## Render: faqat **Blueprint** yo‘li (tavsiya)

[Render Blueprint](https://render.com/docs/infrastructure-as-code) — `render.yaml` repoda turadi, Render uni o‘qib servisni yaratadi/yangilaydi.

### 1-qadam: Kod GitHub da

Repoda `main` branchda `render.yaml` va `requirements.txt` **ildizda** bo‘lishi kerak.  
Masalan: [github.com/jalyuziliontoshkent/apprepository](https://github.com/jalyuziliontoshkent/apprepository)

### 2-qadam: Render da Blueprint yaratish

1. [dashboard.render.com](https://dashboard.render.com) ga kiring.
2. Yuqoridan **New +** → **Blueprint**.
3. **Connect account** orqali GitHub ni ulang (agar ulanmagan bo‘lsa).
4. Repository sifatida **apprepository** (yoki o‘z reponingizni) tanlang.
5. **Branch**: `main`.
6. **Blueprint path**: bo‘sh qoldiring yoki `render.yaml` (odatda ildizdagi `render.yaml` avtomatik topiladi).
7. **Apply** yoki **Connect** ni bosing.

### 3-qadam: Muhit o‘zgaruvchilari (birinchi marta)

`render.yaml` da `sync: false` bo‘lgan o‘zgaruvchilar Git da **yo‘q** — Render ularni sizdan so‘raydi:

| O‘zgaruvchi | Nima qo‘yish kerak |
|-------------|-------------------|
| **DATABASE_URL** | Supabase → **Project Settings** → **Database** → connection string → **URI** (Transaction **pooler**, odatda port **6543**). To‘liq `postgresql://...` qator. |
| **JWT_SECRET** | O‘zingiz yozing: uzun, tasodifiy matn (masalan 40+ belgi). Login JWT imzosi uchun. |

Qiymatlarni Blueprint formasida kiriting, keyin deploy davom etadi.

### 4-qadam: Tekshirish

- Render servis sahifasida **URL** chiqadi: `https://lion-blinds-backend.onrender.com` (yoki siz tanlagan nom).
- Brauzerda oching: `https://<SIZNING-URL>/api/health` → muvaffaqiyatli javob kutiladi.

### 5-qadam: Mobil ilova

Render dan chiqqan HTTPS URL ni `frontend/eas.json` ichidagi `EXPO_PUBLIC_BACKEND_URL` ga qo‘ying, keyin:

```bash
cd frontend
npx eas build --platform android --profile production
```

---

## `render.yaml` ichida nima bor (qisqa)

Quyidagilar shu repodagi `render.yaml` orqali belgilanadi ([Blueprint spec](https://render.com/docs/blueprint-spec)):

| Maydon | Bizda qiymat | Ma’nosi |
|--------|----------------|---------|
| **runtime** | `python` | Python web servis |
| **buildCommand** | `pip install -r requirements.txt` | Ildizdagi `requirements.txt` dan kutubxonalar |
| **startCommand** | `uvicorn backend.server:app --host 0.0.0.0 --port $PORT` | FastAPI ilovasini ishga tushirish; `$PORT` Render beradi |
| **healthCheckPath** | `/api/health` | Deploy va monitoring uchun tekshiruv |
| **envVars** … **sync: false** | `DATABASE_URL`, `JWT_SECRET` | Maxfiy qiymatlar faqat Dashboard da |

Blueprint yangilanganda (`render.yaml` o‘zgarganda) Git ga **push** qiling — Render odatda avtomatik qayta deploy qiladi (**Auto-Deploy** yoqilgan bo‘lsa).

---

## GitHub ga yangi push (qisqa)

```bash
git add -A
git commit -m "Izoh"
git push origin main
```

(`origin` sizda qaysi remote bo‘lsa — masalan `apprepository`.)

---

## Eslatmalar

- **Free** rejimda server uxlaganda birinchi so‘rov 30–60 soniya cho‘zilishi mumkin.
- Yuklangan rasmlar `backend/uploads` da; bepul instans diskini tekshiring — muhim fayllar uchun keyinroq obyekt storage rejalashtirish mumkin.

### Deploy logda `UnicodeEncodeError` / `idna` / hostname bo‘sh

Odatda **DATABASE_URL** noto‘g‘ri nusxalangan:

1. Supabase’dan **to‘liq** URI ni oling (user `postgres.xxxxx`, host `aws-0-....pooler.supabase.com`, port **6543**).
2. Parolda `@`, `:`, `#`, `%` bo‘lsa — Supabase UI ba’zan encode qiladi; qo‘lda yozsangiz **URL encode** qiling.
3. Qiymat boshida/yakunida **qo'shtirnoq**, **nuqta**, yangi qator bo‘lmasin.
4. Repoda `PYTHON_VERSION=3.12.8` (`render.yaml` + `.python-version`) — Renderda Python barqaror versiya ishlatiladi.
