"""Merkezi, genişletilebilir GİB durum/tür eşleştirme tablosu."""

# GİB resmi durum kodlarını (örnek/normalize) uygulama durumlarına eşler.
# NOT: Kodlar resmi dokümana göre güncellenmelidir; burada normalize katmanı sağlanır.
STATUS_MAP = {
    "ONAYLANDI": "Onaylandı",
    "APPROVED": "Onaylandı",
    "ONAY_BEKLIYOR": "Onay Bekliyor",
    "PENDING": "Onay Bekliyor",
    "HATALI": "Hatalı",
    "ERROR": "Hatalı",
    "TASLAK": "Taslak",
    "DRAFT": "Taslak",
    "BULUNAMADI": "Bulunamadı",
    "NOT_FOUND": "Bulunamadı",
}

# Uygulama beyanname türü -> GİB beyanname kodu (örnek; resmi koda göre güncellenir).
TYPE_MAP = {
    "KDV1": "1001",
    "KDV2": "1002",
    "MUHSGK": "1003",
    "Damga": "1004",
    "Geçici Vergi": "1005",
    "Gelir Vergisi": "1006",
    "Kurumlar": "1010",
    "BA/BS": "1050",
}
GIB_CODE_TO_TYPE = {v: k for k, v in TYPE_MAP.items()}


def normalize_status(raw: str) -> str:
    if not raw:
        return "Bulunamadı"
    return STATUS_MAP.get(str(raw).strip().upper(), "Bilinmeyen Durum")


def map_type_to_gib(app_type: str) -> str:
    return TYPE_MAP.get(app_type, "")


def map_gib_to_type(gib_code: str) -> str:
    return GIB_CODE_TO_TYPE.get(str(gib_code), "Tanımsız GİB Beyannamesi")
