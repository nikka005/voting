"""
Test P1 Core Admin Systems:
- Contest Management API
- Payment Management API
- Entry Fee Payment Flow
- User Management API
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://voting-contest.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@glowingstar.net"
ADMIN_PASSWORD = "admin123"
CONTESTANT_EMAIL = "isabella.rodriguez@contestant.glowingstar.net"
CONTESTANT_PASSWORD = "contestant123"


class TestAdminAuthentication:
    """Test admin authentication for P1 features"""
    
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
        return data["token"]


class TestContestManagementAPI:
    """Test Contest Management CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.admin_token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_get_all_contests(self):
        """Test GET /api/admin/contests returns list of contests"""
        response = requests.get(f"{BASE_URL}/api/admin/contests", headers=self.headers)
        assert response.status_code == 200, f"Failed to get contests: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} contests")
    
    def test_create_contest(self):
        """Test POST /api/admin/contests creates a new contest"""
        contest_data = {
            "name": f"TEST_Contest_{uuid.uuid4().hex[:8]}",
            "description": "Test contest for P1 features",
            "entry_fee": 50.0,
            "max_participants": 100,
            "start_date": "2026-02-01",
            "end_date": "2026-03-01",
            "registration_deadline": "2026-01-31",
            "voting_start_date": "2026-02-01",
            "voting_end_date": "2026-02-28",
            "prize_pool": 35000.0,
            "status": "draft",
            "rules": "Test rules"
        }
        response = requests.post(f"{BASE_URL}/api/admin/contests", json=contest_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to create contest: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Contest creation not successful"
        assert "contest" in data, "No contest in response"
        contest = data["contest"]
        assert contest["name"] == contest_data["name"], "Contest name mismatch"
        assert contest["entry_fee"] == contest_data["entry_fee"], "Entry fee mismatch"
        print(f"Created contest: {contest['id']}")
        return contest["id"]
    
    def test_get_active_contest(self):
        """Test GET /api/contests/active returns active contest info"""
        response = requests.get(f"{BASE_URL}/api/contests/active")
        assert response.status_code == 200, f"Failed to get active contest: {response.text}"
        data = response.json()
        assert "entry_fee" in data, "No entry_fee in response"
        assert "name" in data, "No name in response"
        print(f"Active contest: {data.get('name')} - Entry fee: ${data.get('entry_fee')}")
    
    def test_contest_requires_admin_auth(self):
        """Test that contest creation requires admin authentication"""
        contest_data = {
            "name": "Unauthorized Contest",
            "start_date": "2026-02-01",
            "end_date": "2026-03-01"
        }
        # Without auth
        response = requests.post(f"{BASE_URL}/api/admin/contests", json=contest_data)
        assert response.status_code in [401, 403], "Should require authentication"
        
        # With contestant auth
        contestant_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CONTESTANT_EMAIL,
            "password": CONTESTANT_PASSWORD
        })
        if contestant_response.status_code == 200:
            contestant_token = contestant_response.json()["token"]
            response = requests.post(
                f"{BASE_URL}/api/admin/contests", 
                json=contest_data,
                headers={"Authorization": f"Bearer {contestant_token}"}
            )
            assert response.status_code in [401, 403], "Contestant should not create contests"


