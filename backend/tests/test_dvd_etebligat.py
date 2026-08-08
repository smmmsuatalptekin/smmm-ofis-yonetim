"""DVD e-Tebligat (Phase 2) backend tests — read-only sync + credential vault."""
import os
import re
import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient

frontend_env = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")).rstrip("/")
API = f"{BASE_URL}/api"

backend_env = dotenv_values("/app/backend/.env")
MONGO_URL = backend_env.get("MONGO_URL") or os.environ.get("MONGO_URL")
DB_NAME = backend_env.get("DB_NAME") or os.environ.get("DB_NAME")

ADMIN = {"email": "smmmsuatalptekin@gmail.com", "password": "Smmm2026!"}

SECRET_KOD = "TEST_DVD_KOD_92831"
SECRET_PAROLA = "TEST_DVD_PAROLA_92831"
SECRET_SIFRE = "TEST_DVD_SIFRE_92831"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=ADMIN, timeout=30)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def cid(admin_session):
    r = admin_session.get(f"{API}/clients", timeout=30)
    assert r.status_code == 200
    clients = r.json()
    assert clients, "no clients"
    return clients[0]["id"]


@pytest.fixture(scope="module")
def second_cid(admin_session):
    r = admin_session.get(f"{API}/clients", timeout=30).json()
    assert len(r) >= 2
    return r[1]["id"]


@pytest.fixture(scope="module")
def mongo_db():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


def _no_secret_in_text(text: str):
    for s in (SECRET_KOD, SECRET_PAROLA, SECRET_SIFRE):
        assert s not in text, f"SECURITY LEAK: secret found in response body"


