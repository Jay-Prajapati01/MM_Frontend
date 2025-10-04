#!/usr/bin/env python3
"""
Backend API Testing for Society Management System
Tests all CRUD endpoints with Supabase integration
"""

import requests
import json
import sys
from datetime import datetime, timedelta
import uuid

# Configuration
BASE_URL = "http://localhost:8001"
API_BASE = f"{BASE_URL}/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_test_header(test_name):
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BLUE}{Colors.BOLD}Testing: {test_name}{Colors.ENDC}")
    print(f"{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.ENDC}")

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.ENDC}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.ENDC}")

def make_request(method, endpoint, data=None, expected_status=200):
    """Make HTTP request and handle response"""
    url = f"{API_BASE}{endpoint}"
    headers = {'Content-Type': 'application/json'}
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url, headers=headers, timeout=30)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, headers=headers, timeout=30)
        elif method.upper() == 'PUT':
            response = requests.put(url, json=data, headers=headers, timeout=30)
        elif method.upper() == 'DELETE':
            response = requests.delete(url, headers=headers, timeout=30)
        else:
            print_error(f"Unsupported method: {method}")
            return None
            
        print_info(f"{method.upper()} {endpoint} -> Status: {response.status_code}")
        
        if response.status_code == expected_status:
            print_success(f"Request successful (Status: {response.status_code})")
            try:
                return response.json()
            except:
                return response.text
        else:
            print_error(f"Unexpected status code: {response.status_code} (Expected: {expected_status})")
            try:
                error_detail = response.json()
                print_error(f"Error details: {json.dumps(error_detail, indent=2)}")
            except:
                print_error(f"Error response: {response.text}")
            return None
            
    except requests.exceptions.Timeout:
        print_error(f"Request timeout for {method.upper()} {endpoint}")
        return None
    except requests.exceptions.ConnectionError:
        print_error(f"Connection error for {method.upper()} {endpoint}")
        return None
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return None

def test_health_endpoints():
    """Test health check endpoints"""
    print_test_header("Health Check Endpoints")
    
    # Test root endpoint
    print_info("Testing GET /api/")
    result = make_request('GET', '/')
    if result:
        print_success(f"Root endpoint response: {result}")
    
    # Test health endpoint
    print_info("Testing GET /api/health")
    result = make_request('GET', '/health')
    if result:
        print_success(f"Health endpoint response: {result}")
        if isinstance(result, dict) and result.get('status') == 'healthy':
            print_success("Database connection is healthy")
        else:
            print_warning("Database connection might have issues")

def test_houses_api():
    """Test Houses CRUD operations"""
    print_test_header("Houses API")
    
    # Test GET /api/houses
    print_info("Testing GET /api/houses")
    houses_list = make_request('GET', '/houses')
    if houses_list:
        print_success(f"Retrieved houses list with {len(houses_list.get('list', []))} houses")
        if 'summary' in houses_list:
            print_info(f"Houses summary: {houses_list['summary']}")
    
    # Test POST /api/houses - Create a new house
    print_info("Testing POST /api/houses")
    house_data = {
        "houseNo": "A-101",
        "block": "A",
        "floor": "1",
        "status": "vacant",
        "notes": "Test house for API testing",
        "ownerName": "John Smith"
    }
    
    created_house = make_request('POST', '/houses', house_data, 200)
    house_id = None
    if created_house:
        house_id = created_house.get('id')
        print_success(f"Created house with ID: {house_id}")
        
        # Test GET /api/houses/{id}
        if house_id:
            print_info(f"Testing GET /api/houses/{house_id}")
            house_detail = make_request('GET', f'/houses/{house_id}')
            if house_detail:
                print_success(f"Retrieved house details: {house_detail.get('houseNo')}")
                
                # Test PUT /api/houses/{id}
                print_info(f"Testing PUT /api/houses/{house_id}")
                update_data = {
                    "status": "occupied",
                    "ownerName": "John Smith Updated",
                    "notes": "Updated test house"
                }
                updated_house = make_request('PUT', f'/houses/{house_id}', update_data)
                if updated_house:
                    print_success(f"Updated house status to: {updated_house.get('status')}")
                
                # Test DELETE /api/houses/{id}
                print_info(f"Testing DELETE /api/houses/{house_id}")
                delete_result = make_request('DELETE', f'/houses/{house_id}')
                if delete_result:
                    print_success("House deleted successfully")

