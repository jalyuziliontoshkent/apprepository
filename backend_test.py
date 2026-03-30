#!/usr/bin/env python3
"""
Backend API Testing for CurtainOrderApp
Focus on newly added Image Upload endpoint and existing APIs
"""

import requests
import json
import os
import tempfile
from pathlib import Path
import time

# Backend URL from frontend environment
BACKEND_URL = "https://dealer-dashboard-21.preview.emergentagent.com/api"

# Test credentials from /app/memory/test_credentials.md
TEST_CREDENTIALS = {
    "admin": {"email": "admin@curtain.uz", "password": "admin123"},
    "dealer": {"email": "dealer@test.uz", "password": "dealer123"},
    "worker": {"email": "worker@test.uz", "password": "worker123"}
}

class BackendTester:
    def __init__(self):
        self.tokens = {}
        self.test_results = []
        self.session = requests.Session()
        
    def log_result(self, test_name, success, message="", details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details or {}
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        
    def test_auth_login(self):
        """Test authentication for all 3 roles"""
        print("\n=== Testing Authentication ===")
        
        for role, creds in TEST_CREDENTIALS.items():
            try:
                response = self.session.post(
                    f"{BACKEND_URL}/auth/login",
                    json=creds,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if "token" in data and "user" in data:
                        self.tokens[role] = data["token"]
                        user_role = data["user"].get("role")
                        if user_role == role:
                            self.log_result(f"Auth Login ({role})", True, f"Login successful, role verified: {user_role}")
                        else:
                            self.log_result(f"Auth Login ({role})", False, f"Role mismatch: expected {role}, got {user_role}")
                    else:
                        self.log_result(f"Auth Login ({role})", False, "Missing token or user in response")
                else:
                    self.log_result(f"Auth Login ({role})", False, f"HTTP {response.status_code}: {response.text}")
                    
            except Exception as e:
                self.log_result(f"Auth Login ({role})", False, f"Exception: {str(e)}")
    
    def test_image_upload_api(self):
        """Test the new Image Upload API - Priority endpoint"""
        print("\n=== Testing Image Upload API (NEW) ===")
        
        if "admin" not in self.tokens:
            self.log_result("Image Upload API", False, "Admin token not available")
            return
            
        # Test 1: Upload valid image file
        try:
            # Create a small test image file
            test_image_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00IEND\xaeB`\x82'
            
            files = {
                'file': ('test_image.png', test_image_content, 'image/png')
            }
            headers = {
                'Authorization': f'Bearer {self.tokens["admin"]}'
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/upload-image",
                files=files,
                headers=headers,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if "image_url" in data and data["image_url"].startswith("/api/uploads/"):
                    image_url = data["image_url"]
                    self.log_result("Image Upload (Valid)", True, f"Image uploaded successfully: {image_url}")
                    
                    # Test 2: Verify uploaded image is accessible
                    image_response = self.session.get(f"{BACKEND_URL.replace('/api', '')}{image_url}", timeout=10)
                    if image_response.status_code == 200:
                        self.log_result("Image Access", True, "Uploaded image is accessible via URL")
                    else:
                        self.log_result("Image Access", False, f"Cannot access uploaded image: HTTP {image_response.status_code}")
                else:
                    self.log_result("Image Upload (Valid)", False, f"Invalid response format: {data}")
            else:
                self.log_result("Image Upload (Valid)", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Image Upload (Valid)", False, f"Exception: {str(e)}")
        
        # Test 3: Test non-admin access (should fail with 403)
        if "dealer" in self.tokens:
            try:
                files = {
                    'file': ('test_image.png', test_image_content, 'image/png')
                }
                headers = {
                    'Authorization': f'Bearer {self.tokens["dealer"]}'
                }
                
                response = self.session.post(
                    f"{BACKEND_URL}/upload-image",
                    files=files,
                    headers=headers,
                    timeout=10
                )
                
                if response.status_code == 403:
                    self.log_result("Image Upload (Non-admin)", True, "Correctly rejected non-admin user with 403")
                else:
                    self.log_result("Image Upload (Non-admin)", False, f"Expected 403, got HTTP {response.status_code}")
                    
            except Exception as e:
                self.log_result("Image Upload (Non-admin)", False, f"Exception: {str(e)}")
        
        # Test 4: Test non-image file rejection
        try:
            files = {
                'file': ('test.txt', b'This is not an image', 'text/plain')
            }
            headers = {
                'Authorization': f'Bearer {self.tokens["admin"]}'
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/upload-image",
                files=files,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 400:
                self.log_result("Image Upload (Non-image)", True, "Correctly rejected non-image file with 400")
            else:
                self.log_result("Image Upload (Non-image)", False, f"Expected 400, got HTTP {response.status_code}")
                
        except Exception as e:
            self.log_result("Image Upload (Non-image)", False, f"Exception: {str(e)}")
    
    def test_materials_api(self):
        """Test Materials API to verify it still works with image_url"""
        print("\n=== Testing Materials API ===")
        
        if "admin" not in self.tokens:
            self.log_result("Materials API", False, "Admin token not available")
            return
            
        headers = {'Authorization': f'Bearer {self.tokens["admin"]}'}
        
        # Test GET materials
        try:
            response = self.session.get(f"{BACKEND_URL}/materials", headers=headers, timeout=10)
            if response.status_code == 200:
                materials = response.json()
                if isinstance(materials, list):
                    self.log_result("Materials GET", True, f"Retrieved {len(materials)} materials")
                else:
                    self.log_result("Materials GET", False, "Response is not a list")
            else:
                self.log_result("Materials GET", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Materials GET", False, f"Exception: {str(e)}")
        
        # Test POST materials with image_url
        try:
            material_data = {
                "name": "Test Material",
                "category": "Test Category",
                "price_per_sqm": 15.0,
                "stock_quantity": 100.0,
                "unit": "kv.m",
                "description": "Test material with image",
                "image_url": "/api/uploads/test-image.jpg"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/materials",
                json=material_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data.get("image_url") == material_data["image_url"]:
                    self.log_result("Materials POST", True, f"Material created with image_url: {data['id']}")
                else:
                    self.log_result("Materials POST", False, f"Invalid response: {data}")
            else:
                self.log_result("Materials POST", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Materials POST", False, f"Exception: {str(e)}")
    
    def test_workers_crud(self):
        """Test Workers CRUD API"""
        print("\n=== Testing Workers CRUD API ===")
        
        if "admin" not in self.tokens:
            self.log_result("Workers CRUD", False, "Admin token not available")
            return
            
        headers = {'Authorization': f'Bearer {self.tokens["admin"]}'}
        
        # Test GET workers
        try:
            response = self.session.get(f"{BACKEND_URL}/workers", headers=headers, timeout=10)
            if response.status_code == 200:
                workers = response.json()
                if isinstance(workers, list):
                    self.log_result("Workers GET", True, f"Retrieved {len(workers)} workers")
                else:
                    self.log_result("Workers GET", False, "Response is not a list")
            else:
                self.log_result("Workers GET", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Workers GET", False, f"Exception: {str(e)}")
        
        # Test POST worker
        worker_id = None
        try:
            worker_data = {
                "name": "Test Worker",
                "email": f"testworker{int(time.time())}@test.uz",
                "password": "test123",
                "phone": "+998901234567",
                "specialty": "Test Specialty"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/workers",
                json=worker_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data:
                    worker_id = data["id"]
                    self.log_result("Workers POST", True, f"Worker created: {worker_id}")
                else:
                    self.log_result("Workers POST", False, f"Invalid response: {data}")
            else:
                self.log_result("Workers POST", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Workers POST", False, f"Exception: {str(e)}")
        
        # Test DELETE worker
        if worker_id:
            try:
                response = self.session.delete(f"{BACKEND_URL}/workers/{worker_id}", headers=headers, timeout=10)
                if response.status_code == 200:
                    self.log_result("Workers DELETE", True, f"Worker deleted: {worker_id}")
                else:
                    self.log_result("Workers DELETE", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_result("Workers DELETE", False, f"Exception: {str(e)}")
    
    def test_worker_tasks_api(self):
        """Test Worker Tasks API"""
        print("\n=== Testing Worker Tasks API ===")
        
        if "worker" not in self.tokens:
            self.log_result("Worker Tasks", False, "Worker token not available")
            return
            
        headers = {'Authorization': f'Bearer {self.tokens["worker"]}'}
        
        try:
            response = self.session.get(f"{BACKEND_URL}/worker/tasks", headers=headers, timeout=10)
            if response.status_code == 200:
                tasks = response.json()
                if isinstance(tasks, list):
                    self.log_result("Worker Tasks GET", True, f"Retrieved {len(tasks)} tasks")
                else:
                    self.log_result("Worker Tasks GET", False, "Response is not a list")
            else:
                self.log_result("Worker Tasks GET", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Worker Tasks GET", False, f"Exception: {str(e)}")
    
    def test_admin_delivery_apis(self):
        """Test Admin Delivery related APIs"""
        print("\n=== Testing Admin Delivery APIs ===")
        
        if "admin" not in self.tokens:
            self.log_result("Admin Delivery APIs", False, "Admin token not available")
            return
            
        headers = {'Authorization': f'Bearer {self.tokens["admin"]}'}
        
        # First get orders to test with
        try:
            response = self.session.get(f"{BACKEND_URL}/orders", headers=headers, timeout=10)
            if response.status_code == 200:
                orders = response.json()
                if isinstance(orders, list) and len(orders) > 0:
                    test_order_id = orders[0].get("id")
                    if test_order_id:
                        self.log_result("Orders GET", True, f"Retrieved {len(orders)} orders for testing")
                        
                        # Test delivery assignment
                        try:
                            delivery_data = {
                                "driver_name": "Test Driver",
                                "driver_phone": "+998901234567",
                                "plate_number": "01A123BC"
                            }
                            
                            response = self.session.put(
                                f"{BACKEND_URL}/orders/{test_order_id}/delivery",
                                json=delivery_data,
                                headers=headers,
                                timeout=10
                            )
                            
                            if response.status_code == 200:
                                self.log_result("Delivery Assignment", True, "Delivery info assigned successfully")
                            else:
                                self.log_result("Delivery Assignment", False, f"HTTP {response.status_code}: {response.text}")
                        except Exception as e:
                            self.log_result("Delivery Assignment", False, f"Exception: {str(e)}")
                        
                        # Test delivery confirmation
                        try:
                            response = self.session.put(
                                f"{BACKEND_URL}/orders/{test_order_id}/confirm-delivery",
                                headers=headers,
                                timeout=10
                            )
                            
                            if response.status_code == 200:
                                self.log_result("Delivery Confirmation", True, "Delivery confirmed successfully")
                            else:
                                self.log_result("Delivery Confirmation", False, f"HTTP {response.status_code}: {response.text}")
                        except Exception as e:
                            self.log_result("Delivery Confirmation", False, f"Exception: {str(e)}")
                    else:
                        self.log_result("Orders GET", False, "No order ID found in response")
                else:
                    self.log_result("Orders GET", True, "No orders available for testing delivery APIs")
            else:
                self.log_result("Orders GET", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Orders GET", False, f"Exception: {str(e)}")
    
    def test_statistics_api(self):
        """Test Statistics API"""
        print("\n=== Testing Statistics API ===")
        
        if "admin" not in self.tokens:
            self.log_result("Statistics API", False, "Admin token not available")
            return
            
        headers = {'Authorization': f'Bearer {self.tokens["admin"]}'}
        
        try:
            response = self.session.get(f"{BACKEND_URL}/statistics", headers=headers, timeout=10)
            if response.status_code == 200:
                stats = response.json()
                required_fields = ["total_orders", "total_dealers", "total_workers", "total_materials", "total_revenue"]
                if all(field in stats for field in required_fields):
                    self.log_result("Statistics API", True, f"Statistics retrieved with all required fields")
                else:
                    missing = [f for f in required_fields if f not in stats]
                    self.log_result("Statistics API", False, f"Missing fields: {missing}")
            else:
                self.log_result("Statistics API", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Statistics API", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests for CurtainOrderApp")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Test in priority order based on test_result.md
        self.test_auth_login()
        self.test_image_upload_api()  # NEW - Priority
        self.test_materials_api()
        self.test_workers_crud()
        self.test_worker_tasks_api()
        self.test_admin_delivery_apis()
        self.test_statistics_api()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.test_results if r["success"])
        failed = len(self.test_results) - passed
        
        print(f"Total Tests: {len(self.test_results)}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        
        if failed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  ❌ {result['test']}: {result['message']}")
        
        print("\n" + "=" * 60)
        return failed == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)