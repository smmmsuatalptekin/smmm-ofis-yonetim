"""Backend test suite for SMMM Phase 1."""
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")).rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "smmmsuatalptekin@gmail.com", "password": "Smmm2026!"}
NON_ADMIN = {"email": "ayse@ofis.com", "password": "Ofis2026!"}
PERIOD = datetime.now(timezone.utc).strftime("%Y-%m")


# ---------------- fixtures ----------------
@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=ADMIN, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("email") == ADMIN["email"]
    assert data.get("role") == "admin"
    return s


@pytest.fixture(scope="module")
def personel_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=NON_ADMIN, timeout=30)
    assert r.status_code == 200, f"personel login failed: {r.text}"
    return s


# ---------------- Auth ----------------
class TestAuth:
    def test_login_bad(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN["email"], "password": "wrong"}, timeout=30)
        assert r.status_code == 401

    def test_me(self, admin_session):
        r = admin_session.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN["email"]

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 401


# ---------------- Dashboard ----------------
class TestDashboard:
    def test_dashboard(self, admin_session):
        r = admin_session.get(f"{API}/dashboard", timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_clients", "by_type", "pending_by_type", "toplam_alacak",
                  "top_debtors", "upcoming", "open_tasks", "overdue_tasks"):
            assert k in d, f"missing key {k}"
        assert d["total_clients"] >= 8


# ---------------- Clients ----------------
class TestClients:
    created_id = None

    def test_list(self, admin_session):
        r = admin_session.get(f"{API}/clients", timeout=30)
        assert r.status_code == 200
        assert len(r.json()) >= 8

    def test_search(self, admin_session):
        r = admin_session.get(f"{API}/clients", params={"q": "Kara"}, timeout=30)
        assert r.status_code == 200
        assert any("Kara" in c["unvan"] for c in r.json())

    def test_filter_tur(self, admin_session):
        r = admin_session.get(f"{API}/clients", params={"tur": "Anonim"}, timeout=30)
        assert r.status_code == 200
        assert all(c["sirket_turu"] == "Anonim" for c in r.json())

    def test_create_get_update(self, admin_session):
        payload = {"unvan": "TEST_Deneme Ltd", "vkn": "9999999999", "sirket_turu": "Limited",
                   "aylik_ucret": 1000, "beyanname_turleri": ["KDV1", "MUHSGK"], "edefter": False}
        r = admin_session.post(f"{API}/clients", json=payload, timeout=30)
        assert r.status_code == 200
        cid = r.json()["id"]
        TestClients.created_id = cid

        r2 = admin_session.get(f"{API}/clients/{cid}", timeout=30)
        assert r2.status_code == 200
        assert r2.json()["unvan"] == "TEST_Deneme Ltd"

        r3 = admin_session.put(f"{API}/clients/{cid}", json={"unvan": "TEST_Deneme Ltd 2"}, timeout=30)
        assert r3.status_code == 200
        assert r3.json()["unvan"] == "TEST_Deneme Ltd 2"


