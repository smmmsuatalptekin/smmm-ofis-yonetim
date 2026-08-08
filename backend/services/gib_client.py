"""GİB Yeni e-Beyan (eBeyanname Kullanıcı REST API) salt-okunur istemci katmanı.

Resmi dokümana dayanır: eBeyanname Kullanıcı Rest Api Geliştirici Kılavuzu v1.2.0
(ebeyan.gib.gov.tr). Yalnızca salt-okunur (sorgu) uçları kullanılır:
  - POST /beyanname/mukellef  (getirMukellefBeyannameleri) — dönemsel beyanname listesi
  - GET  /beyanname/tur       (getirBeyannameTur)          — bağlantı testi (mutasyonsuz)

Kimlik bilgileri YALNIZCA environment üzerinden okunur; asla loglanmaz veya
frontend'e gönderilmez. Bu sürüm hiçbir mutasyon (ekle/güncelle/sil) yapmaz.
"""
import os
import hashlib
import calendar
import httpx

from .gib_mapping import normalize_status, map_type_to_gib, tur_matches


class GibAuthError(Exception):
    pass


class GibUnavailableError(Exception):
    pass


def is_mock() -> bool:
    return os.environ.get("GIB_MOCK_MODE", "true").lower() == "true"


def _period_range(period: str):
    """'YYYY-MM' -> (ilk gün, son gün) ISO tarih (dahil)."""
    year, month = int(period[:4]), int(period[5:7])
    last = calendar.monthrange(year, month)[1]
    return f"{year:04d}-{month:02d}-01", f"{year:04d}-{month:02d}-{last:02d}"


# ---------------- MOCK ----------------
_MOCK_STATUSES = ["Onaylandı", "Onay Bekliyor", "Hatalı", "Taslak", "Bulunamadı"]
_RAW_BY_STATUS = {
    "Onaylandı": "ONAYLANDI", "Onay Bekliyor": "ONAY_BEKLIYOR",
    "Hatalı": "HATALI", "Taslak": "TASLAK", "Bulunamadı": "BULUNAMADI",
}


def _mock_status(ident: str, app_type: str, period: str) -> str:
    h = int(hashlib.sha256(f"{ident}|{app_type}|{period}".encode()).hexdigest(), 16)
    return _MOCK_STATUSES[h % len(_MOCK_STATUSES)]


def _mock_rows(clients, period):
    rows = []
    meta = {"mock": True, "success": 0, "failed": 0, "errors": []}
    for c in clients:
        ident = c.get("vkn") or c.get("tckn")
        types = c.get("beyanname_turleri") or []
        if not ident:
            rows.append(_unmatched_row(c, period))
            continue
        for t in types:
            status = _mock_status(ident, t, period)
            raw = _RAW_BY_STATUS.get(status, "BULUNAMADI")
            norm = normalize_status(raw)
            no = None
            if norm in ("Onaylandı", "Onay Bekliyor"):
                no = "GIB" + hashlib.md5(f"{ident}{t}{period}".encode()).hexdigest()[:10].upper()
            rows.append(_row(c, t, period, norm, raw, no, matched=True, mock=True))
            meta["success"] += 1
    return rows, meta


# ---------------- ortak satır kurucular ----------------
def _row(c, app_type, period, status, raw, no, matched, mock):
    return {
        "client_id": c["id"], "unvan": c.get("unvan"), "vkn": c.get("vkn"),
        "tckn": c.get("tckn"), "app_type": app_type, "gib_type": map_type_to_gib(app_type),
        "period": period, "status": status, "raw_status": raw,
        "declaration_no": no, "matched": matched, "mock": mock,
    }


def _unmatched_row(c, period):
    return {
        "client_id": c["id"], "unvan": c.get("unvan"), "vkn": c.get("vkn"),
        "tckn": c.get("tckn"), "app_type": None, "gib_type": None,
        "period": period, "status": "Eşleştirilemedi", "raw_status": None,
        "declaration_no": None, "matched": False, "mock": is_mock(),
    }


