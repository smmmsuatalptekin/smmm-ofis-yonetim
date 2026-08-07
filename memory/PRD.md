# PRD — SMMM Ofis Yönetim ve Mükellef Takip Platformu

## Problem Statement
Türkiye'de faaliyet gösteren Serbest Muhasebeci Mali Müşavirler (SMMM) için web tabanlı ERP/CRM. Mükellef yönetimi, beyanname süreçleri, e-Defter, cari hesap/tahsilat, görevler, takvim, bildirimler, personel ve denetim kaydını tek platformda toplar. Amaç: "Hangi müşterinin hangi işi kaldı?" sorusunu ortadan kaldırmak.

## Architecture
- Frontend: React 19 + Tailwind + shadcn/ui, IBM Plex Sans/Inter, light+dark tema, Ctrl+K command palette. Router-based SPA.
- Backend: FastAPI, tüm rotalar `/api` prefix. JWT httpOnly cookie auth (bcrypt), RBAC, audit logging.
- DB: MongoDB (collections: users, clients, declarations, edefter, transactions, tasks, calendar_events, audit_logs).
- AI: Emergent LLM key (openai gpt-4o-mini) ile veri-temelli Türkçe ofis asistanı.

## User Personas / Roles
Admin, Mali Müşavir, Ofis Yöneticisi, Kıdemli Personel, Muhasebe, Bordro, Stajyer, Salt Okuma.

## Implemented (2026-08 — Phase 1) — verified 100% backend & frontend
- JWT auth + admin/personel seeding, RBAC (kullanıcı & audit admin-only)
- Dashboard: KPI kartları (aktif mükellef, bekleyen beyanname, eksik e-Defter, alacak, tahsilat, açık/gecikmiş görev), grafikler, yaklaşan son tarihler, en borçlu mükellefler — kartlar tıklanabilir
- Mükellef yönetimi: liste + arama/filtre, ekleme dialog, detay sayfası (Genel/Cari/Görevler/Beyanname sekmeleri)
- Beyanname takip grid'i: satır=mükellef, sütun=beyanname, dropdown ile hızlı durum değiştirme, dönem seçimi, toplu güncelleme API
- e-Defter: dönem bazında 6 aşama checkbox takibi, eksik uyarısı
- Cari hesap & tahsilat: bakiye, hareket ekleme, aylık ücret otomatik tahakkuku (idempotent)
- Görevler: CRUD, öncelik, son tarih, durum, sorumlu
- Takvim: aylık görünüm + etkinlik ekleme
- Bildirim merkezi: gecikmiş beyanname & alacak bazlı otomatik üretim (kritik/uyarı/bilgi)
- Akıllı asistan: doğal dil sorgu, sadece ofis verisi üzerinde
- Personel yönetimi (RBAC), Audit log
- Akıllı son tarih motoru (renk kodlu risk), demo veriler

## Backlog
### P1
- e-Tebligat modülü (modüler connector mimarisi, manuel/dosya import)
- Şifre kasası (AES-256 encryption at rest, view-reauth, MFA)
- Belge arşivi (object storage), Excel import/export, mükelleften evrak takibi
- SGK/Bordro operasyon takibi, tekrarlayan görev otomasyonu
- Gelişmiş raporlama (tarih filtresi, PDF/Excel export), otomatik borç hatırlatma (WhatsApp/SMS/e-posta taslak)
- Kullanıcı bazında mükellef erişim kısıtı, saved views, toplu işlemler UI

### P2
- Müşteri portalı, GİB/e-Defter/e-Fatura/SGK resmi entegrasyonlar
- Google/Microsoft Calendar sync, mükellef risk skoru, iletişim geçmişi

## Test Credentials
Admin: smmmsuatalptekin@gmail.com / Smmm2026! · Personel: ayse@ofis.com / Ofis2026!
