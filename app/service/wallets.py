from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.schemas import CreateWalletRequest, WalletResponse
from app.repository import wallets as wallets_repository
from app.models import User

def get_balance(wallet_name: str | None, db: Session, current_user: User):
    if wallet_name is None:
        wallets = wallets_repository.get_all_wallets(db, current_user.id)
        return {"total_balance": sum([w.balance for w in wallets])}

    if not wallets_repository.is_wallet_exists(db, wallet_name, current_user.id):
        raise HTTPException(status_code=404, detail=f"Wallet '{wallet_name}' not found")

    wallet = wallets_repository.get_wallet_balance_by_name(db, wallet_name, current_user.id)
    return {"wallet": wallet.name, "balance": wallet.balance}


def create_wallet(wallet: CreateWalletRequest, db: Session, current_user: User) -> WalletResponse:
    if wallets_repository.is_wallet_exists(db, wallet.name, current_user.id):
        raise HTTPException(status_code=400, detail=f"Wallet '{wallet.name}' already exists")

    wallet_obj = wallets_repository.create_wallet(db, wallet.name, wallet.initial_balance, current_user.id, wallet.currency)

    db.commit()

    return WalletResponse.model_validate(wallet_obj)


def get_wallets(db: Session, current_user: User) -> list[WalletResponse]:
    wallets = wallets_repository.get_all_wallets(db, current_user.id)
    return [WalletResponse.model_validate(w) for w in wallets]
