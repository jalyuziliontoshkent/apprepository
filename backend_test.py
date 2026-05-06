#!/usr/bin/env python3
"""
CurtainOrderApp Backend API Testing - PostgreSQL Migration
Tests all backend endpoints after MongoDB to PostgreSQL migration

Usage:
  export BACKEND_URL=https://your-backend.onrender.com/api
  export TEST_ADMIN_EMAIL=admin@example.com
  export TEST_ADMIN_PASSWORD=yourpassword
  export TEST_DEALER_EMAIL=dealer@example.com
  export TEST_DEALER_PASSWORD=yourpassword
  export TEST_WORKER_EMAIL=worker@example.com
  export TEST_WORKER_PASSWORD=yourpassword
  python backend_test.py
"""

import requests
import json
import sys
import os
from io import BytesIO

# Backend URL from environment variable
BASE_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000/api").rstrip("/")

# Test credentials from environment variables
ADMIN_CREDS = {
    "email": os.environ.get("TEST_ADMIN_EMAIL", "admin@test.uz"),
    "password": os.environ.get("TEST_ADMIN_PASSWORD", "testpass123")
}
DEALER_CREDS = {
    "email": os.environ.get("TEST_DEALER_EMAIL", "dealer@test.uz"),
    "password": os.environ.get("TEST_DEALER_PASSWORD", "testpass123")
}
WORKER_CREDS = {
    "email": os.environ.get("TEST_WORKER_EMAIL", "worker@test.uz"),
    "password": os.environ.get("TEST_WORKER_PASSWORD", "testpass123")
}

