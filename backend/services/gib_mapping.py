"""Merkezi, genişletilebilir GİB durum/tür eşleştirme tablosu.

Kaynak: eBeyanname Kullanıcı REST API v1.2.0 (BeyannameDTOV1.beyannameDurum enum).
"""

# GİB resmi beyanname durum kodlarını uygulama durumlarına eşler.
STATUS_MAP = {
    "ONAYLANDI": "Onaylandı",
    "APPROVED": "Onaylandı",
    "ONAY_BEKLIYOR": "Onay Bekliyor",
    "PENDING": "Onay Bekliyor",
    "HATALI": "Hatalı",
    "ERROR": "Hatalı",
    "TASLAK": "Taslak",
    "DRAFT": "Taslak",
    "IPTAL_EDILDI": "İptal Edildi",
    "KOPYALANIYOR": "Kopyalanıyor",
    "SILINDI": "Silindi",
    "BULUNAMADI": "Bulunamadı",
    "NOT_FOUND": "Bulunamadı",
}

# Uygulama beyanname türü kısa adı ile GİB kısa adı büyük ölçüde örtüşür (KDV1, KDV2, MUHSGK...).
# İlave kod eşlemesi gerekirse burada tutulur.
TYPE_MAP = {
    "KDV1": "KDV1",
    "KDV2": "KDV2",
    "MUHSGK": "MUHSGK",
    "Damga": "DAMGA",
    "Geçici Vergi": "GECICI",
    "Gelir Vergisi": "GVYILLIK",
    "Kurumlar": "KURUMLAR",
    "BA/BS": "BABS",
}
GIB_CODE_TO_TYPE = {v: k for k, v in TYPE_MAP.items()}


def normalize_status(raw) -> str:
    if not raw:
        return "Bulunamadı"
    return STATUS_MAP.get(str(raw).strip().upper(), "Bilinmeyen Durum")


def map_type_to_gib(app_type) -> str:
    return TYPE_MAP.get(app_type, str(app_type or ""))


def map_gib_to_type(gib_code: str) -> str:
    return GIB_CODE_TO_TYPE.get(str(gib_code), "Tanımsız GİB Beyannamesi")


def _extract_tur(t) -> str:
    """BeyannameDTOV1.beyannameTuru string ya da {kod,kisaAd,ad} olabilir."""
    if isinstance(t, dict):
        return str(t.get("kisaAd") or t.get("kod") or t.get("ad") or "")
    return str(t or "")


def _norm(s: str) -> str:
    return str(s or "").strip().upper().replace(" ", "").replace("/", "")


def tur_matches(app_type, dto_tur) -> bool:
    """Uygulama beyanname türü ile GİB dönen türü eşleşiyor mu?"""
    b = _norm(_extract_tur(dto_tur))
    if not b:
        return False
    a = _norm(app_type)
    if a == b:
        return True
    return _norm(map_type_to_gib(app_type)) == b
