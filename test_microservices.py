import requests
import sys
import time

# Service URLs (assuming internal network or port mapping)
CHAT_URL = "http://localhost:8001"
CALENDAR_URL = "http://localhost:8004"
AI_URL = "http://localhost:8005"

def test_calendar():
    print("\n--- Testing Calendar Logic ---")
    date = "2025-10-10"
    company_id = "comp1"
    
    # Request 1, 2, 3 should be approved
    for i in range(1, 4):
        payload = {"user_id": f"user{i}", "company_id": company_id, "date": date, "type": "ferie"}
        r = requests.post(f"{CALENDAR_URL}/request", json=payload)
        print(f"User {i} request: {r.json()}")
        if r.json()["status"] != "approved":
            print(f"Error: Expected 'approved' for request {i}, got {r.json()['status']}")
            sys.exit(1)

    # 4th request should now be approved (escalation removed)
    payload = {"user_id": "user4", "company_id": company_id, "date": date, "type": "ferie"}
    r = requests.post(f"{CALENDAR_URL}/request", json=payload)
    print(f"User 4 request: {r.json()}")
    if r.json()["status"] != "approved":
        print(f"Error: Expected 'approved' for 4th request, got {r.json()['status']}")
        sys.exit(1)

def test_chat():
    print("\n--- Testing Chat Consensus ---")
    chat_id = "chat123"
    participants = ["u1", "u2", "u3"]
    requests.post(f"{CHAT_URL}/create-test-chat", params={"chat_id": chat_id}, json=participants)
    
    # User 1 requests close
    r = requests.post(f"{CHAT_URL}/close-request", json={"chat_id": chat_id, "user_id": "u1"})
    print(f"U1 close request: {r.json()}")
    if r.json()["status"] == "archived":
        print("Error: Should not archive yet")
        sys.exit(1)

    # User 2 requests close
    r = requests.post(f"{CHAT_URL}/close-request", json={"chat_id": chat_id, "user_id": "u2"})
    print(f"U2 close request: {r.json()}")
    
    # User 3 requests close -> Should archive
    r = requests.post(f"{CHAT_URL}/close-request", json={"chat_id": chat_id, "user_id": "u3"})
    print(f"U3 close request: {r.json()}")
    if r.json()["status"] != "archived":
        print("Error: Should be archived now")
        sys.exit(1)

def test_ai():
    print("\n--- Testing AI Engine ---")
    try:
        # Test Embedding (Local Model)
        print("Testing Embeddings (local model)...")
        r = requests.post(f"{AI_URL}/embed", json={"text": "Hello world"})
        print(f"Embedding status: {r.status_code}")
        if r.status_code == 200:
            print(f"Vector size: {len(r.json()['embedding'])}")
        
        # Test Ask (Groq Cloud)
        print("Testing LLM (Groq Cloud)...")
        r = requests.post(f"{AI_URL}/ask", json={"query": "Who are you?", "context": "I am a tester."})
        print(f"Ask response: {r.json().get('answer')}")
        
    except Exception as e:
        print(f"AI Engine test failed: {e}")

if __name__ == "__main__":
    print("Waiting for services to be ready...")
    time.sleep(5)
    test_calendar()
    test_chat()
    test_ai()
