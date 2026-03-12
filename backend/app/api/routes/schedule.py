from fastapi import APIRouter, HTTPException
from app.schemas.schedule_request import ScheduleRequest
from app.services.scheduler_service import SchedulerService
from app.utils import format_genes

router = APIRouter()

@router.post("/")
def generate_schedule(request: ScheduleRequest):
    try:
        result = SchedulerService.run_genetic_algorithm(request)
        
        best_chrom = result.get("best_chromosome")
        fitness = result.get("best_fitness")
        
        if isinstance(fitness, tuple):
            fitness = {"hard_score": fitness[0], "soft_score": fitness[1]}
            
        return {
            "status": "success",
            "generations": result.get("generations_run"),
            "stop_reason": result.get("stop_reason"),
            "best_fitness": fitness,
            "hard_constraints": result.get("hard_constraints"),
            "soft_constraints": result.get("soft_constraints"),
            "schedule": format_genes(best_chrom)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))