import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, HTTPException, Query
from typing import List
from models import MaintenancePayment, MaintenancePaymentCreate, MaintenancePaymentUpdate, PaymentsListResponse
from database import db
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["payments"])

@router.get("", response_model=PaymentsListResponse)
async def get_payments():
    """Get all maintenance payments with summary"""
    try:
        payments_data = db.get_payments()
        payments = [MaintenancePayment(**payment) for payment in payments_data]
        
        # Calculate summary
        total_amount = sum(p.amount for p in payments)
        total_collected = sum(p.amountPaid for p in payments if p.status == 'paid')
        pending_amount = sum(p.amount - p.amountPaid for p in payments if p.status in ['pending', 'partial'])
        overdue_amount = sum(p.amount - p.amountPaid for p in payments if p.status == 'overdue')
        collection_rate = (total_collected / total_amount * 100) if total_amount > 0 else 0
        
        return PaymentsListResponse(
            list=payments,
            summary={
                "total": total_amount,
                "collected": total_collected,
                "pending": pending_amount,
                "overdue": overdue_amount,
                "collectionRate": round(collection_rate, 2)
            }
        )
    except Exception as e:
        logger.error(f"Error fetching payments: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch payments")

@router.get("/{payment_id}", response_model=MaintenancePayment)
async def get_payment(payment_id: int):
    """Get a specific payment by ID"""
    try:
        payment_data = db.get_payment_by_id(payment_id)
        if not payment_data:
            raise HTTPException(status_code=404, detail="Payment not found")
        return MaintenancePayment(**payment_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching payment {payment_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch payment")

@router.post("", response_model=MaintenancePayment)
async def create_payment(payment_data: MaintenancePaymentCreate):
    """Create a new maintenance payment"""
    try:
        # Convert to dict and remove id field since it's auto-generated
        payment_dict = payment_data.dict()
        created_payment = db.create_payment(payment_dict)
        if not created_payment:
            raise HTTPException(status_code=400, detail="Failed to create payment")
        return MaintenancePayment(**created_payment)
    except Exception as e:
        logger.error(f"Error creating payment: {e}")
        raise HTTPException(status_code=500, detail="Failed to create payment")

@router.put("/{payment_id}", response_model=MaintenancePayment)
async def update_payment(payment_id: int, update_data: MaintenancePaymentUpdate):
    """Update a maintenance payment"""
    try:
        # Check if payment exists
        existing_payment = db.get_payment_by_id(payment_id)
        if not existing_payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Prepare update data
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        update_dict["updatedAt"] = datetime.utcnow()
        
        # Update payment status based on amount paid
        if "amountPaid" in update_dict:
            amount = existing_payment.get("amount", 0)
            amount_paid = update_dict["amountPaid"]
            if amount_paid >= amount:
                update_dict["status"] = "paid"
                update_dict["paidDate"] = datetime.utcnow().strftime("%Y-%m-%d")
            elif amount_paid > 0:
                update_dict["status"] = "partial"
            else:
                update_dict["status"] = "pending"
        
        updated_payment = db.update_payment(payment_id, update_dict)
        if not updated_payment:
            raise HTTPException(status_code=400, detail="Failed to update payment")
        return MaintenancePayment(**updated_payment)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating payment {payment_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update payment")

@router.delete("/{payment_id}")
async def delete_payment(payment_id: int):
    """Delete a maintenance payment"""
    try:
        # Check if payment exists
        existing_payment = db.get_payment_by_id(payment_id)
        if not existing_payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        success = db.delete_payment(payment_id)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to delete payment")
        
        return {"message": "Payment deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting payment {payment_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete payment")

@router.post("/generate-monthly")
async def generate_monthly_payments(default_amount: float = Query(..., description="Default maintenance amount")):
    """Generate monthly payments for all houses"""
    try:
        # Get all houses
        houses_data = db.get_houses()
        
        generated_count = 0
        current_date = datetime.utcnow()
        month_str = current_date.strftime("%B %Y")
        due_date = current_date.replace(day=5).strftime("%Y-%m-%d")  # Due on 5th of month
        
        for house_data in houses_data:
            house_no = house_data.get("houseNo")
            owner_name = house_data.get("ownerName", "")
            
            if house_no:
                payment_data = {
                    "house": house_no,
                    "owner": owner_name,
                    "amount": default_amount,
                    "amountPaid": 0,
                    "month": month_str,
                    "dueDate": due_date,
                    "status": "pending"
                }
                
                created_payment = db.create_payment(payment_data)
                if created_payment:
                    generated_count += 1
        
        return {
            "message": f"Generated {generated_count} monthly payments",
            "month": month_str,
            "amount": default_amount,
            "generated_count": generated_count
        }
    except Exception as e:
        logger.error(f"Error generating monthly payments: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate monthly payments")