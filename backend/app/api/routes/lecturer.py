import dataclasses
from fastapi import APIRouter, HTTPException
from app.schemas import Lecturer
from app import data_store

router = APIRouter(prefix="/lecturers", tags=["Lecturers"])

@router.get("/")
def list_lecturers():
    return data_store.get_collection("lecturers")

@router.get("/{lecturer_id}")
def get_lecturer(lecturer_id: int):
    for l in data_store.get_collection("lecturers"):
        if l.get("id") == lecturer_id:
            return l
    raise HTTPException(status_code=404, detail="Lecturer not found")

@router.post("/", status_code=201)
def create_lecturer(lecturer: Lecturer):
    items = data_store.get_collection("lecturers")
    new_item = dataclasses.asdict(lecturer)
    new_item["id"] = data_store.next_id("lecturers")
    items.append(new_item)
    data_store.set_collection("lecturers", items)
    return new_item

@router.put("/{lecturer_id}")
def update_lecturer(lecturer_id: int, lecturer: Lecturer):
    items = data_store.get_collection("lecturers")
    for i, l in enumerate(items):
        if l.get("id") == lecturer_id:
            updated = dataclasses.asdict(lecturer)
            updated["id"] = lecturer_id
            items[i] = updated
            data_store.set_collection("lecturers", items)
            return updated
    raise HTTPException(status_code=404, detail="Lecturer not found")

@router.delete("/{lecturer_id}")
def delete_lecturer(lecturer_id: int):
    items = data_store.get_collection("lecturers")
    new_items = [l for l in items if l.get("id") != lecturer_id]
    if len(new_items) == len(items):
        raise HTTPException(status_code=404, detail="Lecturer not found")
    data_store.set_collection("lecturers", new_items)
    return {"message": "Deleted", "id": lecturer_id}
