import importlib
import asyncio
import sys
import uuid

import jwt
import pytest
from pydantic import ValidationError


def _reload_security(monkeypatch, secret: str):
    monkeypatch.setenv("PORTAL_JWT_SECRET", secret)
    monkeypatch.delenv("DEV_BYPASS_AUTH", raising=False)
    for module_name in ["app.core.security", "app.config"]:
        sys.modules.pop(module_name, None)
    return importlib.import_module("app.core.security")


def _reload_main(monkeypatch, tmp_path):
    monkeypatch.setenv("PORTAL_JWT_SECRET", "ci-only-secret-ci-only-secret-123456")
    monkeypatch.setenv("AGENT_DATA_DIR", str(tmp_path))
    monkeypatch.delenv("DEV_BYPASS_AUTH", raising=False)
    for module_name in ["app.main", "app.api.deps", "app.core.security", "app.config"]:
        sys.modules.pop(module_name, None)
    return importlib.import_module("app.main")


def _reload_deps(monkeypatch, dev_bypass_auth: str):
    monkeypatch.setenv("PORTAL_JWT_SECRET", "ci-only-secret-ci-only-secret-123456")
    monkeypatch.setenv("DEV_BYPASS_AUTH", dev_bypass_auth)
    for module_name in ["app.api.deps", "app.core.security", "app.config"]:
        sys.modules.pop(module_name, None)
    return importlib.import_module("app.api.deps")


def test_verify_portal_token_accepts_portal_jwt(monkeypatch):
    secret = "ci-only-secret-ci-only-secret-123456"
    security = _reload_security(monkeypatch, secret)
    portal_user_id = str(uuid.uuid4())
    token = jwt.encode({"sub": portal_user_id}, secret, algorithm="HS256")

    payload = security.verify_portal_token(token)

    assert payload["sub"] == portal_user_id


def test_verify_portal_token_rejects_bad_signature(monkeypatch):
    security = _reload_security(monkeypatch, "ci-only-secret-ci-only-secret-123456")
    token = jwt.encode({"sub": str(uuid.uuid4())}, "wrong-secret", algorithm="HS256")

    assert security.verify_portal_token(token) is None


def test_portal_secret_rejects_placeholders(monkeypatch):
    monkeypatch.setenv("PORTAL_JWT_SECRET", "change-me-in-prod-change-me-in-prod")
    for module_name in ["app.config"]:
        sys.modules.pop(module_name, None)

    with pytest.raises(ValidationError):
        importlib.import_module("app.config")


def test_agent_prompt_files_roundtrip_for_editing(monkeypatch, tmp_path):
    main = _reload_main(monkeypatch, tmp_path)

    asyncio.run(
        main._store_agent_prompts(
            "agent-1/conversation_details.json",
            {"task_1": {"system_prompt": "Preserve the editable prompt."}},
        )
    )

    prompts = asyncio.run(main._read_agent_prompts("agent-1/conversation_details.json"))

    assert prompts == {"task_1": {"system_prompt": "Preserve the editable prompt."}}


def test_memory_agent_store_supports_agent_crud_pattern():
    from app.storage import create_agent_store

    store = create_agent_store("memory://local")

    async def exercise_store():
        assert await store.ping() is True
        assert await store.set("agent:user-1:agent-1", '{"agent_name": "Local"}') is True
        assert await store.exists("agent:user-1:agent-1") == 1
        assert await store.get("agent:user-1:agent-1") == '{"agent_name": "Local"}'
        assert [key async for key in store.scan_iter(match="agent:user-1:*")] == ["agent:user-1:agent-1"]
        assert await store.delete("agent:user-1:agent-1") == 1
        assert await store.exists("agent:user-1:agent-1") == 0

    asyncio.run(exercise_store())


def test_prepare_agent_data_allows_missing_provider_packages_in_development(monkeypatch, tmp_path):
    main = _reload_main(monkeypatch, tmp_path)
    original_import = __import__

    def guarded_import(name, *args, **kwargs):
        if name == "bolna.models":
            raise ModuleNotFoundError("No module named 'azure.cognitiveservices'")
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr("builtins.__import__", guarded_import)

    prepared = asyncio.run(
        main._prepare_agent_data(
            main.CreateAgentPayload(agent_config={"agent_name": "Local", "tasks": []}),
            assistant_status="seeding",
        )
    )

    assert prepared["agent_name"] == "Local"
    assert prepared["assistant_status"] == "seeding"


def test_dev_bypass_auth_comes_from_settings(monkeypatch):
    deps = _reload_deps(monkeypatch, "1")

    user = deps._portal_user_from_token(None)

    assert str(user.portal_user_id) == "00000000-0000-0000-0000-000000000001"