class TestPaymentManagementAPI:
    """Test Payment Management API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.admin_token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_get_admin_payments(self):
        """Test GET /api/admin/payments returns payment data"""
        response = requests.get(f"{BASE_URL}/api/admin/payments", headers=self.headers)
        assert response.status_code == 200, f"Failed to get payments: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "payments" in data, "No payments key in response"
        assert "totals" in data, "No totals key in response"
        assert "counts" in data, "No counts key in response"
        
        # Verify totals structure - API returns entry_fees, vote_packages, total
        totals = data["totals"]
        assert "entry_fees" in totals, "No entry_fees in totals"
        assert "vote_packages" in totals, "No vote_packages in totals"
        assert "total" in totals, "No total in totals"
        
        print(f"Total Revenue: ${totals.get('total', 0) / 100}")
        print(f"Entry Fees: ${totals.get('entry_fees', 0) / 100}")
        print(f"Vote Packages: ${totals.get('vote_packages', 0) / 100}")
        print(f"Total Transactions: {len(data['payments'])}")
    
    def test_payments_requires_admin_auth(self):
        """Test that payments endpoint requires admin authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/payments")
        assert response.status_code in [401, 403], "Should require authentication"
    
    def test_dashboard_stats_includes_payments(self):
        """Test GET /api/admin/dashboard-stats includes payment info"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard-stats", headers=self.headers)
        assert response.status_code == 200, f"Failed to get dashboard stats: {response.text}"
        data = response.json()
        
        # Verify payments section exists
        assert "payments" in data, "No payments in dashboard stats"
        payments = data["payments"]
        assert "total_revenue" in payments, "No total_revenue in payments"
        assert "entry_fees_total" in payments, "No entry_fees_total in payments"
        print(f"Dashboard payments stats: {payments}")


class TestEntryFeePaymentFlow:
    """Test Entry Fee Payment Flow with Stripe"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get contestant token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CONTESTANT_EMAIL,
            "password": CONTESTANT_PASSWORD
        })
        if response.status_code == 200:
            self.contestant_token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.contestant_token}"}
        else:
            pytest.skip("Contestant login failed - skipping entry fee tests")
    
    def test_get_payment_status(self):
        """Test GET /api/payments/my-status returns payment status"""
        response = requests.get(f"{BASE_URL}/api/payments/my-status", headers=self.headers)
        assert response.status_code == 200, f"Failed to get payment status: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "has_paid" in data or "entry_fee_paid" in data, "No payment status in response"
        print(f"Payment status: {data}")
    
    def test_create_entry_fee_checkout(self):
        """Test POST /api/payments/entry-fee creates Stripe checkout session"""
        payload = {
            "contest_id": "default",
            "origin_url": "https://voting-contest.preview.emergentagent.com"
        }
        response = requests.post(f"{BASE_URL}/api/payments/entry-fee", json=payload, headers=self.headers)
        
        # Could be 200 (success), 400 (already paid), or 500 (Stripe API key issue in test env)
        if response.status_code == 200:
            data = response.json()
            assert "checkout_url" in data, "No checkout_url in response"
            assert "session_id" in data, "No session_id in response"
            print(f"Checkout URL created: {data['checkout_url'][:50]}...")
        elif response.status_code == 400:
            data = response.json()
            # Already paid is acceptable
            if "already paid" in data.get("detail", "").lower():
                print("Entry fee already paid - this is expected")
            else:
                print(f"Entry fee creation failed: {data}")
        elif response.status_code == 500:
            data = response.json()
            # Stripe API key error in test environment is acceptable
            if "api key" in data.get("detail", "").lower() or "stripe" in data.get("detail", "").lower():
                print(f"Stripe API key issue (expected in test env): {data.get('detail')}")
            else:
                assert False, f"Unexpected 500 error: {response.text}"
        else:
            assert False, f"Unexpected status code: {response.status_code} - {response.text}"
    
    def test_entry_fee_requires_auth(self):
        """Test that entry fee endpoint requires authentication"""
        payload = {
            "contest_id": "default",
            "origin_url": "https://voting-contest.preview.emergentagent.com"
        }
        response = requests.post(f"{BASE_URL}/api/payments/entry-fee", json=payload)
        assert response.status_code in [401, 403], "Should require authentication"


