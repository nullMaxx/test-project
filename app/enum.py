from enum import StrEnum, auto


class CurrencyEnum(StrEnum):
    USD = auto()
    EUR = auto()
    GBP = auto()
    UAH = auto()

class OperationType(StrEnum):
    INCOME = auto()
    EXPENSE = auto()
    TRANSFER = auto()