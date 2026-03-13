from fastapi import APIRouter, HTTPException
from app.schemas.schedule_request import ScheduleRequest
from app.ga.scheduler import GAScheduler
from app.utils import format_genes

router = APIRouter()

@router.post("/")
def generate_schedule(request: ScheduleRequest):
    try:
        scheduler = GAScheduler(request)
        result = scheduler.run()
        
        fitness = result["best_fitness"]
        if isinstance(fitness, tuple):
            fitness = {"hard_score": fitness[0], "soft_score": fitness[1]}
            
        return {
            "status": "success",
            "generations": result["generations_run"],
            "stop_reason": result["stop_reason"],
            "best_fitness": fitness,
            "hard_constraints": result["hard_constraints"],
            "soft_constraints": result["soft_constraints"],
            "schedule": format_genes(
                result["best_chromosome"],
                result["courses_dict"],
                result["lecturers_dict"],
                result["rooms_dict"]
            )
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))