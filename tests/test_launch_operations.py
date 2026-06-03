import importlib
import json
import sys
import uuid

from fastapi.testclient import TestClient


def _reload_main(monkeypatch, tmp_path, include_twilio_auth_token: bool = True):
    monkeypatch.setenv("PORTAL_JWT_SECRET", "ci-only-secret-ci-only-secret-123456")
    monkeypatch.setenv("DEV_BYPASS_AUTH", "1")
    monkeypatch.setenv("REDIS_URL", "memory://local")
    monkeypatch.setenv("AGENT_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("TELEPHONY_PROVIDER", "twilio")
    monkeypatch.setenv("PUBLIC_BASE_URL", "https://tools.bixingai.com/bx-caller")
    monkeypatch.setenv("WEBSOCKET_ACCESS_TOKEN", "callback-token")
    monkeypatch.setenv("TWILIO_ACCOUNT_SID", "AC00000000000000000000000000000000")
    if include_twilio_auth_token:
        monkeypatch.setenv("TWILIO_AUTH_TOKEN", "auth-token")
    else:
        monkeypatch.setenv("TWILIO_AUTH_TOKEN", "")
    monkeypatch.setenv("TWILIO_PHONE_NUMBER", "+15551234567")
    for module_name in [
        "app.main",
        "app.launch",
        "app.api.deps",
        "app.config",
        "app.telephony.twilio",
        "app.telephony.service",
    ]:
        sys.modules.pop(module_name, None)
    return importlib.import_module("app.main")


def _seed_agent(client: TestClient, agent_id: str) -> None:
    user_id = "00000000-0000-0000-0000-000000000001"
    key = f"agent:{user_id}:{agent_id}"
    import asyncio

    asyncio.run(client.app.state.redis.set(key, json.dumps({"agent_name": "Launch Agent", "tasks": []})))


def test_contacts_are_crud_scoped_to_portal_user(monkeypatch, tmp_path):
    main = _reload_main(monkeypatch, tmp_path)

    with TestClient(main.app) as client:
        create_response = client.post(
            "/api/contacts",
            json={
                "name": "Ada Chen",
                "phone_number": "+19495080666",
                "email": "ada@example.com",
                "company": "Example Co",
                "tags": ["trial"],
                "notes": "Interested in renewal",
            },
        )
        assert create_response.status_code == 200
        contact = create_response.json()
        assert contact["id"]
        assert contact["name"] == "Ada Chen"
        assert contact["phone_number"] == "+19495080666"

        list_response = client.get("/api/contacts")
        assert list_response.status_code == 200
        assert list_response.json()["contacts"] == [contact]

        update_response = client.put(
            f"/api/contacts/{contact['id']}",
            json={
                "name": "Ada Chen",
                "phone_number": "+19495080666",
                "email": "ada@example.com",
                "company": "Example Co",
                "tags": ["trial", "priority"],
                "notes": "Asked for callback",
            },
        )
        assert update_response.status_code == 200
        assert update_response.json()["tags"] == ["trial", "priority"]

        delete_response = client.delete(f"/api/contacts/{contact['id']}")
        assert delete_response.status_code == 200
        assert client.get("/api/contacts").json()["contacts"] == []


def test_campaign_launch_creates_sessions_and_audit_logs(monkeypatch, tmp_path):
    main = _reload_main(monkeypatch, tmp_path)
    captured_calls = []

    class FakeProvider:
        name = "twilio"

        def place_outbound_call(self, agent_id: str, to_number: str):
            captured_calls.append({"agent_id": agent_id, "to_number": to_number})
            return {"provider": "twilio", "call_id": f"CA{len(captured_calls)}", "status": "queued"}

    main.app.dependency_overrides[main.get_telephony_provider] = lambda: FakeProvider()

    with TestClient(main.app) as client:
        agent_id = str(uuid.uuid4())
        _seed_agent(client, agent_id)
        contact_id = client.post(
            "/api/contacts",
            json={"name": "Grace Li", "phone_number": "+19495080666", "tags": [], "notes": ""},
        ).json()["id"]

        campaign = client.post(
            "/api/campaigns",
            json={
                "name": "June Renewal",
                "agent_id": agent_id,
                "contact_ids": [contact_id],
                "script": "Renewal check-in",
                "schedule": "immediate",
            },
        ).json()

        blocked = client.post(f"/api/campaigns/{campaign['id']}/launch", json={"compliance_ack": False})
        assert blocked.status_code == 400
        assert captured_calls == []

        launched = client.post(f"/api/campaigns/{campaign['id']}/launch", json={"compliance_ack": True})
        assert launched.status_code == 200
        assert launched.json()["campaign"]["status"] == "launched"
        assert launched.json()["sessions"][0]["provider_call_id"] == "CA1"
        assert captured_calls == [{"agent_id": agent_id, "to_number": "+19495080666"}]

        sessions = client.get("/api/call-sessions").json()["call_sessions"]
        assert len(sessions) == 1
        assert sessions[0]["campaign_id"] == campaign["id"]
        assert sessions[0]["contact_id"] == contact_id
        assert sessions[0]["status"] == "queued"

        audit_events = [item["event"] for item in client.get("/api/audit-logs").json()["audit_logs"]]
        assert "contact.created" in audit_events
        assert "campaign.created" in audit_events
        assert "campaign.launched" in audit_events
        assert "call_session.created" in audit_events


def test_campaign_launch_rejects_missing_contact(monkeypatch, tmp_path):
    main = _reload_main(monkeypatch, tmp_path)

    with TestClient(main.app) as client:
        agent_id = str(uuid.uuid4())
        _seed_agent(client, agent_id)
        campaign = client.post(
            "/api/campaigns",
            json={
                "name": "Bad Audience",
                "agent_id": agent_id,
                "contact_ids": [str(uuid.uuid4())],
                "script": "Hello",
            },
        ).json()

        response = client.post(f"/api/campaigns/{campaign['id']}/launch", json={"compliance_ack": True})

        assert response.status_code == 400
        assert response.json()["detail"] == "Campaign references missing contacts"


def test_provider_readiness_reports_missing_and_configured_settings(monkeypatch, tmp_path):
    main = _reload_main(monkeypatch, tmp_path)

    with TestClient(main.app) as client:
        ready = client.get("/api/provider-readiness")
        assert ready.status_code == 200
        assert ready.json()["ready"] is True
        assert ready.json()["missing"] == []

    main = _reload_main(monkeypatch, tmp_path, include_twilio_auth_token=False)
    with TestClient(main.app) as client:
        not_ready = client.get("/api/provider-readiness")
        assert not_ready.status_code == 200
        assert not_ready.json()["ready"] is False
        assert "TWILIO_AUTH_TOKEN" in not_ready.json()["missing"]
