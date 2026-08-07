# SMMM Ofis Yönetim ve Mükellef Takip Platformu

Türkiye'de faaliyet gösteren Serbest Muhasebeci Mali Müşavirler (SMMM) için profesyonel, web tabanlı **ERP / CRM** sistemi. Mükellef yönetimi, beyanname takibi, e-Defter, cari hesap/tahsilat, görevler, takvim, bildirimler, personel ve denetim kaydını tek platformda toplar.

> **Amaç:** "Acaba hangi müşterinin hangi işi kalmıştı?" sorusunu ortadan kaldırmak. Mali müşavir uygulamayı açtığında ofisinin durumunu birkaç saniyede görür.

---

## İçindekiler
- [Teknoloji Yığını](#teknoloji-yığını)
- [Özellikler (Faz 1)](#özellikler-faz-1)
- [Proje Yapısı](#proje-yapısı)
- [Hızlı Başlangıç — Docker ile](#hızlı-başlangıç--docker-ile)
- [Manuel Kurulum (Docker'sız)](#manuel-kurulum-dockersız)
- [Ortam Değişkenleri](#ortam-değişkenleri)
- [Varsayılan Giriş Bilgileri](#varsayılan-giriş-bilgileri)
- [Veritabanı Şeması](#veritabanı-şeması)
- [API Uç Noktaları](#api-uç-noktaları)
- [Güvenlik Notları](#güvenlik-notları)
- [Sonraki Fazlar](#sonraki-fazlar)

---

## Teknoloji Yığını
| Katman     | Teknoloji                                              |
|------------|--------------------------------------------------------|
| Frontend   | React 19 (CRA), Tailwind CSS, shadcn/ui, Recharts, lucide-react |
| Backend    | FastAPI (Python 3.11), Motor (async MongoDB), PyJWT, bcrypt |
| Veritabanı | MongoDB 7                                              |
| Kimlik Doğ.| JWT (httpOnly cookie) + rol bazlı erişim (RBAC)        |
| AI Asistan | Emergent Universal LLM Key (OpenAI gpt-4o-mini)        |

---

## Özellikler (Faz 1)
- **Kimlik & Güvenlik:** JWT httpOnly cookie girişi, bcrypt hash, RBAC (Admin, Mali Müşavir, Ofis Yöneticisi, Kıdemli, Muhasebe, Bordro, Stajyer, Salt Okuma), değiştirilemez denetim kaydı (audit log).
- **Dashboard:** Tıklanabilir KPI kartları, grafikler, yaklaşan/gecikmiş son tarihler, en borçlu mükellefler.
- **Mükellef Yönetimi:** Liste + arama/filtre, ekleme/**düzenleme**/**silme** (soft delete), sekmeli detay sayfası.
- **Beyanname Takip:** Excel benzeri grid (satır=mükellef, sütun=beyanname türü), dropdown ile hızlı durum değişimi, dönem seçimi, toplu güncelleme.
- **e-Defter:** Dönem bazında 6 aşamalı checkbox takibi + eksik uyarısı.
- **Cari Hesap & Tahsilat:** Bakiye, hareket girişi, aylık ücret otomatik tahakkuku (idempotent).
- **Görevler, Takvim, Bildirim Merkezi, Personel, Raporlar** ve doğal dil **Akıllı Asistan**.
- Açık/Koyu tema, `Ctrl+K` komut menüsü, gerçekçi Türkçe demo veriler.

---

## Proje Yapısı
```
.
├── docker-compose.yml          # Tek komutla frontend + backend + MongoDB
├── .env.example                # Kök ortam değişkenleri (docker-compose okur)
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── .env.example
│   ├── requirements.txt
│   └── server.py               # Tüm API (/api prefix), modeller, seed
└── frontend/
    ├── Dockerfile
    ├── .env.example
    ├── package.json
    ├── tailwind.config.js
    └── src/
        ├── App.js              # Router + provider'lar
        ├── lib/api.js          # axios (withCredentials), durum renkleri
        ├── context/AuthContext.js
        ├── components/         # Layout, CommandPalette, ui/ (shadcn)
        └── pages/              # Dashboard, Clients, Declarations, ...
```

---

## Hızlı Başlangıç — Docker ile

**Gereksinim:** Docker + Docker Compose.

```bash
# 1) Ortam dosyasını hazırlayın
cp .env.example .env
#    .env içinde JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD ve (isteğe bağlı) EMERGENT_LLM_KEY değerlerini düzenleyin.

# 2) Rastgele JWT anahtarı üretmek için:
python -c "import secrets; print(secrets.token_hex(32))"

# 3) Tüm servisleri başlatın
docker compose up -d

# 4) Logları izleyin (opsiyonel)
docker compose logs -f backend
```

Erişim:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8001/api
- **MongoDB:** localhost:27017

Durdurma / temizleme:
```bash
docker compose down            # servisleri durdur
docker compose down -v         # verileri de sil (MongoDB volume dahil)
```

> İlk açılışta backend, admin hesabını ve gerçekçi Türkçe demo verileri (8 mükellef, personel, beyanname, cari hareket, görev) otomatik oluşturur.

---

## Manuel Kurulum (Docker'sız)

### Ön koşullar
- Python 3.11+, Node.js 20+, Yarn, çalışan bir MongoDB (localhost:27017).

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
cp .env.example .env            # MONGO_URL=mongodb://localhost:27017 olacak şekilde
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend
```bash
cd frontend
cp .env.example .env            # REACT_APP_BACKEND_URL=http://localhost:8001
yarn install
yarn start
```

---

## Ortam Değişkenleri

### Backend (`backend/.env`)
| Değişken            | Açıklama                                                        | Örnek |
|---------------------|-----------------------------------------------------------------|-------|
| `MONGO_URL`         | MongoDB bağlantı adresi                                         | `mongodb://localhost:27017` |
| `DB_NAME`           | Veritabanı adı                                                  | `smmm_office` |
| `CORS_ORIGINS`      | İzin verilen origin'ler (virgülle)                              | `*` |
| `FRONTEND_URL`      | Cookie/CORS doğrulaması için frontend origin'i                  | `http://localhost:3000` |
| `JWT_SECRET`        | JWT imzalama anahtarı (rastgele 64 hex)                         | `a1b2...` |
| `ADMIN_EMAIL`       | İlk kurulumda oluşturulan admin e-postası                       | `admin@example.com` |
| `ADMIN_PASSWORD`    | Admin şifresi                                                   | `ChangeMe123!` |
| `EMERGENT_LLM_KEY`  | Akıllı Asistan için LLM anahtarı (boşsa asistan pasif)          | `sk-emergent-...` |

### Frontend (`frontend/.env`)
| Değişken                 | Açıklama                                  | Örnek |
|--------------------------|-------------------------------------------|-------|
| `REACT_APP_BACKEND_URL`  | Backend kök URL'i (API çağrıları `/api` ekler) | `http://localhost:8001` |

> **Not:** Tüm backend rotaları `/api` ön ekiyle başlar. Frontend her zaman `REACT_APP_BACKEND_URL` kullanır — URL'leri koda gömmeyin.

---

## Varsayılan Giriş Bilgileri
`.env` içinde tanımladığınız `ADMIN_EMAIL` / `ADMIN_PASSWORD` ile giriş yapılır.

Demo personel hesapları (seed ile oluşur):
| E-posta            | Şifre       | Rol       |
|--------------------|-------------|-----------|
| `ayse@ofis.com`    | `Ofis2026!` | Muhasebe  |
| `mehmet@ofis.com`  | `Ofis2026!` | Kıdemli   |
| `zeynep@ofis.com`  | `Ofis2026!` | Bordro    |

> Üretim ortamında bu demo hesapları silin ve güçlü şifreler kullanın.

---

## Veritabanı Şeması
MongoDB (şemasız) collection'ları — `server.py` içindeki modeller ve seed mantığında tanımlıdır:

| Collection        | Açıklama | Öne çıkan alanlar |
|-------------------|----------|-------------------|
| `users`           | Ofis kullanıcıları/personel | `email` (unique), `password_hash`, `name`, `role`, `created_at` |
| `clients`         | Mükellefler | `unvan`, `vkn`, `tckn`, `vergi_dairesi`, `sirket_turu`, `nace`, `beyanname_turleri[]`, `edefter`, `efatura`, `aylik_ucret`, `sorumlu_personel`, `aktif`, `deleted` (soft delete) |
| `declarations`    | Beyanname durumları | `client_id`, `type`, `period` (YYYY-MM), `status`, `deadline`, `checklist{}` |
| `edefter`         | e-Defter dönem takibi | `client_id`, `period`, `steps{ kayitlar, kontrol, berat_olustur, berat_yukle, berat_onay, arsiv }` |
| `transactions`    | Cari hareketler | `client_id`, `type` (`borc`/`alacak`), `amount`, `aciklama`, `date`, `accrual_period` |
| `tasks`           | Görevler | `baslik`, `client_id`, `sorumlu`, `oncelik`, `deadline`, `status` |
| `calendar_events` | Takvim etkinlikleri | `title`, `date` |
| `audit_logs`      | Değiştirilemez denetim kaydı | `user_id`, `user_name`, `action`, `entity`, `entity_id`, `detail`, `created_at` |

**İndeksler:** `users.email` (unique). Uygulama açılışında oluşturulur.

---

## API Uç Noktaları (özet)
Tümü `/api` ön ekiyle başlar. Kimlik doğrulama httpOnly cookie ile taşınır.

- **Auth:** `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- **Kullanıcılar:** `GET/POST /users`, `DELETE /users/{id}` *(admin/mali müşavir)*
- **Mükellefler:** `GET /clients`, `GET /clients/{id}`, `POST /clients`, `PUT /clients/{id}`, `DELETE /clients/{id}`
- **Beyanname:** `GET /declarations?period=`, `POST /declarations/update`, `POST /declarations/bulk`
- **e-Defter:** `GET /edefter?period=`, `POST /edefter/update`
- **Cari:** `GET /clients/{id}/transactions`, `POST /transactions`, `DELETE /transactions/{id}`, `POST /accrual/run`
- **Görev/Takvim:** `GET/POST /tasks`, `PUT/DELETE /tasks/{id}`, `GET/POST /calendar`, `DELETE /calendar/{id}`
- **Diğer:** `GET /dashboard`, `GET /notifications`, `GET /reports`, `GET /audit`, `POST /assistant`

---

## Güvenlik Notları
- Şifreler **bcrypt** ile hash'lenir; JWT **httpOnly + Secure + SameSite** cookie'de taşınır.
- Kritik işlemler **audit log**'a yazılır; kullanıcı/mükellef silme yerine **soft delete** kullanılır.
- Üretimde: güçlü `JWT_SECRET`, gerçek `CORS_ORIGINS` domain'i, HTTPS, MongoDB kimlik doğrulaması ve düzenli yedekleme uygulayın.
- Mükellef verileri harici AI servislerinde eğitim verisi olarak kullanılmaz.

---

## Sonraki Fazlar
- **Faz 2:** e-Tebligat (modüler connector), şifre kasası (AES-256), belge arşivi (object storage), Excel import/export, SGK/Bordro, gelişmiş raporlama (PDF/Excel), otomatik borç hatırlatma (WhatsApp/SMS/e-posta).
- **Faz 3:** Müşteri portalı, GİB/e-Defter/e-Fatura/SGK resmi entegrasyonlar, takvim senkronizasyonu, mükellef risk skoru.

---

## Lisans
Bu proje size aittir; dilediğiniz gibi geliştirip kullanabilirsiniz.
