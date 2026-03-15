import requests
import sys
import json
from datetime import datetime

class LuminaAPITester:
    def __init__(self, base_url="https://contest-hub-elite.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.contestant_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if success and response.content:
                try:
                    response_data = response.json()
                    details += f" | Response: {json.dumps(response_data, indent=2)[:200]}..."
                except:
                    details += f" | Response: {response.text[:100]}..."
            elif not success:
                details += f" | Expected: {expected_status}"
                try:
                    error_data = response.json()
                    details += f" | Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f" | Error: {response.text[:100]}"

            self.log_test(name, success, details)
            return success, response.json() if success and response.content else {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_seed_admin(self):
        """Test admin seeding"""
        return self.run_test("Seed Admin", "POST", "seed/admin", 200)

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@lumina.com", "password": "admin123"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            return True
        return False

    def test_contestant_registration(self):
        """Test contestant registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        success, response = self.run_test(
            "Contestant Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": f"test_contestant_{timestamp}@example.com",
                "full_name": f"Test Contestant {timestamp}",
                "password": "TestPass123!",
                "phone": "+1234567890"
            }
        )
        if success and 'token' in response:
            self.contestant_token = response['token']
            self.test_contestant_email = f"test_contestant_{timestamp}@example.com"
            return True
        return False

    def test_admin_stats(self):
        """Test admin stats endpoint"""
        if not self.admin_token:
            self.log_test("Admin Stats", False, "No admin token available")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        return self.run_test("Admin Stats", "GET", "admin/stats", 200, headers=headers)[0]

    def test_create_category(self):
        """Test category creation"""
        if not self.admin_token:
            self.log_test("Create Category", False, "No admin token available")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "Create Category",
            "POST",
            "categories",
            200,
            data={"name": "Test Category", "description": "Test category description", "is_active": True},
            headers=headers
        )
        if success and 'id' in response:
            self.test_category_id = response['id']
            return True
        return False

    def test_get_categories(self):
        """Test get categories"""
        return self.run_test("Get Categories", "GET", "categories", 200)[0]

    def test_create_round(self):
        """Test round creation"""
        if not self.admin_token:
            self.log_test("Create Round", False, "No admin token available")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "Create Round",
            "POST",
            "rounds",
            200,
            data={"name": "Test Round", "description": "Test round description", "max_contestants": 50, "is_active": False},
            headers=headers
        )
        if success and 'id' in response:
            self.test_round_id = response['id']
            return True
        return False

    def test_get_rounds(self):
        """Test get rounds"""
        return self.run_test("Get Rounds", "GET", "rounds", 200)[0]

    def test_get_contestants(self):
        """Test get contestants"""
        return self.run_test("Get Contestants", "GET", "contestants", 200)[0]

    def test_contestant_profile(self):
        """Test contestant profile access"""
        if not self.contestant_token:
            self.log_test("Contestant Profile", False, "No contestant token available")
            return False
        
        headers = {'Authorization': f'Bearer {self.contestant_token}'}
        return self.run_test("Get Contestant Profile", "GET", "contestants/me/profile", 200, headers=headers)[0]

    def test_update_contestant_profile(self):
        """Test contestant profile update"""
        if not self.contestant_token:
            self.log_test("Update Contestant Profile", False, "No contestant token available")
            return False
        
        headers = {'Authorization': f'Bearer {self.contestant_token}'}
        return self.run_test(
            "Update Contestant Profile",
            "PUT",
            "contestants/me/profile",
            200,
            data={
                "bio": "Updated test bio",
                "location": "Test City, Test Country",
                "age": 25,
                "social_instagram": "test_instagram"
            },
            headers=headers
        )[0]

    def test_approve_contestant(self):
        """Test contestant approval by admin"""
        if not self.admin_token:
            self.log_test("Approve Contestant", False, "No admin token available")
            return False
        
        # First get contestants to find our test contestant
        success, contestants = self.run_test("Get Contestants for Approval", "GET", "contestants?status=pending", 200)
        if not success or not contestants:
            self.log_test("Approve Contestant", False, "No pending contestants found")
            return False
        
        # Find our test contestant
        test_contestant = None
        for contestant in contestants:
            if hasattr(self, 'test_contestant_email') and contestant.get('email') == self.test_contestant_email:
                test_contestant = contestant
                break
        
        if not test_contestant:
            self.log_test("Approve Contestant", False, "Test contestant not found in pending list")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        return self.run_test(
            "Approve Contestant",
            "PUT",
            f"admin/contestants/{test_contestant['id']}/status?status=approved",
            200,
            headers=headers
        )[0]

    def test_voting_flow(self):
        """Test the complete voting flow"""
        # First get an approved contestant
        success, contestants = self.run_test("Get Approved Contestants", "GET", "contestants?status=approved", 200)
        if not success or not contestants:
            self.log_test("Voting Flow - Get Contestants", False, "No approved contestants found")
            return False
        
        contestant = contestants[0]
        test_email = f"voter_{datetime.now().strftime('%H%M%S')}@example.com"
        
        # Request OTP
        success, otp_response = self.run_test(
            "Request Voting OTP",
            "POST",
            "vote/request-otp",
            200,
            data={"email": test_email, "contestant_id": contestant['id']}
        )
        
        if not success:
            return False
        
        # Extract OTP from mocked response message
        otp = None
        message = otp_response.get('message', '')
        if '[DEV MODE: OTP is ' in message:
            otp = message.split('[DEV MODE: OTP is ')[1].split(']')[0]
        
        if not otp:
            self.log_test("Extract OTP", False, "Could not extract OTP from response")
            return False
        
        # Verify OTP and vote
        return self.run_test(
            "Verify OTP and Vote",
            "POST",
            "vote/verify",
            200,
            data={"email": test_email, "contestant_id": contestant['id'], "otp": otp}
        )[0]

    def test_leaderboard(self):
        """Test leaderboard endpoint"""
        return self.run_test("Get Leaderboard", "GET", "leaderboard", 200)[0]

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Lumina Contest Platform API Tests")
        print("=" * 60)
        
        # Basic connectivity
        self.test_health_check()
        
        # Admin setup and authentication
        self.test_seed_admin()
        self.test_admin_login()
        
        # Admin functionality
        if self.admin_token:
            self.test_admin_stats()
            self.test_create_category()
            self.test_create_round()
        
        # Public endpoints
        self.test_get_categories()
        self.test_get_rounds()
        self.test_get_contestants()
        
        # Contestant functionality
        self.test_contestant_registration()
        if self.contestant_token:
            self.test_contestant_profile()
            self.test_update_contestant_profile()
        
        # Admin contestant management
        if self.admin_token and self.contestant_token:
            self.test_approve_contestant()
        
        # Voting functionality
        self.test_voting_flow()
        
        # Leaderboard
        self.test_leaderboard()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = LuminaAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())