"""e-Tebligat senkronizasyon orkestrasyonu (salt okunur).

dvd_client'tan gelen kayıtları uygulamaya aktarır:
- dedup: (client_id + remote_tebligat_id) benzersiz
- yeni kayıt -> insert (is_new=True), PDF varsa persistent storage'a indirilir
- mevcut kayıt -> last_seen_at güncellenir (duplicate oluşturulmaz)

Sırlar (kullanıcı kodu/parola/şifre/oturum) HİÇBİR zaman loglanmaz/döndürülmez.
"""
import os
import uuid
from datetime import datetime, timezone

from .dvd_client import fetch_etebligat, BASARILI


def _now():
    return datetime.now(timezone.utc).isoformat()


def _serialize(d):
    d = dict(d)
    d["id"] = str(d.pop("_id"))
    return d


async def sync_client(db, client, creds, actor, upload_dir, scenario=""):
    """Tek mükellef için e-Tebligat senkronu.
    client: serialized dict (id, unvan, vkn, tckn). creds: düz metin (çözülmüş).
    Dönen: {status, message, new_count, total, records}.
    """
    cid = client["id"]
    res = await fetch_etebligat(creds, scenario)
    status = res["status"]
    new_count = 0

    if status == BASARILI:
        for r in res.get("records", []):
            rid = r.get("remote_tebligat_id")
            if not rid:
                continue
            existing = await db.etebligat.find_one({"client_id": cid, "remote_tebligat_id": rid})
            pdf_bytes = r.get("pdf_bytes")
            if existing:
                await db.etebligat.update_one({"_id": existing["_id"]}, {"$set": {"last_seen_at": _now()}})
                continue
            # yeni kayıt -> PDF'i persistent storage'a indir (Base64 DEĞİL)
            pdf_document_id = None
            if pdf_bytes:
                pdf_document_id = await _store_pdf(db, client, r, pdf_bytes, actor, upload_dir)
            doc = {
                "client_id": cid,
                "remote_tebligat_id": rid,
                "belge_no": r.get("belge_no"),
                "belge_turu": r.get("belge_turu"),
                "gonderen": r.get("gonderen"),
                "konu": r.get("konu"),
                "belge_tarihi": r.get("belge_tarihi"),
                "teblig_tarihi": r.get("teblig_tarihi"),
                "okunma_durumu": r.get("okunma_durumu"),
                "son_islem_tarihi": r.get("son_islem_tarihi"),
                "pdf_document_id": pdf_document_id,
                "created_at": _now(),
                "last_seen_at": _now(),
            }
            await db.etebligat.insert_one(doc)
            new_count += 1

    total = await db.etebligat.count_documents({"client_id": cid})
    # audit — sır İÇERMEZ
    await db.audit_logs.insert_one({
        "user_id": str(actor["_id"]), "user_name": actor.get("name"),
        "action": "etebligat_sync", "entity": "etebligat", "entity_id": cid,
        "detail": f"mükellef={client.get('unvan')} sonuç={status} yeni={new_count}",
        "created_at": _now(),
    })
    return {"status": status, "message": res.get("message"), "new_count": new_count, "total": total}


async def _store_pdf(db, client, rec, pdf_bytes, actor, upload_dir):
    cid = client["id"]
    stored_name = f"{uuid.uuid4().hex}.pdf"
    client_dir = os.path.join(upload_dir, cid)
    os.makedirs(client_dir, exist_ok=True)
    with open(os.path.join(client_dir, stored_name), "wb") as f:
        f.write(pdf_bytes)
    title = f"e-Tebligat {rec.get('belge_no') or rec.get('remote_tebligat_id')}"
    orig = f"{(rec.get('belge_no') or 'etebligat')}.pdf"
    doc = {
        "client_id": cid, "title": title, "category": "e-Tebligat",
        "subcategory": rec.get("belge_turu") or "", "document_date": rec.get("belge_tarihi") or "",
        "period": "", "description": rec.get("konu") or "", "tags": ["e-Tebligat"],
        "original_filename": orig, "stored_key": f"{cid}/{stored_name}",
        "mime_type": "application/pdf", "file_size": len(pdf_bytes), "expiry_date": "",
        "version": 1, "parent_document_id": None, "uploaded_by": actor.get("name"),
        "created_at": _now(), "updated_at": _now(), "deleted_at": None,
    }
    r = await db.documents.insert_one(doc)
    return str(r.inserted_id)


async def list_client_etebligat(db, cid):
    docs = await db.etebligat.find({"client_id": cid}).sort("created_at", -1).to_list(2000)
    return [_serialize(d) for d in docs]
