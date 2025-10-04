from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging
from pathlib import Path
from database_simple import get_db
from models import *

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create FastAPI app
app = FastAPI(
    title="Society Management API",
    description="API for managing residential society operations",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Health endpoints
@app.get("/api/")
async def root():
    return {"message": "Society Management API is running", "status": "healthy"}

@app.get("/api/health")
async def health_check():
    try:
        db = get_db()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

# Houses endpoints
@app.get("/api/houses")
async def get_houses():
    """Get all houses"""
    try:
        db = get_db()
        houses_data = db.get_houses()
        
        # Calculate summary
        total = len(houses_data)
        occupied = sum(1 for h in houses_data if h.get('status') == 'occupied')
        vacant = sum(1 for h in houses_data if h.get('status') == 'vacant')
        
        return {
            "list": houses_data,
            "summary": {
                "total": total,
                "occupied": occupied,
                "vacant": vacant
            },
            "pagination": {
                "total": total,
                "page": 1,
                "pageSize": 50
            }
        }
    except Exception as e:
        logger.error(f"Error fetching houses: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch houses")

@app.post("/api/houses")
async def create_house(house_data: HouseCreate):
    """Create a new house"""
    try:
        db = get_db()
        house = House(**house_data.dict())
        created_house = db.create_house(house.dict())
        if not created_house:
            raise HTTPException(status_code=400, detail="Failed to create house")
        return created_house
    except Exception as e:
        logger.error(f"Error creating house: {e}")
        raise HTTPException(status_code=500, detail="Failed to create house")

@app.get("/api/houses/{house_id}")
async def get_house(house_id: str):
    """Get a specific house"""
    try:
        db = get_db()
        house_data = db.get_house_by_id(house_id)
        if not house_data:
            raise HTTPException(status_code=404, detail="House not found")
        return house_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching house: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch house")

@app.put("/api/houses/{house_id}")
async def update_house(house_id: str, update_data: HouseUpdate):
    """Update a house"""
    try:
        db = get_db()
        existing_house = db.get_house_by_id(house_id)
        if not existing_house:
            raise HTTPException(status_code=404, detail="House not found")
        
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        updated_house = db.update_house(house_id, update_dict)
        if not updated_house:
            raise HTTPException(status_code=400, detail="Failed to update house")
        return updated_house
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating house: {e}")
        raise HTTPException(status_code=500, detail="Failed to update house")

@app.delete("/api/houses/{house_id}")
async def delete_house(house_id: str):
    """Delete a house"""
    try:
        db = get_db()
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
        logger.error(f"Error deleting house: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete house")

# Members endpoints
@app.get("/api/members")
async def get_members():
    """Get all members"""
    try:
        db = get_db()
        members_data = db.get_members()
        return members_data
    except Exception as e:
        logger.error(f"Error fetching members: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch members")

@app.post("/api/members")
async def create_member(member_data: MemberCreate):
    """Create a new member"""
    try:
        db = get_db()
        member = Member(**member_data.dict())
        created_member = db.create_member(member.dict())
        if not created_member:
            raise HTTPException(status_code=400, detail="Failed to create member")
        return created_member
    except Exception as e:
        logger.error(f"Error creating member: {e}")
        raise HTTPException(status_code=500, detail="Failed to create member")

# Vehicles endpoints
@app.get("/api/vehicles")
async def get_vehicles():
    """Get all vehicles"""
    try:
        db = get_db()
        vehicles_data = db.get_vehicles()
        return vehicles_data
    except Exception as e:
        logger.error(f"Error fetching vehicles: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch vehicles")

@app.post("/api/vehicles")
async def create_vehicle(vehicle_data: VehicleCreate):
    """Create a new vehicle"""
    try:
        db = get_db()
        vehicle = Vehicle(**vehicle_data.dict())
        created_vehicle = db.create_vehicle(vehicle.dict())
        if not created_vehicle:
            raise HTTPException(status_code=400, detail="Failed to create vehicle")
        return created_vehicle
    except Exception as e:
        logger.error(f"Error creating vehicle: {e}")
        raise HTTPException(status_code=500, detail="Failed to create vehicle")

# Payments endpoints
@app.get("/api/payments")
async def get_payments():
    """Get all payments"""
    try:
        db = get_db()
        payments_data = db.get_payments()
        
        # Calculate summary
        total_amount = sum(p.get('amount', 0) for p in payments_data)
        total_collected = sum(p.get('amountPaid', 0) for p in payments_data if p.get('status') == 'paid')
        pending_amount = sum(p.get('amount', 0) - p.get('amountPaid', 0) for p in payments_data if p.get('status') in ['pending', 'partial'])
        overdue_amount = sum(p.get('amount', 0) - p.get('amountPaid', 0) for p in payments_data if p.get('status') == 'overdue')
        collection_rate = (total_collected / total_amount * 100) if total_amount > 0 else 0
        
        return {
            "list": payments_data,
            "summary": {
                "total": total_amount,
                "collected": total_collected,
                "pending": pending_amount,
                "overdue": overdue_amount,
                "collectionRate": round(collection_rate, 2)
            }
        }
    except Exception as e:
        logger.error(f"Error fetching payments: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch payments")

@app.post("/api/payments")
async def create_payment(payment_data: MaintenancePaymentCreate):
    """Create a new payment"""
    try:
        db = get_db()
        payment_dict = payment_data.dict()
        created_payment = db.create_payment(payment_dict)
        if not created_payment:
            raise HTTPException(status_code=400, detail="Failed to create payment")
        return created_payment
    except Exception as e:
        logger.error(f"Error creating payment: {e}")
        raise HTTPException(status_code=500, detail="Failed to create payment")

# Expenditures endpoints
@app.get("/api/expenditures")
async def get_expenditures():
    """Get all expenditures"""
    try:
        db = get_db()
        expenditures_data = db.get_expenditures()
        
        # Calculate summary
        total_expenditure = sum(e.get('amount', 0) for e in expenditures_data)
        
        # Get total collection from payments
        payments_data = db.get_payments()
        total_collection = sum(p.get('amountPaid', 0) for p in payments_data if p.get('status') == 'paid')
        
        remaining_balance = total_collection - total_expenditure
        
        # Category breakdown
        category_breakdown = {}
        for exp in expenditures_data:
            category = exp.get('category')
            amount = exp.get('amount', 0)
            if category in category_breakdown:
                category_breakdown[category] += amount
            else:
                category_breakdown[category] = amount
        
        return {
            "list": expenditures_data,
            "summary": {
                "totalExpenditure": total_expenditure,
                "totalCollection": total_collection,
                "remainingBalance": remaining_balance,
                "categoryBreakdown": category_breakdown
            }
        }
    except Exception as e:
        logger.error(f"Error fetching expenditures: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch expenditures")

@app.post("/api/expenditures")
async def create_expenditure(expenditure_data: ExpenditureCreate):
    """Create a new expenditure"""
    try:
        db = get_db()
        expenditure_dict = expenditure_data.dict()
        created_expenditure = db.create_expenditure(expenditure_dict)
        if not created_expenditure:
            raise HTTPException(status_code=400, detail="Failed to create expenditure")
        return created_expenditure
    except Exception as e:
        logger.error(f"Error creating expenditure: {e}")
        raise HTTPException(status_code=500, detail="Failed to create expenditure")