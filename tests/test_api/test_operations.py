from app.models import User, Wallet
from decimal import Decimal


def test_add_expense_success(db_session, client):
    user = User(login="testuser")
    db_session.add(user)
    db_session.flush()
    wallet = Wallet(name="card", balance=1000, user_id=user.id)
    db_session.add(wallet)
    db_session.commit()
    db_session.refresh(wallet)

    response = client.post(
        "/api/v1/operations/expense",
        json={
            "wallet_name": "card",
            "amount": 50.0,
            "description": "Food"
        },
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Expense added"
    assert response.json()["wallet"] == wallet.name
    assert Decimal(str(response.json()["amount"])) == Decimal(50)
    assert Decimal(str(response.json()["new_balance"])) == Decimal(950)
    assert response.json()["description"] == "Food"

