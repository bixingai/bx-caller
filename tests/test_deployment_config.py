from pathlib import Path


def test_production_compose_disables_auth_bypass() -> None:
    compose = (Path(__file__).parents[1] / "docker-compose.prod.yml").read_text()

    assert 'DEV_BYPASS_AUTH: "0"' in compose
