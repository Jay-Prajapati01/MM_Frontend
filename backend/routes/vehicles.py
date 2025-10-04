import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, HTTPException, Query
from typing import List
from models import Vehicle, VehicleCreate, VehicleUpdate
from database import db
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/vehicles", tags=["vehicles"])

@router.get("", response_model=List[Vehicle])
async def get_vehicles():
    """Get all vehicles"""
    try:
        vehicles_data = db.get_vehicles()
        return [Vehicle(**vehicle) for vehicle in vehicles_data]
    except Exception as e:
        logger.error(f"Error fetching vehicles: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch vehicles")

@router.get("/{vehicle_id}", response_model=Vehicle)
async def get_vehicle(vehicle_id: str):
    """Get a specific vehicle by ID"""
    try:
        vehicle_data = db.get_vehicle_by_id(vehicle_id)
        if not vehicle_data:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        return Vehicle(**vehicle_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching vehicle {vehicle_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch vehicle")

@router.post("", response_model=Vehicle)
async def create_vehicle(vehicle_data: VehicleCreate):
    """Create a new vehicle"""
    try:
        vehicle = Vehicle(**vehicle_data.dict())
        created_vehicle = db.create_vehicle(vehicle.dict())
        if not created_vehicle:
            raise HTTPException(status_code=400, detail="Failed to create vehicle")
        return Vehicle(**created_vehicle)
    except Exception as e:
        logger.error(f"Error creating vehicle: {e}")
        raise HTTPException(status_code=500, detail="Failed to create vehicle")

@router.put("/{vehicle_id}", response_model=Vehicle)
async def update_vehicle(vehicle_id: str, update_data: VehicleUpdate):
    """Update a vehicle"""
    try:
        # Check if vehicle exists
        existing_vehicle = db.get_vehicle_by_id(vehicle_id)
        if not existing_vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        # Prepare update data
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        update_dict["updatedAt"] = datetime.utcnow()
        
        updated_vehicle = db.update_vehicle(vehicle_id, update_dict)
        if not updated_vehicle:
            raise HTTPException(status_code=400, detail="Failed to update vehicle")
        return Vehicle(**updated_vehicle)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating vehicle {vehicle_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update vehicle")

@router.delete("/{vehicle_id}")
async def delete_vehicle(vehicle_id: str):
    """Delete a vehicle"""
    try:
        # Check if vehicle exists
        existing_vehicle = db.get_vehicle_by_id(vehicle_id)
        if not existing_vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        success = db.delete_vehicle(vehicle_id)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to delete vehicle")
        
        return {"message": "Vehicle deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting vehicle {vehicle_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete vehicle")