from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field, field_validator

from app.schemas import CreateWalletRequest, OperationRequest


app = FastAPI()


BALANCE = {}


@app.get("/balance")
def get_balance(wallet_name: str | None = None):
    if wallet_name is None:
        return {"total_balance" : sum(BALANCE.get(wallet_name, []))}
    if wallet_name not in BALANCE:
        raise HTTPException(status_code=404, detail=f"Wallet '{wallet_name}' not found")
    return {"wallet": wallet_name, "balance": BALANCE[wallet_name]}

@app.post("/wallets")
def create_wallet(wallet: CreateWalletRequest):
    if wallet.name in BALANCE:
        raise HTTPException(status_code=400, detail=f"Wallet '{wallet.name}' already exists")
    
    BALANCE[wallet.name] = wallet.initial_balance

    return {"message": f"Wallet '{wallet.name}' created", "wallet": wallet.name, "balance": BALANCE[wallet.name]}


@app.post("/operations/income")
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
        

@app.post("/operations/expense")
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
    