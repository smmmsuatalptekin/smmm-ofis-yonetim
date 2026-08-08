"""Dijital Vergi Dairesi (DVD) e-Tebligat — MERKEZİ selector / URL katmanı.

DİKKAT: Aşağıdaki DOM selector'ları ve sayfa yolları CANLI portaldan
DOĞRULANMAMIŞTIR (giriş sonrası kimliği doğrulanmış sayfaya erişim olmadan
teyit edilemez). Portal arayüzü değişirse yalnızca bu dosya güncellenir.
Alan isimleri gerçek sayfadan teyit edilene kadar `verified=False`.
"""
import os

DVD_BASE_URL = os.environ.get("DVD_BASE_URL", "https://dijital.gib.gov.tr")

# Giriş sonrası e-Tebligat sayfa yolu (canlıdan teyit edilmeli)
PATHS = {
    "login": "/",
    "etebligat": "/",  # gerçek yol canlıdan teyit edilecek
}

# Locator tanımları. kind: "label" | "role" | "css" | "text"
SELECTORS = {
    "verified": False,  # canlı portaldan teyit edilmedi
    "login": {
        "kullanici_kodu": {"kind": "label", "value": "Kullanıcı Kodu"},
        "parola": {"kind": "label", "value": "Parola"},
        "sifre": {"kind": "label", "value": "Şifre"},
        "submit": {"kind": "role", "role": "button", "name": "Giriş"},
        "error": {"kind": "text", "value": "hatalı"},
    },
    "etebligat": {
        "page_ready": {"kind": "role", "role": "heading", "name": "e-Tebligat"},
        "rows": {"kind": "css", "value": "[data-testid='etebligat-row']"},
        "id": {"kind": "css", "value": "[data-testid='etebligat-id']"},
        "belge_no": {"kind": "css", "value": "[data-testid='etebligat-belge-no']"},
        "belge_turu": {"kind": "css", "value": "[data-testid='etebligat-tur']"},
        "gonderen": {"kind": "css", "value": "[data-testid='etebligat-gonderen']"},
        "konu": {"kind": "css", "value": "[data-testid='etebligat-konu']"},
        "belge_tarihi": {"kind": "css", "value": "[data-testid='etebligat-belge-tarihi']"},
        "teblig_tarihi": {"kind": "css", "value": "[data-testid='etebligat-teblig-tarihi']"},
        "okunma_durumu": {"kind": "css", "value": "[data-testid='etebligat-okunma']"},
        "pdf_link": {"kind": "role", "role": "link", "name": "PDF"},
    },
}

# İkinci faktör / doğrulama işaretleri — tespit edilirse OTOMATİK ATLATMA YAPILMAZ,
# MANUEL_DOGRULAMA_GEREKLI döndürülür.
MFA_MARKERS = ["CAPTCHA", "captcha", "doğrulama kodu", "SMS", "cep telefon", "mobil imza", "e-Devlet", "güvenlik kodu"]
