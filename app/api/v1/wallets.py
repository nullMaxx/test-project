from fastapi import APIRouter
from sqlalchemy.orm import Session
from fastapi import Depends

from app.schemas import CreateWalletRequest, WalletResponse
from app.service import wallets as wallets_service
from app.dependency import get_db, get_current_user
from app.models import User

router = APIRouter()

@router.get("/balance")
def get_balance(wallet_name: str | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return wallets_service.get_balance(wallet_name, db, current_user)

@router.post("/wallets", response_model=WalletResponse)
def create_wallet(wallet: CreateWalletRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return wallets_service.create_wallet(wallet, db, current_user)

@router.get("/wallets", response_model=list[WalletResponse])
def get_wallets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return wallets_service.get_wallets(db, current_user)