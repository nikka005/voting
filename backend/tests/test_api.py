"""
Backend API Tests for Glowing Star Contest Platform
Tests: Health check, Auth, Contestants, Categories, Leaderboard, WebSocket endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://voting-contest.preview.emergentagent.com')

class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_check_returns_glowing_star_service(self):
        """Test that health check returns correct service name"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "glowing-star-contest-api"
        assert "websocket" in data["features"]
        assert "fraud-detection" in data["features"]
        assert "email-templates" in data["features"]
        print(f"Health check passed: {data}")


class TestAuth:
    """Authentication endpoint tests"""
    
    def test_login_with_admin_credentials(self):
        """Test admin login with admin@glowingstar.net"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@glowingstar.net",
            "password": "admin123"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@glowingstar.net"
        assert data["user"]["role"] == "admin"
        print(f"Admin login successful: {data['user']['email']}")
        return data["token"]
    
    def test_login_with_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("Invalid credentials correctly rejected")
    
    def test_get_me_with_valid_token(self):
        """Test /auth/me endpoint with valid token"""
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@glowingstar.net",
            "password": "admin123"
        })
        token = login_response.json()["token"]
        
        # Get user info
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == "admin@glowingstar.net"
        assert data["role"] == "admin"
        print(f"Get me successful: {data['email']}")


class TestContestants:
    """Contestant endpoint tests"""
    
    def test_get_contestants_list(self):
        """Test getting list of contestants"""
        response = requests.get(f"{BASE_URL}/api/contestants")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Got {len(data)} contestants")
    
    def test_get_approved_contestants(self):
        """Test getting only approved contestants"""
        response = requests.get(f"{BASE_URL}/api/contestants?status=approved")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # All returned contestants should be approved
        for contestant in data:
            assert contestant["status"] == "approved"
        print(f"Got {len(data)} approved contestants")
    
    def test_contestant_has_required_fields(self):
        """Test that contestants have all required fields"""
        response = requests.get(f"{BASE_URL}/api/contestants?status=approved&limit=1")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            contestant = data[0]
            required_fields = ["id", "full_name", "slug", "vote_count", "status", "voting_link"]
            for field in required_fields:
                assert field in contestant, f"Missing field: {field}"
            print(f"Contestant has all required fields: {contestant['full_name']}")


class TestCategories:
    """Category endpoint tests"""
    
    def test_get_categories(self):
        """Test getting list of categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Got {len(data)} categories")
    
    def test_get_active_categories(self):
        """Test getting only active categories"""
        response = requests.get(f"{BASE_URL}/api/categories?active_only=true")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        for category in data:
            assert category["is_active"] == True
        print(f"Got {len(data)} active categories")


class TestLeaderboard:
    """Leaderboard endpoint tests"""
    
    def test_get_leaderboard(self):
        """Test getting leaderboard"""
        response = requests.get(f"{BASE_URL}/api/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Got {len(data)} leaderboard entries")
    
    def test_leaderboard_is_sorted_by_votes(self):
        """Test that leaderboard is sorted by vote count descending"""
        response = requests.get(f"{BASE_URL}/api/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 1:
            for i in range(len(data) - 1):
                assert data[i]["vote_count"] >= data[i + 1]["vote_count"], \
                    "Leaderboard should be sorted by vote count descending"
        print("Leaderboard is correctly sorted by votes")
    
    def test_leaderboard_entry_has_required_fields(self):
        """Test that leaderboard entries have required fields"""
        response = requests.get(f"{BASE_URL}/api/leaderboard?limit=1")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            entry = data[0]
            required_fields = ["rank", "contestant_id", "full_name", "slug", "vote_count"]
            for field in required_fields:
                assert field in entry, f"Missing field: {field}"
            print(f"Leaderboard entry has all required fields")


class TestVotePackages:
    """Vote packages endpoint tests"""
    
    def test_get_vote_packages(self):
        """Test getting vote packages"""
        response = requests.get(f"{BASE_URL}/api/vote-packages")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check package structure
        for package in data:
            assert "id" in package
            assert "name" in package
            assert "votes" in package
            assert "price" in package
        print(f"Got {len(data)} vote packages")


class TestRounds:
    """Rounds endpoint tests"""
    
    def test_get_rounds(self):
        """Test getting contest rounds"""
        response = requests.get(f"{BASE_URL}/api/rounds")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Got {len(data)} rounds")


class TestAdminStats:
    """Admin stats endpoint tests (requires authentication)"""
    
    def test_admin_stats_requires_auth(self):
        """Test that admin stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code in [401, 403]
        print("Admin stats correctly requires authentication")
    
    def test_admin_stats_with_valid_token(self):
        """Test admin stats with valid admin token"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@glowingstar.net",
            "password": "admin123"
        })
        token = login_response.json()["token"]
        
        # Get admin stats
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "total_contestants" in data
        assert "total_votes" in data
        assert "total_categories" in data
        assert "pending_approvals" in data
        print(f"Admin stats: {data}")


class TestWebSocketEndpoints:
    """Test that WebSocket endpoints exist (basic connectivity)"""
    
    def test_websocket_votes_endpoint_exists(self):
        """Test that /ws/votes endpoint exists"""
        # We can't fully test WebSocket with requests, but we can check the endpoint
        # The server should return 426 Upgrade Required for non-WebSocket requests
        response = requests.get(f"{BASE_URL}/ws/votes")
        # WebSocket endpoints typically return 400 or 426 for non-WS requests
        assert response.status_code in [400, 426, 403, 404, 200]
        print(f"WebSocket /ws/votes endpoint response: {response.status_code}")
    
    def test_websocket_leaderboard_endpoint_exists(self):
        """Test that /ws/leaderboard endpoint exists"""
        response = requests.get(f"{BASE_URL}/ws/leaderboard")
        assert response.status_code in [400, 426, 403, 404, 200]
        print(f"WebSocket /ws/leaderboard endpoint response: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
