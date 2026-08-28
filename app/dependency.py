from typing import Generator

from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.repository import users as users_repository
from app.models import User

from app.database import SessionLocal


security = HTTPBearer()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
    login = credentials.credentials

    user = users_repository.get_user(db, login)
    
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    return user