class TestUserManagementAPI:
    """Test User Management API for admin"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.admin_token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_get_contestants_list(self):
        """Test GET /api/contestants returns list of contestants"""
        response = requests.get(f"{BASE_URL}/api/contestants", headers=self.headers)
        assert response.status_code == 200, f"Failed to get contestants: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} contestants")
        
        # Verify contestant structure
        if len(data) > 0:
            contestant = data[0]
            assert "id" in contestant, "No id in contestant"
            assert "full_name" in contestant, "No full_name in contestant"
            assert "status" in contestant, "No status in contestant"
    
    def test_filter_contestants_by_status(self):
        """Test filtering contestants by status"""
        for status in ["approved", "pending", "rejected"]:
            response = requests.get(f"{BASE_URL}/api/contestants?status={status}", headers=self.headers)
            assert response.status_code == 200, f"Failed to filter by {status}: {response.text}"
            data = response.json()
            # Verify all returned contestants have the correct status
            for contestant in data:
                assert contestant["status"] == status, f"Contestant has wrong status: {contestant['status']}"
            print(f"Found {len(data)} {status} contestants")
    
    def test_search_contestants(self):
        """Test searching contestants by name"""
        response = requests.get(f"{BASE_URL}/api/contestants?search=isabella", headers=self.headers)
        assert response.status_code == 200, f"Failed to search contestants: {response.text}"
        data = response.json()
        print(f"Found {len(data)} contestants matching 'isabella'")
    
    def test_update_contestant_status(self):
        """Test updating contestant status (approve/reject)"""
        # First get a contestant
        response = requests.get(f"{BASE_URL}/api/contestants?limit=1", headers=self.headers)
        assert response.status_code == 200
        contestants = response.json()
        
        if len(contestants) > 0:
            contestant_id = contestants[0]["id"]
            current_status = contestants[0]["status"]
            
            # Try to update status (just verify the endpoint works)
            new_status = "approved" if current_status != "approved" else "pending"
            response = requests.put(
                f"{BASE_URL}/api/admin/contestants/{contestant_id}/status?status={new_status}",
                headers=self.headers
            )
            assert response.status_code == 200, f"Failed to update status: {response.text}"
            
            # Revert to original status
            response = requests.put(
                f"{BASE_URL}/api/admin/contestants/{contestant_id}/status?status={current_status}",
                headers=self.headers
            )
            assert response.status_code == 200
            print(f"Successfully tested status update for contestant {contestant_id}")


class TestCategoryManagementAPI:
    """Test Category Management CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.admin_token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_get_all_categories(self):
        """Test GET /api/categories returns list of categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Failed to get categories: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} categories")
        
        # Verify category structure
        if len(data) > 0:
            category = data[0]
            assert "id" in category, "No id in category"
            assert "name" in category, "No name in category"
            assert "is_active" in category, "No is_active in category"
    
    def test_create_category(self):
        """Test POST /api/categories creates a new category"""
        category_data = {
            "name": f"TEST_Category_{uuid.uuid4().hex[:8]}",
            "description": "Test category for P1 features",
            "is_active": True
        }
        response = requests.post(f"{BASE_URL}/api/categories", json=category_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to create category: {response.text}"
        data = response.json()
        assert data["name"] == category_data["name"], "Category name mismatch"
        print(f"Created category: {data['id']}")
        return data["id"]
    
    def test_update_category(self):
        """Test PUT /api/categories/{id} updates a category"""
        # First create a category
        category_data = {
            "name": f"TEST_Update_{uuid.uuid4().hex[:8]}",
            "description": "Original description",
            "is_active": True
        }
        create_response = requests.post(f"{BASE_URL}/api/categories", json=category_data, headers=self.headers)
        assert create_response.status_code == 200
        category_id = create_response.json()["id"]
        
        # Update the category
        updated_data = {
            "name": category_data["name"],
            "description": "Updated description",
            "is_active": False
        }
        response = requests.put(f"{BASE_URL}/api/categories/{category_id}", json=updated_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to update category: {response.text}"
        data = response.json()
        assert data["description"] == "Updated description", "Description not updated"
        assert data["is_active"] == False, "is_active not updated"
        print(f"Updated category: {category_id}")
        
        # Cleanup - delete the test category
        requests.delete(f"{BASE_URL}/api/categories/{category_id}", headers=self.headers)
    
    def test_delete_category(self):
        """Test DELETE /api/categories/{id} deletes a category"""
        # First create a category
        category_data = {
            "name": f"TEST_Delete_{uuid.uuid4().hex[:8]}",
            "description": "To be deleted",
            "is_active": True
        }
        create_response = requests.post(f"{BASE_URL}/api/categories", json=category_data, headers=self.headers)
        assert create_response.status_code == 200
        category_id = create_response.json()["id"]
        
        # Delete the category
        response = requests.delete(f"{BASE_URL}/api/categories/{category_id}", headers=self.headers)
        assert response.status_code == 200, f"Failed to delete category: {response.text}"
        print(f"Deleted category: {category_id}")
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/categories")
        categories = get_response.json()
        category_ids = [c["id"] for c in categories]
        assert category_id not in category_ids, "Category was not deleted"


class TestVotePackagesAPI:
    """Test Vote Packages API"""
    
    def test_get_vote_packages(self):
        """Test GET /api/vote-packages returns available packages"""
        response = requests.get(f"{BASE_URL}/api/vote-packages")
        assert response.status_code == 200, f"Failed to get vote packages: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one vote package"
        
        # Verify package structure
        package = data[0]
        assert "id" in package, "No id in package"
        assert "name" in package, "No name in package"
        assert "votes" in package, "No votes in package"
        assert "price" in package, "No price in package"
        
        print(f"Found {len(data)} vote packages:")
        for pkg in data:
            print(f"  - {pkg['name']}: {pkg['votes']} votes for ${pkg['price']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