class APITester:
    def __init__(self):
        self.admin_token = None
        self.dealer_token = None
        self.worker_token = None
        self.admin_user = None
        self.dealer_user = None
        self.worker_user = None
        self.test_results = []
        self.created_ids = {"dealers": [], "workers": [], "materials": [], "orders": []}
        
    def log_result(self, test_name, success, message="", details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = f"{status}: {test_name}"
        if message:
            result += f" - {message}"
        if details:
            result += f"\nDetails: {details}"
        print(result)
        self.test_results.append({"test": test_name, "success": success, "message": message, "details": details})
        
    def make_request(self, method, endpoint, data=None, token=None, files=None):
        """Make HTTP request with proper headers"""
        url = f"{BASE_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        if files:
            # Remove Content-Type for file uploads
            headers.pop("Content-Type", None)
            
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=30)
            elif method == "POST":
                if files:
                    response = requests.post(url, headers=headers, files=files, timeout=30)
                else:
                    response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=30)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
            
    def test_auth_login(self):
        """Test authentication login for all roles"""
        print("\n=== Testing Authentication ===")
        
        # Test admin login
        response = self.make_request("POST", "/auth/login", ADMIN_CREDS)
        if response and response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                self.admin_token = data["token"]
                self.admin_user = data["user"]
                self.log_result("Admin Login", True, f"Admin logged in: {data['user']['email']}")
            else:
                self.log_result("Admin Login", False, "Missing token or user in response")
        else:
            self.log_result("Admin Login", False, f"Status: {response.status_code if response else 'No response'}")
            
        # Test dealer login
        response = self.make_request("POST", "/auth/login", DEALER_CREDS)
        if response and response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                self.dealer_token = data["token"]
                self.dealer_user = data["user"]
                self.log_result("Dealer Login", True, f"Dealer logged in: {data['user']['email']}")
            else:
                self.log_result("Dealer Login", False, "Missing token or user in response")
        else:
            self.log_result("Dealer Login", False, f"Status: {response.status_code if response else 'No response'}")
            
        # Test worker login
        response = self.make_request("POST", "/auth/login", WORKER_CREDS)
        if response and response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                self.worker_token = data["token"]
                self.worker_user = data["user"]
                self.log_result("Worker Login", True, f"Worker logged in: {data['user']['email']}")
            else:
                self.log_result("Worker Login", False, "Missing token or user in response")
        else:
            self.log_result("Worker Login", False, f"Status: {response.status_code if response else 'No response'}")
            
        # Test invalid credentials
        response = self.make_request("POST", "/auth/login", {"email": "invalid@test.com", "password": "wrong"})
        if response and response.status_code == 401:
            self.log_result("Invalid Login", True, "Correctly rejected invalid credentials")
        else:
            self.log_result("Invalid Login", False, f"Expected 401, got {response.status_code if response else 'No response'}")
            
    def test_auth_me(self):
        """Test /auth/me endpoint"""
        if not self.admin_token:
            self.log_result("Auth Me", False, "No admin token available")
            return
            
        response = self.make_request("GET", "/auth/me", token=self.admin_token)
        if response and response.status_code == 200:
            data = response.json()
            if "user" in data and data["user"]["email"] == ADMIN_CREDS["email"]:
                self.log_result("Auth Me", True, "Successfully retrieved user info")
            else:
                self.log_result("Auth Me", False, "Invalid user data returned")
        else:
            self.log_result("Auth Me", False, f"Status: {response.status_code if response else 'No response'}")
            
    def test_auth_profile_update(self):
        """Test profile update"""
        if not self.admin_token:
            self.log_result("Profile Update", False, "No admin token available")
            return
            
        # Test password change
        update_data = {
            "current_password": ADMIN_CREDS["password"],
            "password": ADMIN_CREDS["password"]  # Same password to avoid breaking other tests
        }
        
        response = self.make_request("PUT", "/auth/profile", update_data, token=self.admin_token)
        if response and response.status_code == 200:
            data = response.json()
            if "user" in data and "token" in data:
                self.admin_token = data["token"]  # Update token
                self.log_result("Profile Update", True, "Successfully updated profile")
            else:
                self.log_result("Profile Update", False, "Missing user or token in response")
        else:
            self.log_result("Profile Update", False, f"Status: {response.status_code if response else 'No response'}")
            
    def test_dealers_crud(self):
        """Test dealers CRUD operations"""
        print("\n=== Testing Dealers CRUD ===")
        
        if not self.admin_token:
            self.log_result("Dealers CRUD", False, "No admin token available")
            return
            
        # Test create dealer
        dealer_data = {
            "name": "Test Dealer API",
            "email": "testdealer@api.test",
            "password": "test123",
            "phone": "+998901234567",
            "address": "Test Address",
            "credit_limit": 1000.0
        }
        
        response = self.make_request("POST", "/dealers", dealer_data, token=self.admin_token)
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and data["email"] == dealer_data["email"]:
                dealer_id = data["id"]
                self.created_ids["dealers"].append(dealer_id)
                self.log_result("Create Dealer", True, f"Created dealer with ID: {dealer_id}")
                
                # Test update dealer
                update_data = {"name": "Updated Dealer Name", "credit_limit": 2000.0}
                response = self.make_request("PUT", f"/dealers/{dealer_id}", update_data, token=self.admin_token)
                if response and response.status_code == 200:
                    updated_data = response.json()
                    if updated_data["name"] == update_data["name"]:
                        self.log_result("Update Dealer", True, "Successfully updated dealer")
                    else:
                        self.log_result("Update Dealer", False, "Dealer not properly updated")
                else:
                    self.log_result("Update Dealer", False, f"Status: {response.status_code if response else 'No response'}")
                    
            else:
                self.log_result("Create Dealer", False, "Invalid dealer data returned")
        else:
            self.log_result("Create Dealer", False, f"Status: {response.status_code if response else 'No response'}")
            
        # Test list dealers
        response = self.make_request("GET", "/dealers", token=self.admin_token)
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("List Dealers", True, f"Retrieved {len(data)} dealers")
            else:
                self.log_result("List Dealers", False, "Invalid response format")
        else:
            self.log_result("List Dealers", False, f"Status: {response.status_code if response else 'No response'}")
            
    def test_workers_crud(self):
        """Test workers CRUD operations"""
        print("\n=== Testing Workers CRUD ===")
        
        if not self.admin_token:
            self.log_result("Workers CRUD", False, "No admin token available")
            return
            
        # Test create worker
        worker_data = {
            "name": "Test Worker API",
            "email": "testworker@api.test",
            "password": "test123",
            "phone": "+998901234567",
            "specialty": "Test Installation"
        }
        
        response = self.make_request("POST", "/workers", worker_data, token=self.admin_token)
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and data["email"] == worker_data["email"]:
                worker_id = data["id"]
                self.created_ids["workers"].append(worker_id)
                self.log_result("Create Worker", True, f"Created worker with ID: {worker_id}")
            else:
                self.log_result("Create Worker", False, "Invalid worker data returned")
        else:
            self.log_result("Create Worker", False, f"Status: {response.status_code if response else 'No response'}")
            
        # Test list workers
        response = self.make_request("GET", "/workers", token=self.admin_token)
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("List Workers", True, f"Retrieved {len(data)} workers")
            else:
                self.log_result("List Workers", False, "Invalid response format")
        else:
            self.log_result("List Workers", False, f"Status: {response.status_code if response else 'No response'}")
            
    def test_materials_crud(self):
        """Test materials CRUD operations"""
        print("\n=== Testing Materials CRUD ===")
        
        if not self.admin_token:
            self.log_result("Materials CRUD", False, "No admin token available")
            return
            
        # Test create material
        material_data = {
            "name": "Test Material API",
            "category": "Test Category",
            "price_per_sqm": 15.0,
            "stock_quantity": 100.0,
            "unit": "kv.m",
            "description": "Test material description",
            "image_url": "/api/uploads/test.jpg"
        }
        
        response = self.make_request("POST", "/materials", material_data, token=self.admin_token)
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and data["name"] == material_data["name"]:
                material_id = data["id"]
                self.created_ids["materials"].append(material_id)
                self.log_result("Create Material", True, f"Created material with ID: {material_id}")
                
                # Test update material
                update_data = {"name": "Updated Material Name", "price_per_sqm": 20.0}
                response = self.make_request("PUT", f"/materials/{material_id}", update_data, token=self.admin_token)
                if response and response.status_code == 200:
                    updated_data = response.json()
                    if updated_data["name"] == update_data["name"]:
                        self.log_result("Update Material", True, "Successfully updated material")
                    else:
                        self.log_result("Update Material", False, "Material not properly updated")
                else:
                    self.log_result("Update Material", False, f"Status: {response.status_code if response else 'No response'}")
                    
            else:
                self.log_result("Create Material", False, "Invalid material data returned")
        else:
            self.log_result("Create Material", False, f"Status: {response.status_code if response else 'No response'}")
            
        # Test list materials (any authenticated user can access)
        response = self.make_request("GET", "/materials", token=self.dealer_token)
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("List Materials", True, f"Retrieved {len(data)} materials")
            else:
                self.log_result("List Materials", False, "Invalid response format")
        else:
            self.log_result("List Materials", False, f"Status: {response.status_code if response else 'No response'}")
            
    def test_orders_crud(self):
        """Test orders CRUD operations"""
        print("\n=== Testing Orders CRUD ===")
        
        if not self.dealer_token:
            self.log_result("Orders CRUD", False, "No dealer token available")
            return
            
        # Get materials first to create order
        response = self.make_request("GET", "/materials", token=self.dealer_token)
        if not response or response.status_code != 200:
            self.log_result("Orders CRUD", False, "Cannot get materials for order creation")
            return
            
        materials = response.json()
        if not materials:
            self.log_result("Orders CRUD", False, "No materials available for order creation")
            return
            
        material = materials[0]
        
        # Test create order
        order_data = {
            "items": [
                {
                    "material_id": material["id"],
                    "material_name": material["name"],
                    "width": 2.0,
                    "height": 1.5,
                    "quantity": 1,
                    "price_per_sqm": material["price_per_sqm"],
                    "notes": "Test order item"
                }
            ],
            "notes": "Test order from API"
        }
        
        response = self.make_request("POST", "/orders", order_data, token=self.dealer_token)
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and "order_code" in data:
                order_id = data["id"]
                self.created_ids["orders"].append(order_id)
                self.log_result("Create Order", True, f"Created order with ID: {order_id}, Code: {data['order_code']}")
                
                # Test get single order
                response = self.make_request("GET", f"/orders/{order_id}", token=self.dealer_token)
                if response and response.status_code == 200:
                    order_data = response.json()
                    if order_data["id"] == order_id:
                        self.log_result("Get Order", True, "Successfully retrieved order")
                    else:
                        self.log_result("Get Order", False, "Order ID mismatch")
                else:
                    self.log_result("Get Order", False, f"Status: {response.status_code if response else 'No response'}")
                    
                # Test update order status (admin only)
                if self.admin_token:
                    status_data = {"status": "tasdiqlangan", "rejection_reason": ""}
                    response = self.make_request("PUT", f"/orders/{order_id}/status", status_data, token=self.admin_token)
                    if response and response.status_code == 200:
                        updated_order = response.json()
                        if updated_order["status"] == "tasdiqlangan":
                            self.log_result("Update Order Status", True, "Successfully updated order status")
                        else:
                            self.log_result("Update Order Status", False, "Status not properly updated")
                    else:
                        self.log_result("Update Order Status", False, f"Status: {response.status_code if response else 'No response'}")
                        
            else:
                self.log_result("Create Order", False, "Invalid order data returned")
        else:
            self.log_result("Create Order", False, f"Status: {response.status_code if response else 'No response'}")
            
        # Test list orders
        response = self.make_request("GET", "/orders", token=self.dealer_token)
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("List Orders", True, f"Retrieved {len(data)} orders")
            else:
                self.log_result("List Orders", False, "Invalid response format")
        else:
            self.log_result("List Orders", False, f"Status: {response.status_code if response else 'No response'}")
            
    def test_worker_assignment(self):
        """Test worker assignment to order items"""
        print("\n=== Testing Worker Assignment ===")
        
        if not self.admin_token or not self.created_ids["orders"] or not self.created_ids["workers"]:
            self.log_result("Worker Assignment", False, "Missing required data (admin token, orders, or workers)")
            return
            
        order_id = self.created_ids["orders"][0]
        worker_id = self.created_ids["workers"][0]
        
        # Test assign worker to order item
        assign_data = {"worker_id": worker_id}
        response = self.make_request("PUT", f"/orders/{order_id}/items/0/assign", assign_data, token=self.admin_token)
        if response and response.status_code == 200:
            data = response.json()
            if "items" in data and len(data["items"]) > 0:
                item = data["items"][0]
                if item.get("assigned_worker_id") == worker_id:
                    self.log_result("Assign Worker", True, f"Successfully assigned worker {worker_id} to order item")
                else:
                    self.log_result("Assign Worker", False, "Worker not properly assigned")
            else:
                self.log_result("Assign Worker", False, "Invalid order items data")
        else:
            self.log_result("Assign Worker", False, f"Status: {response.status_code if response else 'No response'}")
            
    def test_worker_tasks(self):
        """Test worker tasks endpoints"""
        print("\n=== Testing Worker Tasks ===")
        
        if not self.worker_token:
            self.log_result("Worker Tasks", False, "No worker token available")
            return
            
        # Test get worker tasks
        response = self.make_request("GET", "/worker/tasks", token=self.worker_token)
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Get Worker Tasks", True, f"Retrieved {len(data)} tasks")
                
                # If there are tasks, test completing one
                if data and self.created_ids["orders"]:
                    order_id = self.created_ids["orders"][0]
                    # Test complete task
                    response = self.make_request("PUT", f"/worker/tasks/{order_id}/0/complete", token=self.worker_token)
                    if response and response.status_code == 200:
                        self.log_result("Complete Worker Task", True, "Successfully completed task")
                    else:
                        self.log_result("Complete Worker Task", False, f"Status: {response.status_code if response else 'No response'}")
                        
            else:
                self.log_result("Get Worker Tasks", False, "Invalid response format")
        else:
            self.log_result("Get Worker Tasks", False, f"Status: {response.status_code if response else 'No response'}")
            
    def test_delivery_management(self):
        """Test delivery management endpoints"""
        print("\n=== Testing Delivery Management ===")
        
        if not self.admin_token or not self.created_ids["orders"]:
            self.log_result("Delivery Management", False, "Missing admin token or orders")
            return
            
        order_id = self.created_ids["orders"][0]
        
        # Test assign delivery
        delivery_data = {
            "driver_name": "Test Driver",
            "driver_phone": "+998901234567",
            "plate_number": "01A123BC"
        }
        
        response = self.make_request("PUT", f"/orders/{order_id}/delivery", delivery_data, token=self.admin_token)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("status") == "yetkazilmoqda" and "delivery_info" in data:
                self.log_result("Assign Delivery", True, "Successfully assigned delivery")
                
                # Test confirm delivery
                response = self.make_request("PUT", f"/orders/{order_id}/confirm-delivery", token=self.admin_token)
                if response and response.status_code == 200:
                    confirmed_data = response.json()
                    if confirmed_data.get("status") == "yetkazildi":
                        self.log_result("Confirm Delivery", True, "Successfully confirmed delivery")
                    else:
                        self.log_result("Confirm Delivery", False, "Status not properly updated")
                else:
                    self.log_result("Confirm Delivery", False, f"Status: {response.status_code if response else 'No response'}")
                    
            else:
                self.log_result("Assign Delivery", False, "Delivery not properly assigned")
        else:
            self.log_result("Assign Delivery", False, f"Status: {response.status_code if response else 'No response'}")
            
    def test_chat_messages(self):
        """Test chat and messaging endpoints"""
        print("\n=== Testing Chat/Messages ===")
        
        if not self.admin_token or not self.dealer_token:
            self.log_result("Chat Messages", False, "Missing admin or dealer token")
            return
            
        # Test send message (dealer to admin)
        message_data = {
            "receiver_id": self.admin_user["id"],
            "text": "Test message from API testing"
        }
        
        response = self.make_request("POST", "/messages", message_data, token=self.dealer_token)
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and data["text"] == message_data["text"]:
                self.log_result("Send Message", True, f"Successfully sent message with ID: {data['id']}")
                
                # Test get messages
                response = self.make_request("GET", f"/messages/{self.dealer_user['id']}", token=self.admin_token)
                if response and response.status_code == 200:
                    messages = response.json()
                    if isinstance(messages, list):
                        self.log_result("Get Messages", True, f"Retrieved {len(messages)} messages")
                    else:
                        self.log_result("Get Messages", False, "Invalid response format")
                else:
                    self.log_result("Get Messages", False, f"Status: {response.status_code if response else 'No response'}")
                    
            else:
                self.log_result("Send Message", False, "Invalid message data returned")
        else:
            self.log_result("Send Message", False, f"Status: {response.status_code if response else 'No response'}")
            
        # Test get chat partners
        response = self.make_request("GET", "/chat/partners", token=self.admin_token)
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Get Chat Partners", True, f"Retrieved {len(data)} chat partners")
            else:
                self.log_result("Get Chat Partners", False, "Invalid response format")
        else:
            self.log_result("Get Chat Partners", False, f"Status: {response.status_code if response else 'No response'}")
            
    def test_statistics(self):
        """Test statistics endpoint"""
        print("\n=== Testing Statistics ===")
        
        if not self.admin_token:
            self.log_result("Statistics", False, "No admin token available")
            return
            
        response = self.make_request("GET", "/statistics", token=self.admin_token)
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ["total_orders", "total_dealers", "total_workers", "total_materials", "total_revenue"]
            
            if all(field in data for field in required_fields):
                self.log_result("Statistics", True, f"Retrieved statistics: {data}")
            else:
                missing = [f for f in required_fields if f not in data]
                self.log_result("Statistics", False, f"Missing fields: {missing}")
        else:
            self.log_result("Statistics", False, f"Status: {response.status_code if response else 'No response'}")
            
    def test_image_upload(self):
        """Test image upload endpoint"""
        print("\n=== Testing Image Upload ===")
        
        if not self.admin_token:
            self.log_result("Image Upload", False, "No admin token available")
            return
            
        # Create a simple test image file
        test_image_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'file': ('test.png', BytesIO(test_image_content), 'image/png')}
        
        response = self.make_request("POST", "/upload-image", token=self.admin_token, files=files)
        if response and response.status_code == 200:
            data = response.json()
            if "image_url" in data and data["image_url"].startswith("/api/uploads/"):
                self.log_result("Image Upload", True, f"Successfully uploaded image: {data['image_url']}")
            else:
                self.log_result("Image Upload", False, "Invalid image URL returned")
        else:
            self.log_result("Image Upload", False, f"Status: {response.status_code if response else 'No response'}")
            
        # Test non-admin access (should fail)
        response = self.make_request("POST", "/upload-image", token=self.dealer_token, files=files)
        if response and response.status_code == 403:
            self.log_result("Image Upload Security", True, "Correctly rejected non-admin user")
        else:
            self.log_result("Image Upload Security", False, f"Expected 403, got {response.status_code if response else 'No response'}")
            
    def cleanup_test_data(self):
        """Clean up test data created during testing"""
        print("\n=== Cleaning Up Test Data ===")
        
        if not self.admin_token:
            return
            
        # Delete test materials
        for material_id in self.created_ids["materials"]:
            response = self.make_request("DELETE", f"/materials/{material_id}", token=self.admin_token)
            if response and response.status_code == 200:
                print(f"✅ Deleted test material {material_id}")
                
        # Delete test workers
        for worker_id in self.created_ids["workers"]:
            response = self.make_request("DELETE", f"/workers/{worker_id}", token=self.admin_token)
            if response and response.status_code == 200:
                print(f"✅ Deleted test worker {worker_id}")
                
        # Delete test dealers
        for dealer_id in self.created_ids["dealers"]:
            response = self.make_request("DELETE", f"/dealers/{dealer_id}", token=self.admin_token)
            if response and response.status_code == 200:
                print(f"✅ Deleted test dealer {dealer_id}")
                
    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting CurtainOrderApp Backend API Tests (PostgreSQL Migration)")
        print(f"Backend URL: {BASE_URL}")
        print("=" * 80)
        
        # Authentication tests
        self.test_auth_login()
        self.test_auth_me()
        self.test_auth_profile_update()
        
        # CRUD tests
        self.test_dealers_crud()
        self.test_workers_crud()
        self.test_materials_crud()
        self.test_orders_crud()
        
        # Worker management tests
        self.test_worker_assignment()
        self.test_worker_tasks()
        
        # Delivery tests
        self.test_delivery_management()
        
        # Communication tests
        self.test_chat_messages()
        
        # Statistics tests
        self.test_statistics()
        
        # File upload tests
        self.test_image_upload()
        
        # Cleanup
        self.cleanup_test_data()
        
        # Summary
        print("\n" + "=" * 80)
        print("🏁 TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for r in self.test_results if r["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for r in self.test_results:
                if not r["success"]:
                    print(f"  - {r['test']}: {r['message']}")
                    
        return passed == total

if __name__ == "__main__":
    tester = APITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)