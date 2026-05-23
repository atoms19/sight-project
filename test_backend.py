import urllib.request
import json
import time
import subprocess

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
    except Exception as e:
        print(f"❌ Failed: {e}")
        return None

if __name__ == "__main__":
    BASE_URL = "http://localhost:8000"
    TEST_DEVICE_ID = "test_device_api_001"

    print(f"Injecting mock telemetry for {TEST_DEVICE_ID} into MQTT...")
    mock_payload = json.dumps({
        "device_id": TEST_DEVICE_ID, 
        "irms_a": 1.5, 
        "vrms_v": 230.0, 
        "power_w": 345.0, 
        "energy_wh": 10.5, 
        "relay_state": 1
    })
    subprocess.run([
        "docker", "exec", "sight-broker", "mosquitto_pub", 
        "-t", f"sight/meters/{TEST_DEVICE_ID}/telemetry", 
        "-m", mock_payload
    ])
    
    # Wait a second for InfluxDB and Redis to ingest the message
    time.sleep(2)

    # Test Health
    test_endpoint("Health", f"{BASE_URL}/health")

    # Test Devices List
    devices_data = test_endpoint("Devices List", f"{BASE_URL}/devices")

    # Test Live State for the Test Device
    if devices_data and TEST_DEVICE_ID in devices_data.get("devices", []):
        print(f"\nFound {TEST_DEVICE_ID} in devices list. Proceeding to test device-specific endpoints.")
        test_endpoint("Live State", f"{BASE_URL}/devices/{TEST_DEVICE_ID}/live")
        test_endpoint("History", f"{BASE_URL}/devices/{TEST_DEVICE_ID}/history")
        
        # Test Set Relay
        print("\n--- Testing Set Relay (OFF) ---")
        test_endpoint("Set Relay OFF", f"{BASE_URL}/devices/{TEST_DEVICE_ID}/relay", method="POST", data={"relay": False})

        print("\n--- Testing Set Relay (ON) ---")
        test_endpoint("Set Relay ON", f"{BASE_URL}/devices/{TEST_DEVICE_ID}/relay", method="POST", data={"relay": True})

    else:
        print(f"\n❌ Test device {TEST_DEVICE_ID} not found in the devices list. Ingest pipeline issue or MQTT message not processed.")

    # Clean up the test script
    # This will be done automatically if this is a one-off run by the agent.