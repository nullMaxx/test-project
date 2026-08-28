from decimal import Decimal
from sqlalchemy.orm import Session
from app.models import Wallet


def is_wallet_exists(db: Session, wallet_name: str, user_id: int) -> bool:
    return db.query(Wallet).filter(Wallet.name == wallet_name, Wallet.user_id == user_id).first() is not None


def add_income(db: Session, wallet_name: str, amount: Decimal) -> Wallet:
    wallet = db.query(Wallet).filter(Wallet.name == wallet_name).first()
    wallet.balance += amount
    return wallet


def get_wallet_balance_by_name(db: Session, wallet_name: str, user_id: int) -> Wallet:
    return db.query(Wallet).filter(Wallet.name == wallet_name, Wallet.user_id == user_id).first()


def add_expense(db: Session, wallet_name: str, amount: Decimal) -> Wallet:
    wallet = db.query(Wallet).filter(Wallet.name == wallet_name).first()
    wallet.balance -= amount
    return wallet


def get_all_wallets(db: Session, user_id: int) -> list[Wallet]:
    return db.query(Wallet).filter(Wallet.user_id == user_id).all()


def create_wallet(db: Session, wallet_name: str, amount: float, user_id: int) -> Wallet:
    wallet = Wallet(name=wallet_name, balance=amount, user_id=user_id)
    db.add(wallet)
    db.flush()
    return wallet
