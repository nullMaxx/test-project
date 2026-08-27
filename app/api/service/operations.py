from fastapi import APIRouter, HTTPException

from app.schemas import OperationRequest

router = APIRouter()

@router.post("/operations/income")
def add_income(operation: OperationRequest):
    if operation.wallet_name not in BALANCE:
        raise HTTPException(status_code=404, detail=f"Wallet '{operation.wallet_name}' not found")

    BALANCE[operation.wallet_name] += operation.amount

    return {
        "message": "Incomde added",
        "wallet": operation.wallet_name,
        "amount": operation.amount,
        "description": operation.description,
        "new_balance": BALANCE[operation.wallet_name]
    }
        

@router.post("/operations/expense")
def add_expense(operation: OperationRequest):
    if operation.wallet_name not in BALANCE:
            raise HTTPException(status_code=404, detail=f"Wallet '{operation.wallet_name}' not found")
    
    if operation.amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")

    if BALANCE[operation.wallet_name] < operation.amount:
         raise HTTPException(status_code=400, detail=f"Insufficient funds. Available: {BALANCE[operation.wallet_name]}") 

    BALANCE[operation.wallet_name] -= operation.amount

    return {
            "message": "Expense added",
            "wallet": operation.wallet_name,
            "amount": operation.amount,
            "description": operation.description,
            "new_balance": BALANCE[operation.wallet_name]
    }