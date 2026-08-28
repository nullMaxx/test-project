from typing import Generator

import pytest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient

from app.dependency import get_db, get_current_user
from app.database import Base
from app.models import User
from main import app

TEST_DATABASE_URL = "sqlite:///./test.db"

test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})

TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def get_test_db() -> Generator[Session, None, None]:
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_test_user() -> User:
    db = TestSessionLocal()
    try:
        user = db.query(User).filter(User.login == "testuser").first()
        if not user:
            user = User(login="testuser")
            db.add(user)
            db.commit()
            db.refresh(user)
        return user
    finally:
        db.close()

@pytest.fixture()
def client() -> TestClient:
    yield TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = get_test_db
app.dependency_overrides[get_current_user] = get_test_user