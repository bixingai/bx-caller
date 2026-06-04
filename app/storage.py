from fnmatch import fnmatch
from typing import Any, AsyncIterator

import redis.asyncio as redis


class InMemoryAgentStore:
    def __init__(self) -> None:
        self._data: dict[str, str] = {}

    async def ping(self) -> bool:
        return True

    async def get(self, key: str) -> str | None:
        return self._data.get(key)

    async def set(self, key: str, value: str) -> bool:
        self._data[key] = value
        return True

    async def exists(self, key: str) -> int:
        return int(key in self._data)

    async def delete(self, key: str) -> int:
        return int(self._data.pop(key, None) is not None)

    async def scan_iter(self, match: str, count: int = 100) -> AsyncIterator[str]:
        del count
        for key in list(self._data):
            if fnmatch(key, match):
                yield key

    async def aclose(self) -> None:
        self._data.clear()


def create_agent_store(redis_url: str) -> Any:
    if redis_url == "memory://local":
        return InMemoryAgentStore()
    pool = redis.ConnectionPool.from_url(redis_url, decode_responses=True)
    return redis.Redis.from_pool(pool)
