"""
Test Admin Dashboard APIs - Glowing Star Contest Platform
Tests for:
- Admin login flow
- Dashboard statistics API
- Admin votes API
- Admin payments API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@glowingstar.net"
ADMIN_PASSWORD = "admin123"


class TestAdminLogin:
    """Test admin login flow"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful - role: {data['user']['role']}")
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")


class TestAdminDashboardStats:
    """Test /api/admin/dashboard-stats endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin login failed")
    
    def test_dashboard_stats_returns_200(self):
        """Test dashboard stats endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard-stats", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Dashboard stats endpoint returns 200")
    
    def test_dashboard_stats_structure(self):
        """Test dashboard stats response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard-stats", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        
        # Check contestants section
        assert "contestants" in data, "Missing 'contestants' in response"
        contestants = data["contestants"]
        assert "total" in contestants, "Missing 'total' in contestants"
        assert "approved" in contestants, "Missing 'approved' in contestants"
        assert "pending" in contestants, "Missing 'pending' in contestants"
        
        # Check payments section
        assert "payments" in data, "Missing 'payments' in response"
        payments = data["payments"]
        assert "entry_fees_total" in payments, "Missing 'entry_fees_total' in payments"
        assert "vote_packages_total" in payments, "Missing 'vote_packages_total' in payments"
        assert "total_revenue" in payments, "Missing 'total_revenue' in payments"
        
        # Check votes section
        assert "votes" in data, "Missing 'votes' in response"
        votes = data["votes"]
        assert "total" in votes, "Missing 'total' in votes"
        assert "free" in votes, "Missing 'free' in votes"
        assert "paid" in votes, "Missing 'paid' in votes"
        
        # Check contest section
        assert "contest" in data, "Missing 'contest' in response"
        
        print(f"✓ Dashboard stats structure valid")
        print(f"  - Total contestants: {contestants['total']}")
        print(f"  - Total votes: {votes['total']}")
        print(f"  - Total revenue: {payments['total_revenue']}")
    
    def test_dashboard_stats_requires_auth(self):
        """Test dashboard stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard-stats")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Dashboard stats correctly requires authentication")


class TestAdminVotes:
    """Test /api/admin/votes endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin login failed")
    
    def test_admin_votes_returns_200(self):
        """Test admin votes endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/admin/votes?limit=50", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Admin votes endpoint returns 200")
    
    def test_admin_votes_returns_list(self):
        """Test admin votes returns a list"""
        response = requests.get(f"{BASE_URL}/api/admin/votes?limit=50", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ Admin votes returns list with {len(data)} votes")
    
    def test_admin_votes_structure(self):
        """Test admin votes response structure"""
        response = requests.get(f"{BASE_URL}/api/admin/votes?limit=10", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            vote = data[0]
            assert "id" in vote, "Missing 'id' in vote"
            assert "email" in vote, "Missing 'email' in vote"
            assert "contestant_id" in vote, "Missing 'contestant_id' in vote"
            assert "created_at" in vote, "Missing 'created_at' in vote"
            print(f"✓ Vote structure valid - sample email: {vote.get('email', 'N/A')}")
        else:
            print("✓ Admin votes returns empty list (no votes yet)")
    
    def test_admin_votes_requires_auth(self):
        """Test admin votes requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/votes")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Admin votes correctly requires authentication")


class TestAdminPayments:
    """Test /api/admin/payments endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin login failed")
    
    def test_admin_payments_returns_200(self):
        """Test admin payments endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/admin/payments?limit=50", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Admin payments endpoint returns 200")
    
    def test_admin_payments_structure(self):
        """Test admin payments response structure"""
        response = requests.get(f"{BASE_URL}/api/admin/payments?limit=50", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        
        # Check response structure
        assert "payments" in data, "Missing 'payments' in response"
        assert "totals" in data, "Missing 'totals' in response"
        assert "counts" in data, "Missing 'counts' in response"
        
        # Check totals structure
        totals = data["totals"]
        assert "entry_fees" in totals, "Missing 'entry_fees' in totals"
        assert "vote_packages" in totals, "Missing 'vote_packages' in totals"
        assert "total" in totals, "Missing 'total' in totals"
        
        # Check counts structure
        counts = data["counts"]
        assert "entry_fee_payments" in counts, "Missing 'entry_fee_payments' in counts"
        assert "vote_package_payments" in counts, "Missing 'vote_package_payments' in counts"
        
        print(f"✓ Admin payments structure valid")
        print(f"  - Total payments: {len(data['payments'])}")
        print(f"  - Total revenue: {totals['total']}")
    
    def test_admin_payments_list_is_array(self):
        """Test payments list is an array"""
        response = requests.get(f"{BASE_URL}/api/admin/payments?limit=50", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data["payments"], list), f"Expected list, got {type(data['payments'])}"
        print(f"✓ Payments list is array with {len(data['payments'])} items")
    
    def test_admin_payments_requires_auth(self):
        """Test admin payments requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/payments")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Admin payments correctly requires authentication")


class TestAdminStats:
    """Test /api/admin/stats endpoint (legacy)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin login failed")
    
    def test_admin_stats_returns_200(self):
        """Test admin stats endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Admin stats endpoint returns 200")
    
    def test_admin_stats_structure(self):
        """Test admin stats response structure"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        
        assert "total_contestants" in data, "Missing 'total_contestants'"
        assert "total_votes" in data, "Missing 'total_votes'"
        assert "total_categories" in data, "Missing 'total_categories'"
        assert "pending_approvals" in data, "Missing 'pending_approvals'"
        
        print(f"✓ Admin stats structure valid")
        print(f"  - Total contestants: {data['total_contestants']}")
        print(f"  - Total votes: {data['total_votes']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
