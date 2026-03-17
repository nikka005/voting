"""
Test Suite for Wallet, Payment Pages, and Admin Contest Delete Features
Tests:
1. Contestant Wallet API - GET /api/contestant/wallet
2. Wallet Withdrawal API - POST /api/contestant/wallet/withdraw
3. Admin Contest Delete API - DELETE /api/admin/contests/{contest_id}
4. Entry Fee Payment Status API - GET /api/payments/my-status
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://contest-admin-1.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@glowingstar.net"
ADMIN_PASSWORD = "admin123"
CONTESTANT_EMAIL = "test_contestant@test.com"
CONTESTANT_PASSWORD = "Test123!"


class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_admin_login(self):
        """Test admin login returns valid token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert data["user"]["role"] == "admin", "User is not admin"
        print(f"✓ Admin login successful, role: {data['user']['role']}")
        return data["token"]
    
    def test_contestant_login_or_register(self):
        """Test contestant login or register if not exists"""
        # Try login first
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CONTESTANT_EMAIL,
            "password": CONTESTANT_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Contestant login successful, role: {data['user']['role']}")
            return data["token"]
        
        # If login fails, register new contestant
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": CONTESTANT_EMAIL,
            "password": CONTESTANT_PASSWORD,
            "full_name": "Test Contestant"
        })
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Contestant registered successfully")
            return data["token"]
        elif response.status_code == 400 and "already registered" in response.text:
            # Email exists but password might be wrong - try with different password
            print(f"! Contestant email exists but login failed - may need password reset")
            return None
        else:
            print(f"! Contestant registration failed: {response.text}")
            return None