def test_members_api():
    """Test Members API operations"""
    print_test_header("Members API")
    
    # Test GET /api/members
    print_info("Testing GET /api/members")
    members_list = make_request('GET', '/members')
    if members_list:
        print_success(f"Retrieved members list with {len(members_list)} members")
    
    # Test POST /api/members
    print_info("Testing POST /api/members")
    member_data = {
        "name": "Alice Johnson",
        "house": "B-202",
        "role": "Owner",
        "relationship": "Owner",
        "phone": "+1234567890",
        "email": "alice.johnson@email.com",
        "status": "active"
    }
    
    created_member = make_request('POST', '/members', member_data, 200)
    if created_member:
        member_id = created_member.get('id')
        print_success(f"Created member with ID: {member_id}")

def test_vehicles_api():
    """Test Vehicles API operations"""
    print_test_header("Vehicles API")
    
    # Test GET /api/vehicles
    print_info("Testing GET /api/vehicles")
    vehicles_list = make_request('GET', '/vehicles')
    if vehicles_list:
        print_success(f"Retrieved vehicles list with {len(vehicles_list)} vehicles")
    
    # Test POST /api/vehicles
    print_info("Testing POST /api/vehicles")
    vehicle_data = {
        "number": "MH12AB1234",
        "type": "Four Wheeler",
        "brandModel": "Honda City",
        "color": "White",
        "ownerName": "Bob Wilson",
        "house": "C-303",
        "registrationDate": "2023-01-15",
        "status": "active"
    }
    
    created_vehicle = make_request('POST', '/vehicles', vehicle_data, 200)
    if created_vehicle:
        vehicle_id = created_vehicle.get('id')
        print_success(f"Created vehicle with ID: {vehicle_id}")

def test_payments_api():
    """Test Payments API operations"""
    print_test_header("Payments API")
    
    # Test GET /api/payments
    print_info("Testing GET /api/payments")
    payments_list = make_request('GET', '/payments')
    if payments_list:
        if isinstance(payments_list, dict) and 'list' in payments_list:
            print_success(f"Retrieved payments list with {len(payments_list['list'])} payments")
            if 'summary' in payments_list:
                print_info(f"Payments summary: {payments_list['summary']}")
        else:
            print_success(f"Retrieved payments list with {len(payments_list)} payments")
    
    # Test POST /api/payments
    print_info("Testing POST /api/payments")
    due_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
    payment_data = {
        "house": "D-404",
        "owner": "Carol Davis",
        "amount": 5000.0,
        "month": "January 2024",
        "monthRange": "January 2024",
        "fromMonth": "January 2024",
        "toMonth": "January 2024",
        "monthsCount": 1,
        "latePayment": False,
        "dueDate": due_date,
        "status": "pending",
        "method": "Online",
        "remarks": "Monthly maintenance payment"
    }
    
    created_payment = make_request('POST', '/payments', payment_data, 200)
    if created_payment:
        payment_id = created_payment.get('id')
        print_success(f"Created payment with ID: {payment_id}")

def test_expenditures_api():
    """Test Expenditures API operations"""
    print_test_header("Expenditures API")
    
    # Test GET /api/expenditures
    print_info("Testing GET /api/expenditures")
    expenditures_list = make_request('GET', '/expenditures')
    if expenditures_list:
        if isinstance(expenditures_list, dict) and 'list' in expenditures_list:
            print_success(f"Retrieved expenditures list with {len(expenditures_list['list'])} expenditures")
            if 'summary' in expenditures_list:
                print_info(f"Expenditures summary: {expenditures_list['summary']}")
        else:
            print_success(f"Retrieved expenditures list with {len(expenditures_list)} expenditures")
    
    # Test POST /api/expenditures
    print_info("Testing POST /api/expenditures")
    expenditure_data = {
        "title": "Security Guard Salary",
        "category": "Security",
        "amount": 15000.0,
        "paymentMode": "Bank",
        "date": datetime.now().strftime('%Y-%m-%d'),
        "description": "Monthly salary for security guard - January 2024"
    }
    
    created_expenditure = make_request('POST', '/expenditures', expenditure_data, 200)
    if created_expenditure:
        expenditure_id = created_expenditure.get('id')
        print_success(f"Created expenditure with ID: {expenditure_id}")

def run_all_tests():
    """Run all backend API tests"""
    print(f"{Colors.BOLD}{Colors.BLUE}")
    print("=" * 80)
    print("SOCIETY MANAGEMENT SYSTEM - BACKEND API TESTING")
    print("=" * 80)
    print(f"{Colors.ENDC}")
    
    print_info(f"Testing backend at: {BASE_URL}")
    print_info(f"API base URL: {API_BASE}")
    
    # Run all tests
    test_health_endpoints()
    test_houses_api()
    test_members_api()
    test_vehicles_api()
    test_payments_api()
    test_expenditures_api()
    
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("=" * 80)
    print("BACKEND API TESTING COMPLETED")
    print("=" * 80)
    print(f"{Colors.ENDC}")

if __name__ == "__main__":
    run_all_tests()