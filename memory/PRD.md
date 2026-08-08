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

## GİB Entegrasyon (2026-06 — v1.1) — GERÇEK e-Beyan API desteği eklendi
- Resmi doküman doğrulandı: eBeyanname Kullanıcı REST API v1.2.0 (ebeyan.gib.gov.tr)
- Salt-okunur uç: `POST /beyanname/mukellef` (getirMukellefBeyannameleri); bağlantı testi: `GET /beyanname/tur`
- Bearer token auth + zorunlu header'lar: CHANNEL, MUKELLEF-VKN (mükellef bazlı), ENTEGRATOR
- Durum eşleme genişletildi: TASLAK/IPTAL_EDILDI/ONAY_BEKLIYOR/HATALI/ONAYLANDI/KOPYALANIYOR/SILINDI
- MOCK MOD (varsayılan, GIB_MOCK_MODE=true) korunur; GERÇEK GİB için env: GIB_API_BASE_URL, GIB_API_TOKEN, GIB_CHANNEL, GIB_INTEGRATOR_IDENTITY, GIB_TIMEOUT
- UI: net MOCK MOD / GERÇEK GİB rozeti + "Bağlantıyı Test Et" butonu; kullanıcı dostu hata mesajları (401/403/404/429/5xx/timeout)
- Yeni endpoint: `POST /api/gib/test-connection`. Mevcut beyanname kayıtları BOZULMADAN yalnızca gib_* alanları $set edilir.
- Token asla frontend/Mongo/log/audit'e yazılmaz. Test verileri sorgu sonrası temizlendi.
- Not: Gerçek mod yalnızca geçerli entegratör token'ı ile runtime doğrulanabilir (mock modda test edildi).

## Dijital Vergi Dairesi e-Tebligat (2026-06 — v1, read-only sync) — MOCK test edildi
- Amaç: mükellef DVD erişim bilgileriyle giriş denemesi, e-Tebligat listesini SALT OKUNUR çekme + uygulamaya aktarma. Cevap/silme/okundu değiştirme YOK, CAPTCHA/MFA bypass YOK.
- Credential Vault: Fernet (cryptography) encryption-at-rest, `CREDENTIAL_ENCRYPTION_KEY` (env). API asla şifre döndürmez; UI "Kayıtlı / Kayıtlı Değil". clients.dvd_credentials = {kullanici_kodu,parola,sifre} ciphertext.
- Servis katmanı: services/dvd_crypto.py, dvd_selectors.py (merkezi DOM selector — gerçek mod), dvd_client.py (mock+Playwright), etebligat_sync.py (dedup + PDF store + audit).
- Koleksiyon: `etebligat` (unique: client_id + remote_tebligat_id; alanlar: belge_no/turu/gonderen/konu/belge_tarihi/teblig_tarihi/okunma_durumu/son_islem_tarihi/pdf_document_id). PDF'ler mevcut documents storage'a (UPLOAD_DIR) indirilir, Base64 DEĞİL.
- Durumlar: BAŞARILI, GİRİŞ_BAŞARISIZ, MANUEL_DOGRULAMA_GEREKLI, SİSTEM_ULAŞILAMIYOR, SAYFA_YAPISI_DEĞİŞTİ, KAYIT_BULUNAMADI.
- API: GET/PUT/DELETE /api/clients/{cid}/dvd-credentials, POST /api/clients/{cid}/etebligat/check, GET /api/clients/{cid}/etebligat, GET /api/clients/{cid}/etebligat/{eid}/document, GET /api/etebligat/overview, POST /api/etebligat/check.
- UI: Mükellef detay > 'e-Tebligat' sekmesi + 'e-Tebligatları Kontrol Et'; /etebligat ana ekran 'Seçili Mükellefleri Kontrol Et' + MOCK MOD rozeti. İlk sürümde otomatik zamanlayıcı YOK.
- Mock senaryo tetik: POST body {"scenario":"fail|mfa|down|empty"}; default BAŞARILI.
- Güvenlik: kullanıcı kodu/parola/şifre/token log/audit/response'a yazılmaz. Test: backend 20/20 pytest, frontend 100% (iteration_2.json).
- ⚠️ Gerçek Playwright otomasyonu bu ortamda CANLIYA karşı doğrulanmadı; selector'lar (dvd_selectors.py, verified=False) canlı portaldan teyit edilmeli. Local Docker: `docker compose up -d --build backend` (Dockerfile playwright chromium kurar).

## Backlog
### P1
- e-Tebligat modülü (modüler connector mimarisi, manuel/dosya import)
- Şifre kasası (AES-256 encryption at rest, view-reauth, MFA)
- SGK/Bordro operasyon takibi, tekrarlayan görev otomasyonu
- Gelişmiş raporlama (tarih filtresi, PDF/Excel export), otomatik borç hatırlatma (WhatsApp/SMS/e-posta taslak)
- Kullanıcı bazında mükellef erişim kısıtı, saved views, toplu işlemler UI

### P2
- Müşteri portalı, GİB/e-Defter/e-Fatura/SGK resmi entegrasyonlar
- Google/Microsoft Calendar sync, mükellef risk skoru, iletişim geçmişi

## Test Credentials
Admin: smmmsuatalptekin@gmail.com / Smmm2026! · Personel: ayse@ofis.com / Ofis2026!
