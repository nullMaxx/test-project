from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.enum import CurrencyEnum
from app.models import Operation, Wallet


def create_operation(
    db: Session,
    wallet_id: int,
    type: str,
    amount: Decimal,
    currency: CurrencyEnum | None = None,
    category: str | None = None,
    subcategory: str | None = None,
) -> Operation:
    if currency is None:
        wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
        currency = wallet.currency if wallet and wallet.currency else CurrencyEnum.USD

    operation = Operation(
        wallet_id=wallet_id,
        type=type,
        amount=amount,
        currency=currency,
        category=category,
        subcategory=subcategory,
    )
    db.add(operation)
    db.flush()
    return operation

def get_operation_list(db: Session, wallets_ids: list[int], date_from: datetime | None = None, date_to: datetime | None = None) -> list[Operation]:
    query = db.query(Operation).filter(Operation.wallet_id.in_(wallets_ids))

    if date_from:
        query = query.filter(Operation.created_at >= date_from)

    if date_to:
        query = query.filter(Operation.created_at <= date_to)

    return query.all()