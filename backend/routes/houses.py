from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from ..models import House, HouseCreate, HouseUpdate, HousesListResponse
from ..database import db
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/houses", tags=["houses"])

@router.get("", response_model=HousesListResponse)
async def get_houses(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100)
):
    """Get all houses with pagination and summary"""
    try:
        houses_data = db.get_houses(limit=1000)  # Get all for now
        houses = [House(**house) for house in houses_data]
        
        # Calculate summary
        total = len(houses)
        occupied = sum(1 for h in houses if h.status == 'occupied')
        vacant = sum(1 for h in houses if h.status == 'vacant')
        
        # Apply pagination
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_houses = houses[start_idx:end_idx]
        
        return HousesListResponse(
            list=paginated_houses,
            summary={
                "total": total,
                "occupied": occupied,
                "vacant": vacant
            },
            pagination={
                "total": total,
                "page": page,
                "pageSize": page_size
            }
        )
    except Exception as e:
        logger.error(f"Error fetching houses: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch houses")

@router.get("/{house_id}", response_model=House)
async def get_house(house_id: str):
    """Get a specific house by ID"""
    try:
        house_data = db.get_house_by_id(house_id)
        if not house_data:
            raise HTTPException(status_code=404, detail="House not found")
        return House(**house_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching house {house_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch house")

@router.post("", response_model=House)
async def create_house(house_data: HouseCreate):
    """Create a new house"""
    try:
        house = House(**house_data.dict())
        created_house = db.create_house(house.dict())
        if not created_house:
            raise HTTPException(status_code=400, detail="Failed to create house")
        return House(**created_house)
    except Exception as e:
        logger.error(f"Error creating house: {e}")
        raise HTTPException(status_code=500, detail="Failed to create house")

@router.put("/{house_id}", response_model=House)
async def update_house(house_id: str, update_data: HouseUpdate):
    """Update a house"""
    try:
        # Check if house exists
        existing_house = db.get_house_by_id(house_id)
        if not existing_house:
            raise HTTPException(status_code=404, detail="House not found")
        
        # Prepare update data
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        update_dict["updatedAt"] = datetime.utcnow()
        
        updated_house = db.update_house(house_id, update_dict)
        if not updated_house:
            raise HTTPException(status_code=400, detail="Failed to update house")
        return House(**updated_house)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating house {house_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update house")

@router.delete("/{house_id}")
async def delete_house(house_id: str):
    """Delete a house"""
    try:
        # Check if house exists
        existing_house = db.get_house_by_id(house_id)
        if not existing_house:
            raise HTTPException(status_code=404, detail="House not found")
        
        success = db.delete_house(house_id)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to delete house")
        
        return {"message": "House deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting house {house_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete house")