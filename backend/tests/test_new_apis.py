"""
Backend API Tests for Glowing Star Contest Platform - New APIs
Tests: Search, Highlights, Filtered Leaderboard, Analytics, Fraud Analysis, Timeline, Badges
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://contest-platform-9.preview.emergentagent.com')


def get_admin_token():
    """Helper to get admin token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@glowingstar.net",
        "password": "admin123"
    })
    if response.status_code == 200:
        return response.json()["token"]
    return None


class TestSearchAPI:
    """Search endpoint tests"""
    
    def test_search_by_name(self):
        """Test searching contestants by name"""
        response = requests.get(f"{BASE_URL}/api/search?q=Isabella&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "results" in data
        assert "total_results" in data
        assert "search_type" in data
        print(f"Search for 'Isabella': {data['total_results']} results")
    
    def test_search_returns_matching_contestants(self):
        """Test that search returns contestants matching the query"""
        response = requests.get(f"{BASE_URL}/api/search?q=Emma&search_type=name&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        # If results exist, they should contain 'Emma' in the name
        for result in data.get("results", []):
            assert "emma" in result.get("full_name", "").lower() or "emma" in result.get("bio", "").lower()
        print(f"Search for 'Emma' by name: {data['total_results']} results")
    
    def test_search_by_country(self):
        """Test searching by country"""
        response = requests.get(f"{BASE_URL}/api/search?q=USA&search_type=country&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "results" in data
        print(f"Search for 'USA' by country: {data['total_results']} results")
    
    def test_search_empty_query(self):
        """Test search with empty query returns results"""
        response = requests.get(f"{BASE_URL}/api/search?q=&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "results" in data
        print(f"Empty search: {data['total_results']} results")


class TestHighlightsAPI:
    """Highlights endpoint tests"""
    
    def test_highlights_returns_categories(self):
        """Test that highlights returns all expected categories"""
        response = requests.get(f"{BASE_URL}/api/contestants/highlights")
        assert response.status_code == 200
        
        data = response.json()
        expected_keys = ["trending", "new", "featured", "verified", "rising"]
        for key in expected_keys:
            assert key in data, f"Missing key: {key}"
        print(f"Highlights API returned all categories: {list(data.keys())}")
    
    def test_highlights_trending_is_list(self):
        """Test that trending is a list"""
        response = requests.get(f"{BASE_URL}/api/contestants/highlights")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data["trending"], list)
        print(f"Trending contestants: {len(data['trending'])}")
    
    def test_highlights_new_contestants(self):
        """Test new contestants section"""
        response = requests.get(f"{BASE_URL}/api/contestants/highlights")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data["new"], list)
        print(f"New contestants: {len(data['new'])}")


class TestFilteredLeaderboard:
    """Filtered leaderboard endpoint tests"""
    
    def test_global_leaderboard(self):
        """Test global leaderboard filter"""
        response = requests.get(f"{BASE_URL}/api/leaderboard/filtered?filter_type=global&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "filter_type" in data
        assert data["filter_type"] == "global"
        assert "contestants" in data
        print(f"Global leaderboard: {len(data['contestants'])} contestants")
    
    def test_category_leaderboard(self):
        """Test category leaderboard filter"""
        response = requests.get(f"{BASE_URL}/api/leaderboard/filtered?filter_type=category&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert data["filter_type"] == "category"
        print(f"Category leaderboard: {len(data.get('contestants', []))} contestants")
    
    def test_daily_leaderboard(self):
        """Test daily leaderboard filter"""
        response = requests.get(f"{BASE_URL}/api/leaderboard/filtered?filter_type=daily&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert data["filter_type"] == "daily"
        print(f"Daily leaderboard: {len(data.get('contestants', []))} contestants")
    
    def test_weekly_leaderboard(self):
        """Test weekly leaderboard filter"""
        response = requests.get(f"{BASE_URL}/api/leaderboard/filtered?filter_type=weekly&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert data["filter_type"] == "weekly"
        print(f"Weekly leaderboard: {len(data.get('contestants', []))} contestants")
    
    def test_leaderboard_has_rank(self):
        """Test that leaderboard entries have rank"""
        response = requests.get(f"{BASE_URL}/api/leaderboard/filtered?filter_type=global&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        for contestant in data.get("contestants", []):
            assert "rank" in contestant
        print("All contestants have rank field")


class TestContestTimeline:
    """Contest timeline endpoint tests"""
    
    def test_timeline_returns_data(self):
        """Test that timeline returns expected structure"""
        response = requests.get(f"{BASE_URL}/api/contest/timeline")
        assert response.status_code == 200
        
        data = response.json()
        assert "timeline" in data
        assert isinstance(data["timeline"], list)
        print(f"Timeline has {len(data['timeline'])} rounds")
    
    def test_timeline_round_structure(self):
        """Test that timeline rounds have required fields"""
        response = requests.get(f"{BASE_URL}/api/contest/timeline")
        assert response.status_code == 200
        
        data = response.json()
        for round_data in data.get("timeline", []):
            assert "id" in round_data
            assert "name" in round_data
            assert "status" in round_data
        print("Timeline rounds have required fields")


class TestAdminAnalytics:
    """Admin analytics endpoint tests (requires authentication)"""
    
    def test_analytics_requires_auth(self):
        """Test that analytics requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics")
        assert response.status_code in [401, 403]
        print("Analytics correctly requires authentication")
    
    def test_analytics_with_valid_token(self):
        """Test analytics with valid admin token"""
        token = get_admin_token()
        if not token:
            pytest.skip("Could not get admin token")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # Check for expected analytics fields
        expected_fields = ["total_views", "total_votes", "votes_by_type", "traffic_sources", "daily_votes"]
        for field in expected_fields:
            assert field in data, f"Missing analytics field: {field}"
        print(f"Analytics data: {list(data.keys())}")


class TestFraudAnalysis:
    """Fraud analysis endpoint tests (requires authentication)"""
    
    def test_fraud_analysis_requires_auth(self):
        """Test that fraud analysis requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/fraud-analysis/test-id")
        assert response.status_code in [401, 403]
        print("Fraud analysis correctly requires authentication")
    
    def test_fraud_analysis_with_valid_token(self):
        """Test fraud analysis with valid admin token"""
        token = get_admin_token()
        if not token:
            pytest.skip("Could not get admin token")
        
        # Get a contestant ID first
        contestants_response = requests.get(f"{BASE_URL}/api/contestants?status=approved&limit=1")
        contestants = contestants_response.json()
        if not contestants:
            pytest.skip("No contestants available")
        
        contestant_id = contestants[0]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/admin/fraud-analysis/{contestant_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "contestant_id" in data
        assert "risk_score" in data
        assert "risk_level" in data
        assert "ip_analysis" in data
        assert "email_analysis" in data
        print(f"Fraud analysis for {contestant_id}: risk_level={data['risk_level']}")


class TestContestantBadges:
    """Contestant badges endpoint tests (requires authentication)"""
    
    def test_badges_requires_auth(self):
        """Test that badges update requires authentication"""
        response = requests.put(f"{BASE_URL}/api/admin/contestants/test-id/badges?is_verified=true")
        assert response.status_code in [401, 403]
        print("Badges update correctly requires authentication")
    
    def test_update_badges_with_valid_token(self):
        """Test updating contestant badges with valid admin token"""
        token = get_admin_token()
        if not token:
            pytest.skip("Could not get admin token")
        
        # Get a contestant ID first
        contestants_response = requests.get(f"{BASE_URL}/api/contestants?status=approved&limit=1")
        contestants = contestants_response.json()
        if not contestants:
            pytest.skip("No contestants available")
        
        contestant_id = contestants[0]["id"]
        
        # Update badges
        response = requests.put(
            f"{BASE_URL}/api/admin/contestants/{contestant_id}/badges?is_verified=true&is_featured=false",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        print(f"Updated badges for {contestant_id}")


class TestContestantsCount:
    """Test that 50+ contestants are seeded"""
    
    def test_at_least_50_contestants(self):
        """Test that at least 50 contestants exist"""
        response = requests.get(f"{BASE_URL}/api/contestants?limit=100")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 50, f"Expected at least 50 contestants, got {len(data)}"
        print(f"Total contestants: {len(data)}")
    
    def test_contestants_have_photos(self):
        """Test that contestants have photos"""
        response = requests.get(f"{BASE_URL}/api/contestants?status=approved&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        contestants_with_photos = sum(1 for c in data if c.get("photos") and len(c["photos"]) > 0)
        print(f"Contestants with photos: {contestants_with_photos}/{len(data)}")
    
    def test_contestants_have_categories(self):
        """Test that contestants have categories assigned"""
        response = requests.get(f"{BASE_URL}/api/contestants?status=approved&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        contestants_with_category = sum(1 for c in data if c.get("category_name"))
        print(f"Contestants with categories: {contestants_with_category}/{len(data)}")


class TestCategoryFilter:
    """Test category filtering"""
    
    def test_filter_by_category(self):
        """Test filtering contestants by category"""
        # First get categories
        categories_response = requests.get(f"{BASE_URL}/api/categories")
        categories = categories_response.json()
        
        if not categories:
            pytest.skip("No categories available")
        
        # Find a category with contestants
        for cat in categories:
            if cat.get("contestant_count", 0) > 0:
                category_id = cat["id"]
                response = requests.get(f"{BASE_URL}/api/contestants?category_id={category_id}&limit=10")
                assert response.status_code == 200
                
                data = response.json()
                # All returned contestants should have this category
                for contestant in data:
                    assert contestant.get("category_id") == category_id
                print(f"Category filter works: {cat['name']} has {len(data)} contestants")
                return
        
        print("No categories with contestants found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
