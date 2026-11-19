"""Database connection helpers for the PersonaLens warehouse.

The connection string comes from the ``DATABASE_URL`` environment variable or,
if that is not set, from the git-ignored ``.env`` file in the project root:

    DATABASE_URL=postgresql+psycopg2://postgres:<password>@localhost:5432/personalens

Copy ``.env.example`` to ``.env`` and fill in your own local password.
"""

from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.engine import make_url

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_SQL = Path(__file__).with_name("schema.sql")


def _read_env_file(path: Path = PROJECT_ROOT / ".env") -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def database_url() -> str:
    url = os.environ.get("DATABASE_URL") or _read_env_file().get("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. Copy .env.example to .env and fill in your local "
            "PostgreSQL password (see README → Data warehouse)."
        )
    return url


def ensure_database(url: str) -> None:
    """Create the target database if it does not exist yet."""
    target = make_url(url)
    admin = create_engine(target.set(database="postgres"), isolation_level="AUTOCOMMIT")
    try:
        with admin.connect() as conn:
            exists = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": target.database}
            ).scalar()
            if not exists:
                conn.execute(text(f'CREATE DATABASE "{target.database}"'))
    finally:
        admin.dispose()


def get_engine(url: str | None = None, create: bool = True) -> Engine:
    """Return a SQLAlchemy engine; optionally create the database first."""
    url = url or database_url()
    if create:
        ensure_database(url)
    return create_engine(url)


def apply_schema(engine: Engine) -> None:
    """Run schema.sql (idempotent: creates only what is missing)."""
    sql = SCHEMA_SQL.read_text(encoding="utf-8")
    raw = engine.raw_connection()
    try:
        with raw.cursor() as cur:
            cur.execute(sql)
        raw.commit()
    finally:
        raw.close()
