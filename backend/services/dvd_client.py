"""Dijital Vergi Dairesi e-Tebligat — SALT OKUNUR istemci.

Yalnızca: oturum açma denemesi, e-Tebligat listesini okuma, PDF indirme.
Cevap verme / belge gönderme / silme / okundu değiştirme YOK.
CAPTCHA/MFA görülürse OTOMATİK ATLATMA YAPILMAZ -> MANUEL_DOGRULAMA_GEREKLI.

Kimlik bilgileri (kullanıcı kodu/parola/şifre) asla loglanmaz.
Gerçek mod (DVD_MOCK_MODE=false) Playwright ile çalışır; selector'lar
`dvd_selectors.py` içinde MERKEZİ tutulur ve canlıdan teyit edilmelidir.
"""
import os
import hashlib

# Kontrollü sonuç durumları
BASARILI = "BASARILI"
GIRIS_BASARISIZ = "GIRIS_BASARISIZ"
MANUEL_DOGRULAMA_GEREKLI = "MANUEL_DOGRULAMA_GEREKLI"
SISTEM_ULASILAMIYOR = "SISTEM_ULASILAMIYOR"
SAYFA_YAPISI_DEGISTI = "SAYFA_YAPISI_DEGISTI"
KAYIT_BULUNAMADI = "KAYIT_BULUNAMADI"

MOCK_PDF = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 300]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"


def is_mock() -> bool:
    return os.environ.get("DVD_MOCK_MODE", "true").lower() == "true"


# ---------------- MOCK ----------------
def _mock_records(ident: str):
    """İki adet deterministik tebligat üretir (remote id sabit -> duplicate testi)."""
    recs = []
    for i in (1, 2):
        h = hashlib.md5(f"{ident}|{i}".encode()).hexdigest()[:10].upper()
        recs.append({
            "remote_tebligat_id": f"DVD-{h}",
            "belge_no": f"2026{i:06d}",
            "belge_turu": "Ödeme Emri" if i == 1 else "Bilgilendirme",
            "gonderen": "Kadıköy Vergi Dairesi" if i == 1 else "Gelir İdaresi Başkanlığı",
            "konu": "Vergi/ceza ihbarnamesi" if i == 1 else "Beyanname hatırlatma",
            "belge_tarihi": "2026-05-10",
            "teblig_tarihi": "2026-05-12",
            "okunma_durumu": "Okunmadı" if i == 1 else "Okundu",
            "son_islem_tarihi": "2026-05-12" if i == 2 else None,
            "pdf_available": True,
            "pdf_bytes": MOCK_PDF,
        })
    return recs


def _mock_fetch(creds, scenario):
    kod = (creds or {}).get("kullanici_kodu", "") or ""
    scn = (scenario or "").lower() or kod.lower()
    if "fail" in scn:
        return {"status": GIRIS_BASARISIZ, "records": [], "message": "Kullanıcı kodu veya şifre hatalı (MOCK)."}
    if "mfa" in scn or "captcha" in scn:
        return {"status": MANUEL_DOGRULAMA_GEREKLI, "records": [],
                "message": "Dijital Vergi Dairesi ek doğrulama istiyor. Bu mükellef için manuel giriş gerekiyor."}
    if "down" in scn or "sistem" in scn:
        return {"status": SISTEM_ULASILAMIYOR, "records": [], "message": "Dijital Vergi Dairesi'ne ulaşılamıyor (MOCK)."}
    if "empty" in scn:
        return {"status": KAYIT_BULUNAMADI, "records": [], "message": "Bu mükellef için e-Tebligat kaydı bulunamadı."}
    ident = (creds or {}).get("kullanici_kodu") or "mockuser"
    return {"status": BASARILI, "records": _mock_records(ident), "message": "e-Tebligat listesi okundu (MOCK)."}


