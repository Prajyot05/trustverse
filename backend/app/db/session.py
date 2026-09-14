import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Was previously hardcoded to sqlite:///./trustverse.db, silently ignoring
# the DATABASE_URL documented in .env.example / .env. Read it for real so
# docker-compose's DATABASE_URL and test overrides actually take effect.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./trustverse.db")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False} # only needed for sqlite
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
