# 🚀 Lion Blinds App - Production Deployment Guide

## 📋 Table of Contents
1. [System Architecture](#system-architecture)
2. [Authentication Flow](#authentication-flow)
3. [Environment Variables](#environment-variables)
4. [Backend Deployment (Render)](#backend-deployment-render)
5. [Frontend Deployment (EAS)](#frontend-deployment-eas)
6. [Security Configuration](#security-configuration)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## System Architecture

### Backend Structure
```
backend/
├── server.py              # Main FastAPI application
├── modules/
│   ├── auth/              # Authentication module
│   │   ├── dependencies.py    # Auth middleware (get_current_user, require_admin, etc.)
│   │   └── security.py        # Token creation, password hashing
│   ├── common/            # Shared utilities
│   │   ├── config.py          # Settings management
│   │   ├── indexes.py         # Database indexes
│   │   ├── logging.py         # Logging configuration
│   │   └── middleware.py      # Global middleware
│   └── settings/          # Settings module
├── tests/                 # Test suite
└── requirements.txt       # Python dependencies
```

### Frontend Structure
```
frontend/
├── app/                   # Expo Router pages
│   ├── _layout.tsx        # Root layout with AuthGuard
│   ├── index.tsx          # Login page
│   ├── register.tsx       # Registration page
│   ├── admin/             # Admin routes
│   ├── dealer/            # Dealer routes
│   └── worker/            # Worker routes
├── src/
│   ├── modules/auth/      # Auth module
│   │   ├── AuthService.ts     # Login, register, refresh, logout
│   │   └── contracts.ts       # TypeScript interfaces
│   ├── services/          # API layer
│   │   ├── api.ts             # Core API client with token refresh
│   │   ├── apiClient.ts       # Backend URL resolver
│   │   └── errors.ts          # Error handling
│   ├── store/
│   │   └── useAuthStore.ts    # Zustand auth state + AsyncStorage
│   └── components/        # Shared components
├── eas.json               # EAS build configuration
└── app.json               # Expo configuration
```

---

## Authentication Flow

### 1. Login Flow
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│   Login     │────▶│   Backend    │────▶│   PostgreSQL │────▶│   Issue     │
│   Page      │     │   /login     │     │   Verify     │     │   Tokens    │
└─────────────┘     └──────────────┘     └─────────────┘     └─────────────┘
                                                                      │
                                                                      ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│   Store     │◀────│   Persist    │◀────│   Return    │◀────│   Access +  │
│   (Zustand) │     │   AsyncStore │     │   Response  │     │   Refresh   │
└─────────────┘     └──────────────┘     └─────────────┘     └─────────────┘
```

### 2. Token Refresh Flow (Automatic)
```
1. API request made with access token
2. If 401 received → automatically call /auth/refresh
3. Use refresh token to get new access token
4. Retry original request with new token
5. If refresh fails → logout user
```

### 3. Logout Flow
```
1. Call /auth/logout with both tokens
2. Backend revokes refresh token in database
3. Backend revokes access token (adds to revoked_tokens table)
4. Frontend clears AsyncStorage
5. Frontend clears Zustand store
6. Redirect to login
```

### 4. Auto-Login on App Start
```
1. App loads → AuthGuard initializes
2. Check AsyncStorage for persisted session
3. If session exists → restore to Zustand store
4. Call AuthService.refreshSession()
5. If valid → redirect to role-based dashboard
6. If invalid → stay on login page
```

---

## Environment Variables

### Backend (Render Environment Variables)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | - | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | - | Random secret for token signing (min 32 chars) |
| `APP_ENV` | ❌ | `development` | `development` or `production` |
| `ACCESS_TOKEN_MINUTES` | ❌ | `30` | Access token lifetime in minutes |
| `REFRESH_TOKEN_DAYS` | ❌ | `30` | Refresh token lifetime in days |
| `PASSWORD_HASH_ROUNDS` | ❌ | `12` | Bcrypt cost factor (10-14 recommended) |
| `CORS_ORIGINS` | ❌ | localhost | Comma-separated allowed origins |
| `ENABLE_DEMO_SEED_DATA` | ❌ | `false` | Auto-create demo data (production: false) |
| `ASYNCPG_STRICT_SSL` | ❌ | `false` | Enable strict SSL verification |

### Frontend (EAS Build Environment Variables)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_BACKEND_URL` | ✅ | Backend API URL (e.g., `https://api.example.com`) |

### Local Development (.env files)

**backend/.env:**
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
APP_ENV=development
ACCESS_TOKEN_MINUTES=30
REFRESH_TOKEN_DAYS=30
PASSWORD_HASH_ROUNDS=12
CORS_ORIGINS=http://localhost:19006,http://127.0.0.1:19006
ENABLE_DEMO_SEED_DATA=true
```

**frontend/.env:**
```env
EXPO_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
```

---

## Backend Deployment (Render)

### 1. Create PostgreSQL Database
- Use **Supabase** or **Render PostgreSQL**
- Copy the connection string (DSN)
- For Supabase: Use the Pooler connection string (port 6543)

### 2. Create Web Service on Render
1. Sign up/login to [render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `lion-blinds-backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn backend.server:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/api/health`

### 3. Set Environment Variables in Render Dashboard
```
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres
JWT_SECRET=your-secure-random-secret-minimum-32-characters-long
APP_ENV=production
ACCESS_TOKEN_MINUTES=30
REFRESH_TOKEN_DAYS=30
PASSWORD_HASH_ROUNDS=12
CORS_ORIGINS=https://your-frontend-url.expo.app
ENABLE_DEMO_SEED_DATA=false
```

### 4. Deploy
- Click "Create Web Service"
- Wait for build to complete
- Verify `/api/health` returns `{"status": "ok"}`

---

## Frontend Deployment (EAS)

### 1. Prerequisites
```bash
cd frontend
npm install -g eas-cli
npx expo login
```

### 2. Configure EAS Project
```bash
eas build:configure
```

### 3. Set EAS Secrets (Required)
```bash
# Set production backend URL
eas secret:create --scope project --name EXPO_PUBLIC_BACKEND_URL --value "https://your-backend.onrender.com"

# Verify secrets
eas secret:list
```

### 4. Build for Production

**Android (APK):**
```bash
cd frontend
eas build --platform android --profile production
```

**iOS:**
```bash
cd frontend
eas build --platform ios --profile production
```

**Play Store (AAB):**
```bash
cd frontend
eas build --platform android --profile playstore
```

### 5. Submit to Stores (Optional)
```bash
# Requires play-store-credentials.json in frontend directory
eas submit --platform android
```

---

## Security Configuration

### 1. CORS (Cross-Origin Resource Sharing)
Backend only allows requests from configured origins:

```python
# backend/modules/common/config.py
CORS_ORIGINS=https://your-frontend-1.expo.app,https://your-frontend-2.expo.app
```

**Never use `*` in production!**

### 2. JWT Security
- Access tokens: Short-lived (15-30 minutes)
- Refresh tokens: Long-lived (7-30 days), stored hashed in database
- Token revocation on logout
- Automatic cleanup of expired tokens

### 3. Password Security
- Bcrypt hashing with cost factor 12 (configurable)
- Minimum password length: 8 characters
- Passwords never returned in API responses

### 4. Database Security
- SSL/TLS enforced for external connections
- Connection pooling with asyncpg
- Parameterized queries (SQL injection prevention)

---

## Testing

### Backend Tests

**Local Testing:**
```bash
cd backend
# Ensure .env is configured
python -m pytest tests/ -v
```

**Auth Flow Test:**
```bash
cd backend
# Start backend first
python -m pytest tests/test_auth_session_flow.py -v
```

**Full API Test:**
```bash
# From project root
export BACKEND_URL=http://127.0.0.1:8000/api
export TEST_ADMIN_EMAIL=admin@test.uz
export TEST_ADMIN_PASSWORD=testpass123
export TEST_DEALER_EMAIL=dealer@test.uz
export TEST_DEALER_PASSWORD=testpass123
export TEST_WORKER_EMAIL=worker@test.uz
export TEST_WORKER_PASSWORD=testpass123

python backend_test.py
```

### Frontend Tests

```bash
cd frontend
npm test
```

---

## Troubleshooting

### Backend Issues

**Database Connection Failed:**
- Check `DATABASE_URL` format
- Verify network access (firewall)
- For Supabase: Use Pooler URL (port 6543)

**CORS Errors:**
- Verify `CORS_ORIGINS` includes frontend URL
- Check protocol (http vs https)
- Include port if non-standard

**JWT Validation Failed:**
- Ensure `JWT_SECRET` is set
- Check token expiration times
- Verify server time is correct

### Frontend Issues

**Cannot Connect to Backend:**
- Verify `EXPO_PUBLIC_BACKEND_URL` is set in EAS
- Check if backend `/api/health` responds
- Test with local backend first

**Auto-Login Not Working:**
- Check AsyncStorage persistence
- Verify token refresh logic
- Check AuthGuard logs in console

### EAS Build Issues

**Build Fails:**
- Ensure `EXPO_PUBLIC_BACKEND_URL` is set as EAS secret
- Check `eas.json` configuration
- Verify Expo account permissions

---

## API Endpoints Reference

### Authentication
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/register` | POST | No | Register new dealer |
| `/api/auth/login` | POST | No | Login (returns tokens) |
| `/api/auth/refresh` | POST | No | Refresh access token |
| `/api/auth/logout` | POST | Yes | Logout (revoke tokens) |
| `/api/auth/me` | GET | Yes | Get current user |
| `/api/auth/profile` | PUT | Yes | Update profile |

### Core Resources
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | No | Health check |
| `/api/dealers` | CRUD | Admin | Manage dealers |
| `/api/workers` | CRUD | Admin | Manage workers |
| `/api/categories` | CRUD | Admin | Material categories |
| `/api/materials` | CRUD | Admin/Dealer | Inventory management |
| `/api/orders` | CRUD | All roles | Order management |

---

## Production Checklist

- [ ] Backend deployed on Render with health check passing
- [ ] Database migrated and indexes created
- [ ] Environment variables configured (no hardcoded secrets)
- [ ] CORS origins restricted to production domains
- [ ] JWT_SECRET is strong (32+ random characters)
- [ ] Demo seed data disabled (`ENABLE_DEMO_SEED_DATA=false`)
- [ ] Frontend EAS secrets configured
- [ ] Production build successful (APK/AAB)
- [ ] Login → Dashboard flow tested
- [ ] Token refresh working
- [ ] Logout working
- [ ] Auto-login on app restart tested

---

## Support

For issues or questions:
1. Check logs in Render Dashboard (backend)
2. Check EAS build logs (frontend)
3. Test API endpoints with curl/Postman
4. Review this guide and environment variables

**System Status:**
- Backend: Check `/api/health`
- Frontend: Verify network requests in app logs
