"""GİB Yeni e-Beyan read-only istemci katmanı.

İleride e-Tebligat / eski e-Beyanname / Dijital Vergi Dairesi entegrasyonları
aynı altyapıya eklenebilsin diye ayrı servis olarak tutulur.

Kimlik bilgileri YALNIZCA environment üzerinden okunur; asla loglanmaz veya
frontend'e gönderilmez. Bu sürüm SALT OKUNUR'dur.
"""
import os
import hashlib
from .gib_mapping import normalize_status, map_type_to_gib


class GibAuthError(Exception):
    pass


class GibUnavailableError(Exception):
    pass


def is_mock() -> bool:
    return os.environ.get("GIB_MOCK_MODE", "true").lower() == "true"


_MOCK_STATUSES = ["Onaylandı", "Onay Bekliyor", "Hatalı", "Taslak", "Bulunamadı"]
_RAW_BY_STATUS = {
    "Onaylandı": "ONAYLANDI", "Onay Bekliyor": "ONAY_BEKLIYOR",
    "Hatalı": "HATALI", "Taslak": "TASLAK", "Bulunamadı": "BULUNAMADI",
}


def _mock_status(vkn_or_tckn: str, app_type: str, period: str) -> str:
    h = int(hashlib.sha256(f"{vkn_or_tckn}|{app_type}|{period}".encode()).hexdigest(), 16)
    return _MOCK_STATUSES[h % len(_MOCK_STATUSES)]


def query_period(clients, period: str):
    """clients: list of dicts (id, unvan, vkn, tckn, beyanname_turleri).
    Dönen: (rows, meta). rows read-only sorgu sonuçları.
    Gerçek modda resmi e-Beyan endpoint'i (ör. GET /beyanname/getirDonemeGore)
    OAuth2/entegratör token'ı ile çağrılır (secretlar env'den).
    """
    meta = {"mock": is_mock(), "success": 0, "failed": 0, "errors": []}
    rows = []
    if not is_mock():
        base = os.environ.get("GIB_API_BASE_URL")
        if not base or not os.environ.get("GIB_CLIENT_SECRET"):
            raise GibAuthError("GİB kimlik bilgileri yapılandırılmamış")
        # Gerçek entegrasyon resmi dokümana göre burada uygulanır (read-only).
        raise GibUnavailableError("Gerçek GİB entegrasyonu bu sürümde etkin değil (GIB_MOCK_MODE=true kullanın)")

    for c in clients:
        ident = c.get("vkn") or c.get("tckn")
        types = c.get("beyanname_turleri") or []
        if not ident:
            rows.append({
                "client_id": c["id"], "unvan": c.get("unvan"), "vkn": c.get("vkn"),
                "tckn": c.get("tckn"), "app_type": None, "gib_type": None,
                "period": period, "status": "Eşleştirilemedi", "raw_status": None,
                "declaration_no": None, "matched": False, "mock": True,
            })
            continue
        for t in types:
            status = _mock_status(ident, t, period)
            raw = _RAW_BY_STATUS.get(status, "BULUNAMADI")
            # normalize round-trip to prove mapping layer works
            norm = normalize_status(raw)
            no = None
            if norm in ("Onaylandı", "Onay Bekliyor"):
                no = "GIB" + hashlib.md5(f"{ident}{t}{period}".encode()).hexdigest()[:10].upper()
            rows.append({
                "client_id": c["id"], "unvan": c.get("unvan"), "vkn": c.get("vkn"),
                "tckn": c.get("tckn"), "app_type": t, "gib_type": map_type_to_gib(t),
                "period": period, "status": norm, "raw_status": raw,
                "declaration_no": no, "matched": True, "mock": True,
            })
            meta["success"] += 1
    return rows, meta
