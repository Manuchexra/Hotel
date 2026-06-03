import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

POSTGRES_USER = os.getenv("POSTGRES_USER", "hotelos")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "hotelos_pass")
POSTGRES_DB = os.getenv("POSTGRES_DB", "hotelos")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "postgres")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql+psycopg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def wait_for_db(timeout: int = 60, interval: float = 2.0):
    import time
    from sqlalchemy.exc import OperationalError

    start = time.time()
    while True:
        try:
            with engine.connect() as connection:
                connection.exec_driver_sql("SELECT 1")
                return
        except OperationalError:
            if time.time() - start > timeout:
                raise
            time.sleep(interval)


def init_db():
    wait_for_db()
    Base.metadata.create_all(bind=engine)