# ---------------- GERÇEK GİB ----------------
def _config():
    base = (os.environ.get("GIB_API_BASE_URL") or "").rstrip("/")
    token = os.environ.get("GIB_API_TOKEN") or ""
    if not base or not token:
        raise GibAuthError("GİB gerçek entegrasyon yapılandırılmamış. GIB_API_BASE_URL ve GIB_API_TOKEN gereklidir.")
    headers = {
        "Authorization": f"Bearer {token}",
        "CHANNEL": os.environ.get("GIB_CHANNEL", "ENTEGRATOR"),
        "ENTEGRATOR": os.environ.get("GIB_INTEGRATOR_IDENTITY", ""),
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    timeout = float(os.environ.get("GIB_TIMEOUT", "30"))
    return base, headers, timeout


def _raise_for_status(status: int):
    if status == 401:
        raise GibAuthError("GİB kimlik doğrulaması başarısız (401). Token geçersiz veya süresi dolmuş olabilir.")
    if status == 403:
        raise GibAuthError("GİB erişimi reddedildi (403). Entegratör/mükellef yetkilendirmesini kontrol edin.")
    if status == 404:
        raise GibUnavailableError("GİB kaynağı bulunamadı (404). Servis adresini (GIB_API_BASE_URL) kontrol edin.")
    if status == 429:
        raise GibUnavailableError("GİB istek limiti aşıldı (429). Lütfen bir süre sonra tekrar deneyin.")
    if status >= 500:
        raise GibUnavailableError(f"GİB sunucu hatası ({status}). Lütfen daha sonra tekrar deneyin.")
    if status >= 400:
        raise GibUnavailableError(f"GİB isteği reddedildi ({status}).")


def _extract_content(payload):
    """BeyannameResponse -> data.content listesi."""
    data = payload.get("data") if isinstance(payload, dict) else None
    if isinstance(data, dict):
        content = data.get("content")
        if isinstance(content, list):
            return content
    return []


async def _real_rows(clients, period):
    base, headers, timeout = _config()
    start, end = _period_range(period)
    url = f"{base}/beyanname/mukellef"
    rows = []
    meta = {"mock": False, "success": 0, "failed": 0, "errors": []}

    async with httpx.AsyncClient(timeout=timeout) as http:
        for c in clients:
            ident = c.get("vkn") or c.get("tckn")
            types = c.get("beyanname_turleri") or []
            if not ident:
                rows.append(_unmatched_row(c, period))
                continue
            req_headers = {**headers, "MUKELLEF-VKN": ident}
            body = {"beyannameDonemTarihi": {"baslangic": start, "bitis": end}, "page": 0, "size": 100}
            try:
                resp = await http.post(url, json=body, headers=req_headers)
            except httpx.TimeoutException:
                raise GibUnavailableError("GİB bağlantısı zaman aşımına uğradı. Lütfen tekrar deneyin.")
            except httpx.RequestError:
                raise GibUnavailableError("GİB sunucusuna ulaşılamadı. Ağ/adres ayarlarını kontrol edin.")
            if resp.status_code != 200:
                # 401/403 tüm sorguyu durdurur (sistemsel yetki hatası)
                if resp.status_code in (401, 403):
                    _raise_for_status(resp.status_code)
                # mükellef bazlı diğer hatalar: satır bazında işaretlenir
                for t in (types or [None]):
                    rows.append(_row(c, t, period, "Sorgu Hatası", str(resp.status_code), None, matched=False, mock=False))
                meta["failed"] += 1
                meta["errors"].append(resp.status_code)
                continue

            content = _extract_content(resp.json())
            for t in types:
                dto = next((d for d in content if tur_matches(t, d.get("beyannameTuru"))), None)
                if dto:
                    raw = dto.get("beyannameDurum")
                    no = dto.get("beyannameId")
                    rows.append(_row(c, t, period, normalize_status(raw), raw,
                                     str(no) if no is not None else None, matched=True, mock=False))
                else:
                    rows.append(_row(c, t, period, "Bulunamadı", "BULUNAMADI", None, matched=True, mock=False))
                meta["success"] += 1
    return rows, meta


async def query_period(clients, period: str):
    """Dönemsel salt-okunur beyanname durum sorgusu.

    clients: list of dicts (id, unvan, vkn, tckn, beyanname_turleri).
    Dönen: (rows, meta).
    """
    if is_mock():
        return _mock_rows(clients, period)
    return await _real_rows(clients, period)


async def test_connection(sample_vkn: str):
    """Mutasyonsuz bağlantı/yetki testi. Gerçek modda GET /beyanname/tur çağrılır."""
    if is_mock():
        return {"ok": True, "mock": True, "message": "MOCK MOD aktif — gerçek GİB bağlantısı kurulmadı."}
    base, headers, timeout = _config()
    async with httpx.AsyncClient(timeout=timeout) as http:
        try:
            resp = await http.get(f"{base}/beyanname/tur", headers={**headers, "MUKELLEF-VKN": sample_vkn})
        except httpx.TimeoutException:
            raise GibUnavailableError("GİB bağlantısı zaman aşımına uğradı. Lütfen tekrar deneyin.")
        except httpx.RequestError:
            raise GibUnavailableError("GİB sunucusuna ulaşılamadı. Ağ/adres ayarlarını kontrol edin.")
    if resp.status_code != 200:
        _raise_for_status(resp.status_code)
    return {"ok": True, "mock": False, "message": "GİB bağlantısı başarılı. Yetkilendirme doğrulandı."}
