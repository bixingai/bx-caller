from pathlib import Path


def test_production_compose_disables_auth_bypass() -> None:
    compose = (Path(__file__).parents[1] / "docker-compose.prod.yml").read_text()

    assert 'DEV_BYPASS_AUTH: "0"' in compose


def test_production_deploy_runs_only_from_master() -> None:
    workflow = (Path(__file__).parents[1] / ".github" / "workflows" / "deploy.yml").read_text()

    assert "branches: [master]" in workflow
    assert "branches: [develop]" not in workflow