# ---------------- GERÇEK (Playwright) ----------------
async def _real_fetch(creds):
    from .dvd_selectors import DVD_BASE_URL, PATHS, SELECTORS, MFA_MARKERS
    try:
        from playwright.async_api import async_playwright, TimeoutError as PWTimeout
    except Exception:
        return {"status": SISTEM_ULASILAMIYOR, "records": [],
                "message": "Web otomasyon bileşeni kurulu değil. Yönetici ile iletişime geçin."}

    kullanici_kodu = (creds or {}).get("kullanici_kodu") or ""
    parola = (creds or {}).get("parola") or ""
    sifre = (creds or {}).get("sifre") or ""
    timeout = int(os.environ.get("DVD_TIMEOUT_MS", "30000"))

    def locate(scope, spec):
        k = spec["kind"]
        if k == "label":
            return scope.get_by_label(spec["value"])
        if k == "role":
            return scope.get_by_role(spec["role"], name=spec["name"])
        if k == "text":
            return scope.get_by_text(spec["value"])
        return scope.locator(spec["value"])

    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            context = await browser.new_context(accept_downloads=True)
            page = await context.new_page()
            try:
                await page.goto(DVD_BASE_URL + PATHS["login"], wait_until="domcontentloaded", timeout=timeout)
                # ikinci faktör kontrolü — atlatma YOK
                body_txt = (await page.content()) or ""
                if any(m in body_txt for m in MFA_MARKERS):
                    return {"status": MANUEL_DOGRULAMA_GEREKLI, "records": [],
                            "message": "Dijital Vergi Dairesi ek doğrulama istiyor. Bu mükellef için manuel giriş gerekiyor."}
                lg = SELECTORS["login"]
                await locate(page, lg["kullanici_kodu"]).fill(kullanici_kodu, timeout=timeout)
                await locate(page, lg["parola"]).fill(parola, timeout=timeout)
                if sifre:
                    try:
                        await locate(page, lg["sifre"]).fill(sifre, timeout=5000)
                    except Exception:
                        pass
                await locate(page, lg["submit"]).click(timeout=timeout)
                await page.wait_for_load_state("domcontentloaded", timeout=timeout)

                after = (await page.content()) or ""
                if any(m in after for m in MFA_MARKERS):
                    return {"status": MANUEL_DOGRULAMA_GEREKLI, "records": [],
                            "message": "Dijital Vergi Dairesi ek doğrulama istiyor. Bu mükellef için manuel giriş gerekiyor."}

                et = SELECTORS["etebligat"]
                try:
                    await locate(page, et["page_ready"]).wait_for(timeout=timeout)
                except PWTimeout:
                    return {"status": GIRIS_BASARISIZ, "records": [],
                            "message": "Giriş başarısız veya e-Tebligat sayfasına ulaşılamadı."}

                rows = locate(page, et["rows"])
                count = await rows.count()
                if count == 0:
                    return {"status": KAYIT_BULUNAMADI, "records": [], "message": "e-Tebligat kaydı bulunamadı."}

                records = []
                for i in range(count):
                    row = rows.nth(i)
                    async def txt(spec):
                        try:
                            return (await locate(row, spec).inner_text(timeout=5000)).strip()
                        except Exception:
                            return None
                    records.append({
                        "remote_tebligat_id": await txt(et["id"]),
                        "belge_no": await txt(et["belge_no"]),
                        "belge_turu": await txt(et["belge_turu"]),
                        "gonderen": await txt(et["gonderen"]),
                        "konu": await txt(et["konu"]),
                        "belge_tarihi": await txt(et["belge_tarihi"]),
                        "teblig_tarihi": await txt(et["teblig_tarihi"]),
                        "okunma_durumu": await txt(et["okunma_durumu"]),
                        "son_islem_tarihi": None,
                        "pdf_available": False,
                        "pdf_bytes": None,
                    })
                if all(not r.get("remote_tebligat_id") for r in records):
                    return {"status": SAYFA_YAPISI_DEGISTI, "records": [],
                            "message": "Sayfa yapısı beklenenden farklı. Selector güncellemesi gerekiyor."}
                return {"status": BASARILI, "records": records, "message": "e-Tebligat listesi okundu."}
            finally:
                await context.close()
                await browser.close()
                del kullanici_kodu, parola, sifre
    except Exception:
        return {"status": SISTEM_ULASILAMIYOR, "records": [],
                "message": "Dijital Vergi Dairesi'ne bağlanılamadı veya beklenmeyen bir durum oluştu."}


async def fetch_etebligat(creds: dict, scenario: str = "") -> dict:
    """Dönen: {status, records, message}. records read-only sorgu sonuçları."""
    if is_mock():
        return _mock_fetch(creds, scenario)
    return await _real_fetch(creds)
