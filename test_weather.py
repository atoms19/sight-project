import urllib.request
import json

def test_endpoint(name, url, method="GET", data=None):
    print(f"\n--- Testing {name} ---")
    try:
        headers = {}
        payload = None
        if data:
            payload = json.dumps(data).encode('utf-8')
            headers['Content-Type'] = 'application/json'

        req = urllib.request.Request(url, data=payload, headers=headers, method=method)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(f"✅ Success! ({response.status})")
            print(json.dumps(data, indent=2))
            return data
    except urllib.error.HTTPError as e:
        print(f"❌ Failed: HTTP Error {e.code}: {e.read().decode()}")
        return None
    except Exception as e:
        print(f"❌ Failed: {e}")
        return None

if __name__ == "__main__":
    BASE_URL = "http://localhost:8000"

    # Test GET Weather Config
    test_endpoint("GET Weather Config", f"{BASE_URL}/weather/config")

    # Test POST Weather Config
    new_config = {"city": "Tokyo", "lat": 35.6762, "lon": 139.6503}
    test_endpoint("POST Weather Config", f"{BASE_URL}/weather/config", method="POST", data=new_config)

    # Test GET Weather Config again to ensure it was saved
    test_endpoint("GET Weather Config (After POST)", f"{BASE_URL}/weather/config")