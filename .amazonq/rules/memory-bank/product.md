# Lion Blinds — Product Overview

## Purpose
Lion Blinds is a B2B order management platform for a blinds/curtain manufacturing and distribution business in Uzbekistan. It connects three user roles — Admin, Dealers, and Workers — through a mobile app backed by a REST API.

## Value Proposition
- Dealers can browse materials, place curtain/blind orders with precise measurements, and track order status in real time.
- Admins manage the full order lifecycle: approve, assign to workers, dispatch delivery, and confirm receipt.
- Workers receive assigned tasks, mark items as completed, and trigger automatic inventory deduction.
- All financial flows (dealer debt, payments, credit limits) are tracked automatically.

## Key Features
- **Role-based access**: admin / dealer / worker with JWT authentication
- **Order lifecycle**: kutilmoqda → tasdiqlangan → tayyorlanmoqda → tayyor → yetkazilmoqda → yetkazildi (or rad_etilgan)
- **Inventory management**: automatic stock deduction when orders reach production/delivery stages; low-stock alerts
- **Billing**: area-based pricing (kv.m), billable area rounded up to 0.5 m² steps, USD pricing with live CBU.uz exchange rate
- **Worker task assignment**: per-item worker assignment; auto-advance order to "tayyor" when all items completed
- **Delivery tracking**: driver name, phone, plate number stored per order
- **Chat**: dealer ↔ admin messaging with unread counts
- **Reports & Excel export**: weekly/monthly revenue, top materials, top dealers, daily chart, downloadable .xlsx
- **Push notifications**: Expo push token storage per user
- **Image upload**: admin-only material image upload, served as static files

## Target Users
| Role | Use Case |
|------|----------|
| Admin | Full platform management, approvals, reports, payments |
| Dealer | Browse catalog, place orders, track status, chat with admin |
| Worker | View assigned tasks, mark items complete |

## Business Domain
- Products: pardalar (curtains), jalyuzilar (blinds), aksessuarlar
- Currency: USD prices, UZS display via live CBU rate
- Location: Uzbekistan (Uzbek-language UI and status labels)
