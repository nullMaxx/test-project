class TestCreateUser:
    def test_create_user(self, client):
        resp = client.post("/api/v1/users", json={"login": "alice"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["login"] == "alice"
        assert "id" in data


class TestCreateWallet:
    def test_create_wallet(self, client):
        resp = client.post("/api/v1/wallets", json={"name": "savings", "initial_balance": 500})
        assert resp.status_code == 200
        data = resp.json()
        assert data["wallet"] == "savings"
        assert float(data["balance"]) == 500.0

    def test_create_wallet_default_balance(self, client):
        resp = client.post("/api/v1/wallets", json={"name": "empty"})
        assert resp.status_code == 200
        assert float(resp.json()["balance"]) == 0

    def test_create_duplicate_wallet(self, client):
        client.post("/api/v1/wallets", json={"name": "dup"})
        resp = client.post("/api/v1/wallets", json={"name": "dup"})
        assert resp.status_code == 400

    def test_create_wallet_negative_balance(self, client):
        resp = client.post("/api/v1/wallets", json={"name": "bad", "initial_balance": -100})
        assert resp.status_code == 422

    def test_create_wallet_empty_name(self, client):
        resp = client.post("/api/v1/wallets", json={"name": "  "})
        assert resp.status_code == 422


class TestGetBalance:
    def test_get_single_wallet_balance(self, client):
        client.post("/api/v1/wallets", json={"name": "main", "initial_balance": 1000})
        resp = client.get("/api/v1/balance", params={"wallet_name": "main"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["wallet"] == "main"
        assert float(data["balance"]) == 1000.0

    def test_get_total_balance(self, client):
        client.post("/api/v1/wallets", json={"name": "a", "initial_balance": 100})
        client.post("/api/v1/wallets", json={"name": "b", "initial_balance": 200})
        resp = client.get("/api/v1/balance")
        assert resp.status_code == 200
        assert float(resp.json()["total_balance"]) == 300.0

    def test_get_total_balance_no_wallets(self, client):
        resp = client.get("/api/v1/balance")
        assert resp.status_code == 200
        assert float(resp.json()["total_balance"]) == 0

    def test_get_balance_nonexistent_wallet(self, client):
        resp = client.get("/api/v1/balance", params={"wallet_name": "ghost"})
        assert resp.status_code == 404
