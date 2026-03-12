import json
import threading
from pathlib import Path

DATA_FILE = Path(__file__).parent.parent / "data.json"

_data = {
    "courses": [],
    "lecturers": [],
    "rooms": [],
    "timeslots": []
}

_lock = threading.Lock()

def init():
    """Load data from JSON on startup."""
    global _data
    if DATA_FILE.exists():
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            loaded_data = json.load(f)
            with _lock:
                for key in _data.keys():
                    if key in loaded_data:
                        _data[key] = loaded_data[key]

def get_data() -> dict:
    with _lock:
        return {
            "courses": list(_data["courses"]),
            "lecturers": list(_data["lecturers"]),
            "rooms": list(_data["rooms"]),
            "timeslots": list(_data["timeslots"]),
        }

def get_collection(collection_name: str) -> list[dict]:
    with _lock:
        return list(_data.get(collection_name, []))

def set_collection(collection_name: str, items: list[dict]):
    with _lock:
        _data[collection_name] = items
    _save_to_disk()

def _save_to_disk():
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(_data, f, indent=2)

def next_id(collection_name: str) -> int:
    with _lock:
        items = _data.get(collection_name, [])
        if not items:
            return 1
        return max(item.get("id", 0) for item in items) + 1
