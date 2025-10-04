from fastapi import APIRouter, HTTPException, Query
from typing import List
from models import Member, MemberCreate, MemberUpdate
from database import db
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/members", tags=["members"])

@router.get("", response_model=List[Member])
async def get_members():
    """Get all members"""
    try:
        members_data = db.get_members()
        return [Member(**member) for member in members_data]
    except Exception as e:
        logger.error(f"Error fetching members: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch members")

@router.get("/{member_id}", response_model=Member)
async def get_member(member_id: str):
    """Get a specific member by ID"""
    try:
        member_data = db.get_member_by_id(member_id)
        if not member_data:
            raise HTTPException(status_code=404, detail="Member not found")
        return Member(**member_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching member {member_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch member")

@router.post("", response_model=Member)
async def create_member(member_data: MemberCreate):
    """Create a new member"""
    try:
        member = Member(**member_data.dict())
        created_member = db.create_member(member.dict())
        if not created_member:
            raise HTTPException(status_code=400, detail="Failed to create member")
        return Member(**created_member)
    except Exception as e:
        logger.error(f"Error creating member: {e}")
        raise HTTPException(status_code=500, detail="Failed to create member")

@router.put("/{member_id}", response_model=Member)
async def update_member(member_id: str, update_data: MemberUpdate):
    """Update a member"""
    try:
        # Check if member exists
        existing_member = db.get_member_by_id(member_id)
        if not existing_member:
            raise HTTPException(status_code=404, detail="Member not found")
        
        # Prepare update data
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        update_dict["updatedAt"] = datetime.utcnow()
        
        updated_member = db.update_member(member_id, update_dict)
        if not updated_member:
            raise HTTPException(status_code=400, detail="Failed to update member")
        return Member(**updated_member)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating member {member_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update member")

@router.delete("/{member_id}")
async def delete_member(member_id: str):
    """Delete a member"""
    try:
        # Check if member exists
        existing_member = db.get_member_by_id(member_id)
        if not existing_member:
            raise HTTPException(status_code=404, detail="Member not found")
        
        success = db.delete_member(member_id)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to delete member")
        
        return {"message": "Member deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting member {member_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete member")