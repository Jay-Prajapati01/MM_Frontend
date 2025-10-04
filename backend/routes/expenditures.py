from fastapi import APIRouter, HTTPException, Query
from typing import List
from models import Expenditure, ExpenditureCreate, ExpenditureUpdate, ExpendituresListResponse
from database import db
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/expenditures", tags=["expenditures"])

@router.get("", response_model=ExpendituresListResponse)
async def get_expenditures():
    """Get all expenditures with summary"""
    try:
        expenditures_data = db.get_expenditures()
        expenditures = [Expenditure(**exp) for exp in expenditures_data]
        
        # Calculate summary
        total_expenditure = sum(e.amount for e in expenditures)
        
        # Get total collection from maintenance payments
        payments_data = db.get_payments()
        total_collection = sum(p.get("amountPaid", 0) for p in payments_data if p.get("status") == "paid")
        
        remaining_balance = total_collection - total_expenditure
        
        # Category breakdown
        category_breakdown = {}
        for exp in expenditures:
            category = exp.category
            if category in category_breakdown:
                category_breakdown[category] += exp.amount
            else:
                category_breakdown[category] = exp.amount
        
        return ExpendituresListResponse(
            list=expenditures,
            summary={
                "totalExpenditure": total_expenditure,
                "totalCollection": total_collection,
                "remainingBalance": remaining_balance,
                "categoryBreakdown": category_breakdown
            }
        )
    except Exception as e:
        logger.error(f"Error fetching expenditures: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch expenditures")

@router.get("/{expenditure_id}", response_model=Expenditure)
async def get_expenditure(expenditure_id: int):
    """Get a specific expenditure by ID"""
    try:
        expenditure_data = db.get_expenditure_by_id(expenditure_id)
        if not expenditure_data:
            raise HTTPException(status_code=404, detail="Expenditure not found")
        return Expenditure(**expenditure_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching expenditure {expenditure_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch expenditure")

@router.post("", response_model=Expenditure)
async def create_expenditure(expenditure_data: ExpenditureCreate):
    """Create a new expenditure"""
    try:
        # Convert to dict and remove id field since it's auto-generated
        expenditure_dict = expenditure_data.dict()
        created_expenditure = db.create_expenditure(expenditure_dict)
        if not created_expenditure:
            raise HTTPException(status_code=400, detail="Failed to create expenditure")
        return Expenditure(**created_expenditure)
    except Exception as e:
        logger.error(f"Error creating expenditure: {e}")
        raise HTTPException(status_code=500, detail="Failed to create expenditure")

@router.put("/{expenditure_id}", response_model=Expenditure)
async def update_expenditure(expenditure_id: int, update_data: ExpenditureUpdate):
    """Update an expenditure"""
    try:
        # Check if expenditure exists
        existing_expenditure = db.get_expenditure_by_id(expenditure_id)
        if not existing_expenditure:
            raise HTTPException(status_code=404, detail="Expenditure not found")
        
        # Prepare update data
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        update_dict["updatedAt"] = datetime.utcnow()
        
        updated_expenditure = db.update_expenditure(expenditure_id, update_dict)
        if not updated_expenditure:
            raise HTTPException(status_code=400, detail="Failed to update expenditure")
        return Expenditure(**updated_expenditure)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating expenditure {expenditure_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update expenditure")

@router.delete("/{expenditure_id}")
async def delete_expenditure(expenditure_id: int):
    """Delete an expenditure"""
    try:
        # Check if expenditure exists
        existing_expenditure = db.get_expenditure_by_id(expenditure_id)
        if not existing_expenditure:
            raise HTTPException(status_code=404, detail="Expenditure not found")
        
        success = db.delete_expenditure(expenditure_id)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to delete expenditure")
        
        return {"message": "Expenditure deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting expenditure {expenditure_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete expenditure")