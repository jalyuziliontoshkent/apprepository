# Lion Blinds — bitta repoda backend + mobil ilova

| Papka | Nima |
|--------|------|
| `backend/` | FastAPI API (Render da shu qism deploy qilinadi) |
| `frontend/` | Expo (React Native) — telefon uchun `eas build` |
| `render.yaml` | Render Blueprint — API ni avtomatik sozlash uchun |
| `requirements.txt` | Repozitoriy ildizida — Render `pip install` shu fayldan |

## 1. GitHub (yoki boshqa Git) ga yuklash

Repozitoriy ildizidan:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/SIZNING_USER/SIZNING_REPO.git
git branch -M main
git push -u origin main
```

`.env` fayllarni **hech qachon** commit qilmang — ular `.gitignore` da.

## 2. Render da backend deploy

1. [Render](https://render.com) ga kiring → **New** → **Blueprint** (yoki **Web Service**).
2. Git repongizni ulang, branch: `main`.
3. `render.yaml` tanlansin (ildizda turadi).
4. Birinchi deployda Render **DATABASE_URL** va **JWT_SECRET** so‘raydi:
   - **DATABASE_URL** — Supabase → Project Settings → Database → **URI** (Transaction pooler, odatda port `6543`).
   - **JWT_SECRET** — ixtiyoriy uzun tasodifiy qator (login JWT uchun).
5. Deploy tugagach, API manzilingiz chiqadi: `https://lion-blinds-backend.onrender.com` (yoki siz bergan nom).

Tekshirish brauzerda: `https://SIZNING_URL.onrender.com/api/health`

## 3. Mobil ilova (EAS) — backend manzili

`frontend/eas.json` ichidagi `EXPO_PUBLIC_BACKEND_URL` ni o‘z Render URL ingizga qo‘ying, keyin:

```bash
cd frontend
npx eas build --platform android --profile production
```

Mahalliy Expo uchun `frontend/.env` da ham xuddi shu URL bo‘lishi mumkin.

## 4. Eslatmalar

- Render **Free** rejimida birinchi so‘rov server uxlaganda biroz uzoqroq kutishi mumkin — ilovada timeout allaqachon kengaytirilgan.
- Rasmlar `backend/uploads` da saqlanadi; Free web servisda disk **tayyor deploy** bilan tozalanishi mumkin — muhim fayllar uchun keyinroq S3/Supabase Storage ko‘rib chiqing.
