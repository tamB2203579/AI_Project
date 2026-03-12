import dataclasses
from fastapi import APIRouter, HTTPException
from app.schemas import Course
from app import data_store

router = APIRouter(prefix="/courses", tags=["Courses"])

@router.get("/")
def list_courses():
    return data_store.get_collection("courses")

@router.get("/{course_id}")
def get_course(course_id: int):
    for c in data_store.get_collection("courses"):
        if c.get("id") == course_id:
            return c
    raise HTTPException(status_code=404, detail="Course not found")

@router.post("/", status_code=201)
def create_course(course: Course):
    items = data_store.get_collection("courses")
    new_item = dataclasses.asdict(course)
    new_item["id"] = data_store.next_id("courses")
    items.append(new_item)
    data_store.set_collection("courses", items)
    return new_item

@router.put("/{course_id}")
def update_course(course_id: int, course: Course):
    items = data_store.get_collection("courses")
    for i, c in enumerate(items):
        if c.get("id") == course_id:
            updated = dataclasses.asdict(course)
            updated["id"] = course_id
            items[i] = updated
            data_store.set_collection("courses", items)
            return updated
    raise HTTPException(status_code=404, detail="Course not found")

@router.delete("/{course_id}")
def delete_course(course_id: int):
    items = data_store.get_collection("courses")
    new_items = [c for c in items if c.get("id") != course_id]
    if len(new_items) == len(items):
        raise HTTPException(status_code=404, detail="Course not found")
    data_store.set_collection("courses", new_items)
    return {"message": "Deleted", "id": course_id}
