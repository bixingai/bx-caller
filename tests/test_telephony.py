import importlib
import json
import sys
import uuid

from fastapi.testclient import TestClient


def _reload_main(monkeypatch, tmp_path):
    monkeypatch.setenv("PORTAL_JWT_SECRET", "ci-only-secret-ci-only-secret-123456")
    monkeypatch.setenv("DEV_BYPASS_AUTH", "1")
    monkeypatch.setenv("REDIS_URL", "memory://local")
    monkeypatch.setenv("AGENT_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("PUBLIC_BASE_URL", "https://tools.bixingai.com/bx-caller")
    monkeypatch.setenv("WEBSOCKET_ACCESS_TOKEN", "callback-token")
    monkeypatch.setenv("TWILIO_ACCOUNT_SID", "AC00000000000000000000000000000000")
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", "auth-token")
    monkeypatch.setenv("TWILIO_PHONE_NUMBER", "+15551234567")
    for module_name in [
        "app.main",
        "app.api.deps",
        "app.config",
        "app.telephony.twilio",
        "app.telephony.service",
    ]:
        sys.modules.pop(module_name, None)
    return importlib.import_module("app.main")


def test_twilio_connect_response_streams_to_agent_websocket(monkeypatch, tmp_path):
    main = _reload_main(monkeypatch, tmp_path)
    client = TestClient(main.app)

    response = client.post("/api/telephony/twilio/connect", params={"agent_id": "agent-1", "token": "callback-token"})

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/xml")
    assert '<Connect><Stream url="wss://tools.bixingai.com/bx-caller/chat/v1/agent-1?token=callback-token"' in (
        response.text
    )


def test_twilio_connect_rejects_bad_callback_token(monkeypatch, tmp_path):
    main = _reload_main(monkeypatch, tmp_path)
    client = TestClient(main.app)

    response = client.post("/api/telephony/twilio/connect", params={"agent_id": "agent-1", "token": "wrong"})

    assert response.status_code == 403


def test_outbound_call_endpoint_uses_selected_telephony_provider(monkeypatch, tmp_path):
    main = _reload_main(monkeypatch, tmp_path)
    captured = {}

    class FakeProvider:
        name = "twilio"

        def place_outbound_call(self, agent_id: str, to_number: str):
            captured["agent_id"] = agent_id
            captured["to_number"] = to_number
            return {"provider": "twilio", "call_id": "CA123", "status": "queued"}

    main.app.dependency_overrides[main.get_telephony_provider] = lambda: FakeProvider()

    with TestClient(main.app) as client:
        agent_id = str(uuid.uuid4())
        store = client.app.state.redis
        user_id = "00000000-0000-0000-0000-000000000001"
        key = f"agent:{user_id}:{agent_id}"
        client.app.extra["seed"] = store
        import asyncio

        asyncio.run(store.set(key, json.dumps({"agent_name": "Local"})))

        response = client.post(
            "/api/calls/outbound",
            json={"agent_id": agent_id, "to": "+19495080666", "provider": "twilio"},
        )

    assert response.status_code == 200
    assert response.json() == {"provider": "twilio", "call_id": "CA123", "status": "queued"}
    assert captured == {"agent_id": agent_id, "to_number": "+19495080666"}


def test_outbound_call_endpoint_rejects_unknown_agent(monkeypatch, tmp_path):
    main = _reload_main(monkeypatch, tmp_path)

    with TestClient(main.app) as client:
        response = client.post(
            "/api/calls/outbound",
            json={"agent_id": str(uuid.uuid4()), "to": "+19495080666", "provider": "twilio"},
        )

    assert response.status_code == 404


def test_twilio_provider_creates_call_with_connect_callback():
    from app.telephony.twilio import TwilioTelephonyProvider

    captured = {}

    class FakeCalls:
        def create(self, **kwargs):
            captured.update(kwargs)

            class Call:
                sid = "CA123"
                status = "queued"

            return Call()

    class FakeClient:
        calls = FakeCalls()

    provider = TwilioTelephonyProvider(
        account_sid="AC00000000000000000000000000000000",
        auth_token="auth-token",
        from_number="+15551234567",
        public_base_url="https://tools.bixingai.com/bx-caller",
        callback_token="callback-token",
        client=FakeClient(),
    )

    result = provider.place_outbound_call("agent-1", "+19495080666")

    assert captured == {
        "to": "+19495080666",
        "from_": "+15551234567",
        "url": "https://tools.bixingai.com/bx-caller/api/telephony/twilio/connect?agent_id=agent-1&token=callback-token",
        "method": "POST",
        "record": True,
    }
    assert result.provider == "twilio"
    assert result.call_id == "CA123"
    assert result.status == "queued"
