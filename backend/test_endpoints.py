import requests

endpoints = [
    ("GET",  "http://localhost:5000/api/health",         None),
    ("GET",  "http://localhost:5000/api/dashboard",      None),
    ("GET",  "http://localhost:5000/api/experiments",    None),
    ("GET",  "http://localhost:5000/api/visualizations", None),
    ("POST", "http://localhost:5000/api/train",          {"model_id": "lr", "params": {"C": 1.0, "max_iter": 300}}),
]

for method, url, body in endpoints:
    try:
        r = requests.post(url, json=body, timeout=40) if method == "POST" else requests.get(url, timeout=40)
        name = url.split("/api/")[1]
        if r.status_code == 200:
            data = r.json()
            print(f"[OK]  {name} -> keys: {list(data.keys())[:5]}")
        else:
            print(f"[ERR {r.status_code}] {name} -> {r.text[:300]}")
    except Exception as e:
        print(f"[FAIL] {url} -> {e}")