class TestCredentialVault:
    def test_initial_status_kayitli_degil(self, admin_session, cid):
        # cleanup first
        admin_session.delete(f"{API}/clients/{cid}/dvd-credentials", timeout=30)
        r = admin_session.get(f"{API}/clients/{cid}/dvd-credentials", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "Kayıtlı Değil"
        assert d["fields"] == {"kullanici_kodu": False, "parola": False, "sifre": False}
        # no secret leakage
        for k in ("parola", "sifre", "password"):
            # ensure raw parola/sifre value not returned
            assert not isinstance(d.get(k), str) or d.get(k) in (None,)

    def test_put_creds_returns_no_plaintext(self, admin_session, cid):
        payload = {"kullanici_kodu": SECRET_KOD, "parola": SECRET_PAROLA, "sifre": SECRET_SIFRE}
        r = admin_session.put(f"{API}/clients/{cid}/dvd-credentials", json=payload, timeout=30)
        assert r.status_code == 200
        _no_secret_in_text(r.text)
        d = r.json()
        assert d["status"] == "Kayıtlı"
        assert d["fields"] == {"kullanici_kodu": True, "parola": True, "sifre": True}
        assert d.get("updated_at")

    def test_encrypted_at_rest(self, mongo_db, cid):
        from bson import ObjectId
        c = mongo_db.clients.find_one({"_id": ObjectId(cid)})
        dc = c.get("dvd_credentials") or {}
        for k in ("kullanici_kodu", "parola", "sifre"):
            v = dc.get(k)
            assert isinstance(v, str) and v.startswith("gAAAAA"), f"{k} not Fernet ciphertext"
            for secret in (SECRET_KOD, SECRET_PAROLA, SECRET_SIFRE):
                assert secret not in v

    def test_partial_update(self, admin_session, cid):
        r = admin_session.put(f"{API}/clients/{cid}/dvd-credentials",
                              json={"parola": "NEW_PAROLA_X"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["fields"]["kullanici_kodu"] is True  # unchanged
        assert r.json()["fields"]["parola"] is True

    def test_empty_body_400(self, admin_session, cid):
        r = admin_session.put(f"{API}/clients/{cid}/dvd-credentials", json={}, timeout=30)
        assert r.status_code == 400

    def test_get_never_returns_secrets(self, admin_session, cid):
        r = admin_session.get(f"{API}/clients/{cid}/dvd-credentials", timeout=30)
        _no_secret_in_text(r.text)
        d = r.json()
        # only status/fields/updated_at allowed
        assert set(d.keys()) <= {"status", "fields", "updated_at"}


class TestEtebligatCheck:
    def test_check_basarili_first_call(self, admin_session, cid, mongo_db):
        # ensure creds present
        admin_session.put(f"{API}/clients/{cid}/dvd-credentials",
                          json={"kullanici_kodu": SECRET_KOD, "parola": SECRET_PAROLA, "sifre": SECRET_SIFRE},
                          timeout=30)
        # clear existing etebligat rows for a clean count
        mongo_db.etebligat.delete_many({"client_id": cid})
        r = admin_session.post(f"{API}/clients/{cid}/etebligat/check", json={}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "BASARILI"
        assert d["new_count"] == 2
        assert d["total"] == 2

    def test_dedup_second_call(self, admin_session, cid):
        r = admin_session.post(f"{API}/clients/{cid}/etebligat/check", json={}, timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "BASARILI"
        assert d["new_count"] == 0
        assert d["total"] == 2

    def test_list_records(self, admin_session, cid):
        r = admin_session.get(f"{API}/clients/{cid}/etebligat", timeout=30)
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) == 2
        for row in rows:
            for k in ("belge_no", "belge_turu", "gonderen", "konu", "teblig_tarihi",
                      "okunma_durumu", "pdf_document_id"):
                assert k in row

    def test_pdf_download_from_disk(self, admin_session, cid, mongo_db):
        r = admin_session.get(f"{API}/clients/{cid}/etebligat", timeout=30).json()
        eid = r[0]["id"]
        pdf_doc_id = r[0]["pdf_document_id"]
        assert pdf_doc_id
        # doc must have stored_key, not base64 payload
        from bson import ObjectId
        d = mongo_db.documents.find_one({"_id": ObjectId(pdf_doc_id)})
        assert d and d.get("stored_key")
        assert "base64" not in (d.get("content") or "") if d.get("content") else True
        # file on disk
        upload_dir = os.environ.get("UPLOAD_DIR", "/app/backend/uploads")
        # fallback: try both common paths
        candidates = ["/app/backend/uploads", "/app/uploads", "/tmp/uploads"]
        found = any(os.path.isfile(os.path.join(p, d["stored_key"])) for p in candidates)
        assert found, f"PDF not on disk: {d['stored_key']}"
        # HTTP download
        pdf = admin_session.get(f"{API}/clients/{cid}/etebligat/{eid}/document", timeout=30)
        assert pdf.status_code == 200
        assert pdf.content[:4] == b"%PDF"
        assert pdf.headers.get("content-type", "").startswith("application/pdf")


class TestControlledStates:
    @pytest.mark.parametrize("scenario,expected", [
        ("fail", "GIRIS_BASARISIZ"),
        ("mfa", "MANUEL_DOGRULAMA_GEREKLI"),
        ("down", "SISTEM_ULASILAMIYOR"),
        ("empty", "KAYIT_BULUNAMADI"),
    ])
    def test_scenarios(self, admin_session, cid, scenario, expected):
        r = admin_session.post(f"{API}/clients/{cid}/etebligat/check",
                               json={"scenario": scenario}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == expected
        assert d["new_count"] == 0
        # no stack trace / secrets
        assert "Traceback" not in r.text
        _no_secret_in_text(r.text)


class TestIsolation:
    def test_two_clients_isolated(self, admin_session, cid, second_cid, mongo_db):
        # ensure creds for second client
        admin_session.put(f"{API}/clients/{second_cid}/dvd-credentials",
                          json={"kullanici_kodu": "OTHER_KOD", "parola": "OTHER_P", "sifre": "OTHER_S"}, timeout=30)
        mongo_db.etebligat.delete_many({"client_id": second_cid})
        admin_session.post(f"{API}/clients/{second_cid}/etebligat/check", json={}, timeout=60)
        r1 = admin_session.get(f"{API}/clients/{cid}/etebligat", timeout=30).json()
        r2 = admin_session.get(f"{API}/clients/{second_cid}/etebligat", timeout=30).json()
        ids1 = {x["id"] for x in r1}
        ids2 = {x["id"] for x in r2}
        assert ids1 and ids2
        assert ids1.isdisjoint(ids2)
        # remote_tebligat_id also differs (different ident)
        rid1 = {x.get("belge_no") for x in r1}
        rid2 = {x.get("belge_no") for x in r2}
        # both are "2026000001" and "2026000002" though — check that client_id filter works via mongo
        c1_rows = list(mongo_db.etebligat.find({"client_id": cid}))
        c2_rows = list(mongo_db.etebligat.find({"client_id": second_cid}))
        # remote ids should differ because seeded by kullanici_kodu
        r1_remote = {x["remote_tebligat_id"] for x in c1_rows}
        r2_remote = {x["remote_tebligat_id"] for x in c2_rows}
        assert r1_remote.isdisjoint(r2_remote)


class TestBulk:
    def test_overview(self, admin_session):
        r = admin_session.get(f"{API}/etebligat/overview", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["mock"] is True
        assert isinstance(d["clients"], list) and len(d["clients"]) >= 1
        for c in d["clients"]:
            for k in ("id", "unvan", "cred_status", "etebligat_count"):
                assert k in c

    def test_bulk_check(self, admin_session, cid, second_cid):
        r = admin_session.post(f"{API}/etebligat/check",
                               json={"client_ids": [cid, second_cid]}, timeout=90)
        assert r.status_code == 200
        d = r.json()
        assert "results" in d and len(d["results"]) == 2
        for row in d["results"]:
            assert "status" in row and "new_count" in row

    def test_bulk_empty_400(self, admin_session):
        r = admin_session.post(f"{API}/etebligat/check", json={"client_ids": []}, timeout=30)
        assert r.status_code == 400


class TestAuditSecurity:
    def test_audit_has_no_secrets(self, admin_session, mongo_db):
        # Audit endpoint
        r = admin_session.get(f"{API}/audit", timeout=30)
        assert r.status_code == 200
        text = r.text
        for s in (SECRET_KOD, SECRET_PAROLA, SECRET_SIFRE):
            assert s not in text, f"secret found in audit endpoint: {s}"
        # Also check mongo directly for etebligat_sync + dvd_credentials_update entries
        logs = list(mongo_db.audit_logs.find({"action": {"$in": ["etebligat_sync", "dvd_credentials_update"]}}).limit(50))
        assert logs, "no dvd/etebligat audit entries found"
        for log in logs:
            blob = str(log)
            for s in (SECRET_KOD, SECRET_PAROLA, SECRET_SIFRE):
                assert s not in blob


class TestCredentialDelete:
    def test_delete(self, admin_session, cid):
        r = admin_session.delete(f"{API}/clients/{cid}/dvd-credentials", timeout=30)
        assert r.status_code == 200
        assert r.json() == {"ok": True}
        r2 = admin_session.get(f"{API}/clients/{cid}/dvd-credentials", timeout=30)
        assert r2.json()["status"] == "Kayıtlı Değil"