# ---------------- Declarations ----------------
class TestDeclarations:
    def test_grid(self, admin_session):
        r = admin_session.get(f"{API}/declarations", params={"period": PERIOD}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "rows" in d and "types" in d and "statuses" in d
        assert len(d["rows"]) >= 8
        assert d["rows"][0]["cells"]

    def test_update(self, admin_session):
        # pick first client with KDV1
        gr = admin_session.get(f"{API}/declarations", params={"period": PERIOD}, timeout=30).json()
        target = next((row for row in gr["rows"] if "KDV1" in row["cells"]), None)
        assert target
        cid = target["client_id"]
        r = admin_session.post(f"{API}/declarations/update", json={
            "client_id": cid, "type": "KDV1", "period": PERIOD, "status": "Gönderildi"
        }, timeout=30)
        assert r.status_code == 200
        assert r.json()["status"] == "Gönderildi"
        # verify
        gr2 = admin_session.get(f"{API}/declarations", params={"period": PERIOD}, timeout=30).json()
        row = next(r for r in gr2["rows"] if r["client_id"] == cid)
        assert row["cells"]["KDV1"]["status"] == "Gönderildi"

    def test_bulk(self, admin_session):
        gr = admin_session.get(f"{API}/declarations", params={"period": PERIOD}, timeout=30).json()
        ids = [row["client_id"] for row in gr["rows"][:3]]
        r = admin_session.post(f"{API}/declarations/bulk", json={
            "period": PERIOD, "type": "MUHSGK", "status": "Hazırlanıyor", "client_ids": ids
        }, timeout=30)
        assert r.status_code == 200
        assert r.json()["count"] == 3


# ---------------- e-Defter ----------------
class TestEdefter:
    def test_get_update(self, admin_session):
        r = admin_session.get(f"{API}/edefter", params={"period": PERIOD}, timeout=30)
        assert r.status_code == 200
        rows = r.json()["rows"]
        assert len(rows) >= 1
        cid = rows[0]["client_id"]
        steps = {"kayitlar": True, "kontrol": True, "berat_olustur": True,
                 "berat_yukle": False, "berat_onay": False, "arsiv": False}
        r2 = admin_session.post(f"{API}/edefter/update", json={
            "client_id": cid, "period": PERIOD, "steps": steps
        }, timeout=30)
        assert r2.status_code == 200
        r3 = admin_session.get(f"{API}/edefter", params={"period": PERIOD}, timeout=30).json()
        row = next(r for r in r3["rows"] if r["client_id"] == cid)
        assert row["steps"]["kayitlar"] is True
        assert row["steps"]["berat_olustur"] is True


# ---------------- Cari ----------------
class TestCari:
    def test_transactions_and_accrual_idempotent(self, admin_session):
        clients = admin_session.get(f"{API}/clients", timeout=30).json()
        cid = clients[0]["id"]
        r = admin_session.get(f"{API}/clients/{cid}/transactions", timeout=30)
        assert r.status_code == 200
        assert "bakiye" in r.json()

        # add payment
        r2 = admin_session.post(f"{API}/transactions", json={
            "client_id": cid, "type": "alacak", "amount": 100, "aciklama": "TEST_ödeme"
        }, timeout=30)
        assert r2.status_code == 200

        # accrual idempotency
        test_period = "2019-01"
        c1 = admin_session.post(f"{API}/accrual/run", json={"period": test_period}, timeout=60).json()
        c2 = admin_session.post(f"{API}/accrual/run", json={"period": test_period}, timeout=60).json()
        assert c1["count"] >= 1
        assert c2["count"] == 0, f"accrual not idempotent: second run inserted {c2['count']}"


# ---------------- Tasks ----------------
class TestTasks:
    def test_crud(self, admin_session):
        r = admin_session.get(f"{API}/tasks", timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

        clients = admin_session.get(f"{API}/clients", timeout=30).json()
        cid = clients[0]["id"]
        r2 = admin_session.post(f"{API}/tasks", json={
            "baslik": "TEST_Görev", "client_id": cid, "sorumlu": "Test", "deadline": "2026-12-31", "oncelik": "Orta"
        }, timeout=30)
        assert r2.status_code == 200
        tid = r2.json()["id"]

        r3 = admin_session.put(f"{API}/tasks/{tid}", json={"status": "Tamamlandı"}, timeout=30)
        assert r3.status_code == 200
        assert r3.json()["status"] == "Tamamlandı"

        # list contains client_name
        lst = admin_session.get(f"{API}/tasks", timeout=30).json()
        assert any(t.get("client_name") for t in lst)

        r4 = admin_session.delete(f"{API}/tasks/{tid}", timeout=30)
        assert r4.status_code == 200


# ---------------- Calendar ----------------
class TestCalendar:
    def test_get_create(self, admin_session):
        r = admin_session.get(f"{API}/calendar", timeout=30)
        assert r.status_code == 200
        r2 = admin_session.post(f"{API}/calendar", json={"title": "TEST_Etkinlik", "date": "2026-12-01"}, timeout=30)
        assert r2.status_code == 200
        eid = r2.json()["id"]
        admin_session.delete(f"{API}/calendar/{eid}", timeout=30)


# ---------------- Notifications ----------------
class TestNotifications:
    def test_notifications(self, admin_session):
        r = admin_session.get(f"{API}/notifications", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for n in data:
            assert "level" in n and "text" in n and "type" in n


# ---------------- Personel / Users + RBAC ----------------
class TestPersonel:
    def test_list(self, admin_session):
        r = admin_session.get(f"{API}/users", timeout=30)
        assert r.status_code == 200
        assert len(r.json()) >= 4

    def test_create_and_delete(self, admin_session):
        email = f"test_user_{int(time.time())}@ofis.com"
        r = admin_session.post(f"{API}/users", json={
            "email": email, "password": "TestPass1!", "name": "TEST User", "role": "muhasebe"
        }, timeout=30)
        assert r.status_code == 200
        uid = r.json()["id"]
        r2 = admin_session.delete(f"{API}/users/{uid}", timeout=30)
        assert r2.status_code == 200

    def test_rbac_non_admin_forbidden(self, personel_session):
        r = personel_session.post(f"{API}/users", json={
            "email": "shouldfail@x.com", "password": "x", "name": "X", "role": "muhasebe"
        }, timeout=30)
        assert r.status_code == 403


# ---------------- Audit ----------------
class TestAudit:
    def test_admin_can_read(self, admin_session):
        r = admin_session.get(f"{API}/audit", timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_non_admin_forbidden(self, personel_session):
        r = personel_session.get(f"{API}/audit", timeout=30)
        assert r.status_code == 403


# ---------------- AI Assistant (last, non-blocking) ----------------
class TestAssistant:
    def test_assistant(self, admin_session):
        r = admin_session.post(f"{API}/assistant", json={
            "question": "Bu ay KDV'si verilmemiş müşterileri göster"
        }, timeout=90)
        assert r.status_code == 200
        assert "answer" in r.json()
        assert isinstance(r.json()["answer"], str)
        assert len(r.json()["answer"]) > 0