class TestWalletAPI:
    """Test Contestant Wallet API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get contestant token"""
        auth = TestAuthentication()
        self.token = auth.test_contestant_login_or_register()
        if self.token:
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate contestant")
    
    def test_get_wallet_returns_correct_structure(self):
        """Test GET /api/contestant/wallet returns correct data structure"""
        response = requests.get(f"{BASE_URL}/api/contestant/wallet", headers=self.headers)
        
        assert response.status_code == 200, f"Wallet GET failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "balance" in data, "Missing 'balance' field"
        assert "transactions" in data, "Missing 'transactions' field"
        assert "user_id" in data, "Missing 'user_id' field"
        
        # Verify data types
        assert isinstance(data["balance"], (int, float)), "Balance should be numeric"
        assert isinstance(data["transactions"], list), "Transactions should be a list"
        
        print(f"✓ Wallet API returns correct structure: balance={data['balance']}, transactions={len(data['transactions'])}")
    
    def test_wallet_balance_is_non_negative(self):
        """Test wallet balance is non-negative"""
        response = requests.get(f"{BASE_URL}/api/contestant/wallet", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["balance"] >= 0, "Balance should not be negative"
        print(f"✓ Wallet balance is non-negative: {data['balance']}")
    
    def test_wallet_requires_authentication(self):
        """Test wallet endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/contestant/wallet")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Wallet endpoint correctly requires authentication")


class TestWalletWithdrawal:
    """Test Wallet Withdrawal API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get contestant token"""
        auth = TestAuthentication()
        self.token = auth.test_contestant_login_or_register()
        if self.token:
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate contestant")
    
    def test_withdrawal_insufficient_balance(self):
        """Test withdrawal with insufficient balance returns error"""
        # Try to withdraw more than balance (new accounts have 0 balance)
        response = requests.post(
            f"{BASE_URL}/api/contestant/wallet/withdraw",
            params={
                "amount": 1000,
                "payment_method": "bank_transfer",
                "payment_details": "Test Bank Account"
            },
            headers=self.headers
        )
        
        # Should fail with insufficient balance
        assert response.status_code == 400, f"Expected 400 for insufficient balance, got {response.status_code}"
        assert "insufficient" in response.text.lower() or "balance" in response.text.lower()
        print("✓ Withdrawal correctly rejects insufficient balance")
    
    def test_withdrawal_requires_authentication(self):
        """Test withdrawal endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/contestant/wallet/withdraw",
            params={
                "amount": 10,
                "payment_method": "bank_transfer",
                "payment_details": "Test"
            }
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Withdrawal endpoint correctly requires authentication")


class TestAdminContestDelete:
    """Test Admin Contest Delete API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        auth = TestAuthentication()
        self.admin_token = auth.test_admin_login()
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_create_and_delete_draft_contest(self):
        """Test creating and deleting a draft contest"""
        # Create a test contest
        contest_data = {
            "name": "TEST_Delete_Contest",
            "description": "Test contest for deletion",
            "entry_fee": 30.0,
            "max_participants": 50,
            "start_date": "2026-02-01",
            "end_date": "2026-03-01",
            "prize_pool": 10000.0,
            "status": "draft"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/contests",
            json=contest_data,
            headers=self.admin_headers
        )
        
        assert create_response.status_code == 200, f"Contest creation failed: {create_response.text}"
        response_data = create_response.json()
        # Contest is nested under 'contest' key
        created_contest = response_data.get("contest", response_data)
        contest_id = created_contest["id"]
        print(f"✓ Created test contest: {contest_id}")
        
        # Delete the contest
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/contests/{contest_id}",
            headers=self.admin_headers
        )
        
        assert delete_response.status_code == 200, f"Contest deletion failed: {delete_response.text}"
        delete_data = delete_response.json()
        assert delete_data["success"] == True, "Delete response should have success=True"
        assert "deleted" in delete_data["message"].lower() or "archived" in delete_data["message"].lower()
        print(f"✓ Contest deleted successfully: {delete_data['message']}")
        
        # Verify contest is deleted
        get_response = requests.get(
            f"{BASE_URL}/api/admin/contests",
            headers=self.admin_headers
        )
        contests = get_response.json()
        contest_ids = [c["id"] for c in contests]
        assert contest_id not in contest_ids, "Deleted contest should not appear in list"
        print("✓ Verified contest no longer in list")
    
    def test_delete_nonexistent_contest(self):
        """Test deleting a non-existent contest returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/contests/nonexistent-id-12345",
            headers=self.admin_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Delete non-existent contest correctly returns 404")
    
    def test_delete_requires_admin(self):
        """Test contest deletion requires admin authentication"""
        # Try without auth
        response = requests.delete(f"{BASE_URL}/api/admin/contests/some-id")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        # Try with contestant auth
        auth = TestAuthentication()
        contestant_token = auth.test_contestant_login_or_register()
        if contestant_token:
            response = requests.delete(
                f"{BASE_URL}/api/admin/contests/some-id",
                headers={"Authorization": f"Bearer {contestant_token}"}
            )
            assert response.status_code in [401, 403], f"Expected 401/403 for contestant, got {response.status_code}"
        
        print("✓ Contest deletion correctly requires admin authentication")


class TestEntryFeePaymentStatus:
    """Test Entry Fee Payment Status API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get contestant token"""
        auth = TestAuthentication()
        self.token = auth.test_contestant_login_or_register()
        if self.token:
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate contestant")
    
    def test_get_payment_status(self):
        """Test GET /api/payments/my-status returns payment status"""
        response = requests.get(f"{BASE_URL}/api/payments/my-status", headers=self.headers)
        
        assert response.status_code == 200, f"Payment status failed: {response.text}"
        data = response.json()
        
        # Verify response has entry_fee_paid field
        assert "entry_fee_paid" in data, "Missing 'entry_fee_paid' field"
        assert isinstance(data["entry_fee_paid"], bool), "entry_fee_paid should be boolean"
        
        print(f"✓ Payment status API works: entry_fee_paid={data['entry_fee_paid']}")
    
    def test_payment_status_requires_auth(self):
        """Test payment status requires authentication"""
        response = requests.get(f"{BASE_URL}/api/payments/my-status")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Payment status correctly requires authentication")


class TestActiveContest:
    """Test Active Contest API for entry fee display"""
    
    def test_get_active_contest(self):
        """Test GET /api/contests/active returns contest info with entry fee"""
        response = requests.get(f"{BASE_URL}/api/contests/active")
        
        # May return 404 if no active contest, which is valid
        if response.status_code == 404:
            print("! No active contest found (expected if none configured)")
            return
        
        assert response.status_code == 200, f"Active contest failed: {response.text}"
        data = response.json()
        
        # Verify entry_fee field exists
        if "entry_fee" in data:
            print(f"✓ Active contest has entry_fee: ${data['entry_fee']}")
            assert isinstance(data["entry_fee"], (int, float)), "entry_fee should be numeric"
        else:
            print("! Active contest response missing entry_fee field")


class TestContestList:
    """Test Contest List API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        auth = TestAuthentication()
        self.admin_token = auth.test_admin_login()
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_get_all_contests(self):
        """Test GET /api/admin/contests returns list of contests"""
        response = requests.get(f"{BASE_URL}/api/admin/contests", headers=self.admin_headers)
        
        assert response.status_code == 200, f"Get contests failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            contest = data[0]
            # Verify contest structure
            assert "id" in contest, "Contest missing 'id'"
            assert "name" in contest, "Contest missing 'name'"
            assert "entry_fee" in contest, "Contest missing 'entry_fee'"
            assert "status" in contest, "Contest missing 'status'"
            print(f"✓ Got {len(data)} contests, first: {contest['name']} (entry_fee: ${contest['entry_fee']})")
        else:
            print("✓ Contest list is empty (no contests created yet)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
