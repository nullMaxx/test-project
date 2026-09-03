from decimal import Decimal
from typing import Dict, Tuple

from app.enum import CurrencyEnum

FALLBACK_RATES: Dict[Tuple[str, str], Decimal] = {
    (CurrencyEnum.USD, CurrencyEnum.EUR): Decimal("0.89"),
    (CurrencyEnum.USD, CurrencyEnum.GBP): Decimal("0.75"),
    (CurrencyEnum.USD, CurrencyEnum.UAH): Decimal("25.00"),
    (CurrencyEnum.EUR, CurrencyEnum.USD): Decimal("1.18"),
    (CurrencyEnum.EUR, CurrencyEnum.GBP): Decimal("0.88"),
    (CurrencyEnum.EUR, CurrencyEnum.UAH): Decimal("30.00"),
}

def get_exchange_rate(from_currency: CurrencyEnum, to_currency: CurrencyEnum) -> Decimal:
    return FALLBACK_RATES.get((from_currency, to_currency), Decimal("1.00"))