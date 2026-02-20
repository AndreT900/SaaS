import requests
import sys
import uuid

BASE_URL = "http://localhost:8000"

def get_superadmin_token():
    """Authenticate as superadmin via JWT endpoint."""
    r = requests.post(f"{BASE_URL}/auth/token", json={
        "username": "admin",
        "password": "la_mia_password_segreta_123"
    })
    if r.status_code != 200:
        print(f"Superadmin login failed: {r.status_code} {r.text}")
        sys.exit(1)
    return r.json()["access_token"]

def run_test():
    print("--- 1. Health Check ---")
    try:
        r = requests.get(f"{BASE_URL}/health")
        print(r.json())
        if r.status_code != 200:
            print("Health check failed")
            sys.exit(1)
    except Exception as e:
        print(f"Failed to connect: {e}")
        sys.exit(1)

    # JWT-based auth for superadmin
    token = get_superadmin_token()
    headers = {"Authorization": f"Bearer {token}"}

    random_id = str(uuid.uuid4())[:8]
    email = f"admin_{random_id}@testcompany.com"

    print("\n--- 2. Create Company (Superadmin via JWT) ---")
    payload = {
        "name": f"Test Company {random_id}",
        "email": email,
        "mode": "managed",
        "api_key": None
    }
    r = requests.post(f"{BASE_URL}/superadmin/companies", json=payload, headers=headers)
    print(f"Status: {r.status_code}")
    print(r.json())
    if r.status_code != 200:
        print("Create company failed")
        sys.exit(1)
    
    data = r.json()
    activation_link = data["activation_link"]
    print(f"Got link: {activation_link}")
    activation_token = activation_link.split("token=")[1]

    print("\n--- 3. Dashboard (Superadmin) ---")
    r = requests.get(f"{BASE_URL}/superadmin/dashboard", headers=headers)
    print(f"Status: {r.status_code}")
    print(r.json())

    print("\n--- 4. Check Token (Public) ---")
    r = requests.get(f"{BASE_URL}/auth/check-token/{activation_token}")
    print(f"Status: {r.status_code}")
    print(r.json())
    if r.status_code != 200:
        print("Check token failed")
        sys.exit(1)

    print("\n--- 5. Setup Company (Public) ---")
    setup_payload = {
        "token": activation_token,
        "password": "securepassword",
        "confirm_password": "securepassword"
    }
    r = requests.post(f"{BASE_URL}/auth/setup", json=setup_payload)
    print(f"Status: {r.status_code}")
    print(r.json())
    if r.status_code != 200:
        print("Setup failed")
        sys.exit(1)
    
    auth_data = r.json()
    print(f"Got JWT: {auth_data.get('access_token')}")

if __name__ == "__main__":
    run_test()
