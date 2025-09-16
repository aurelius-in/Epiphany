import os
import requests

def base_url():
    return os.getenv('INFER_VIDEO_URL', 'http://localhost:8002')

def test_t2v_returns_output_url():
    r = requests.post(f"{base_url()}/infer/t2v", json={"prompt": "a short test clip", "fps": 12, "resolution": "576p", "durationSec": 2})
    r.raise_for_status()
    j = r.json()
    assert 'output_url' in j and isinstance(j['output_url'], str) and len(j['output_url']) > 0
