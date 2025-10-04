import os
import logging
from supabase import create_client, Client
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

class SupabaseDB:
    def __init__(self):
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not url or not key:
            raise ValueError("Missing Supabase credentials")
            
        self.supabase: Client = create_client(url, key)
        logger.info("Supabase client initialized successfully")
    
    # Houses operations
    def create_house(self, house_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            result = self.supabase.table('houses').insert(house_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating house: {e}")
            raise
    
    def get_houses(self, limit: int = 1000) -> List[Dict[str, Any]]:
        try:
            result = self.supabase.table('houses').select('*').limit(limit).execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error getting houses: {e}")
            return []
    
    def get_house_by_id(self, house_id: str) -> Optional[Dict[str, Any]]:
        try:
            result = self.supabase.table('houses').select('*').eq('id', house_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error getting house by ID: {e}")
            return None
    
    def update_house(self, house_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            result = self.supabase.table('houses').update(update_data).eq('id', house_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error updating house: {e}")
            raise
    
    def delete_house(self, house_id: str) -> bool:
        try:
            result = self.supabase.table('houses').delete().eq('id', house_id).execute()
            return len(result.data) > 0
        except Exception as e:
            logger.error(f"Error deleting house: {e}")
            return False
    
    # Members operations
    def create_member(self, member_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            result = self.supabase.table('members').insert(member_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating member: {e}")
            raise
    
    def get_members(self, limit: int = 1000) -> List[Dict[str, Any]]:
        try:
            result = self.supabase.table('members').select('*').limit(limit).execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error getting members: {e}")
            return []
    
    def get_member_by_id(self, member_id: str) -> Optional[Dict[str, Any]]:
        try:
            result = self.supabase.table('members').select('*').eq('id', member_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error getting member by ID: {e}")
            return None
    
    def update_member(self, member_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            result = self.supabase.table('members').update(update_data).eq('id', member_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error updating member: {e}")
            raise
    
    def delete_member(self, member_id: str) -> bool:
        try:
            result = self.supabase.table('members').delete().eq('id', member_id).execute()
            return len(result.data) > 0
        except Exception as e:
            logger.error(f"Error deleting member: {e}")
            return False
    
    # Vehicles operations
    def create_vehicle(self, vehicle_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            result = self.supabase.table('vehicles').insert(vehicle_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating vehicle: {e}")
            raise
    
    def get_vehicles(self, limit: int = 1000) -> List[Dict[str, Any]]:
        try:
            result = self.supabase.table('vehicles').select('*').limit(limit).execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error getting vehicles: {e}")
            return []
    
    def get_vehicle_by_id(self, vehicle_id: str) -> Optional[Dict[str, Any]]:
        try:
            result = self.supabase.table('vehicles').select('*').eq('id', vehicle_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error getting vehicle by ID: {e}")
            return None
    
    def update_vehicle(self, vehicle_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            result = self.supabase.table('vehicles').update(update_data).eq('id', vehicle_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error updating vehicle: {e}")
            raise
    
    def delete_vehicle(self, vehicle_id: str) -> bool:
        try:
            result = self.supabase.table('vehicles').delete().eq('id', vehicle_id).execute()
            return len(result.data) > 0
        except Exception as e:
            logger.error(f"Error deleting vehicle: {e}")
            return False
    
    # Payments operations
    def create_payment(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            result = self.supabase.table('maintenance_payments').insert(payment_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating payment: {e}")
            raise
    
    def get_payments(self, limit: int = 1000) -> List[Dict[str, Any]]:
        try:
            result = self.supabase.table('maintenance_payments').select('*').limit(limit).execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error getting payments: {e}")
            return []
    
    def get_payment_by_id(self, payment_id: int) -> Optional[Dict[str, Any]]:
        try:
            result = self.supabase.table('maintenance_payments').select('*').eq('id', payment_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error getting payment by ID: {e}")
            return None
    
    def update_payment(self, payment_id: int, update_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            result = self.supabase.table('maintenance_payments').update(update_data).eq('id', payment_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error updating payment: {e}")
            raise
    
    def delete_payment(self, payment_id: int) -> bool:
        try:
            result = self.supabase.table('maintenance_payments').delete().eq('id', payment_id).execute()
            return len(result.data) > 0
        except Exception as e:
            logger.error(f"Error deleting payment: {e}")
            return False
    
    # Expenditures operations
    def create_expenditure(self, expenditure_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            result = self.supabase.table('expenditures').insert(expenditure_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating expenditure: {e}")
            raise
    
    def get_expenditures(self, limit: int = 1000) -> List[Dict[str, Any]]:
        try:
            result = self.supabase.table('expenditures').select('*').limit(limit).execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error getting expenditures: {e}")
            return []
    
    def get_expenditure_by_id(self, expenditure_id: int) -> Optional[Dict[str, Any]]:
        try:
            result = self.supabase.table('expenditures').select('*').eq('id', expenditure_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error getting expenditure by ID: {e}")
            return None
    
    def update_expenditure(self, expenditure_id: int, update_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            result = self.supabase.table('expenditures').update(update_data).eq('id', expenditure_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error updating expenditure: {e}")
            raise
    
    def delete_expenditure(self, expenditure_id: int) -> bool:
        try:
            result = self.supabase.table('expenditures').delete().eq('id', expenditure_id).execute()
            return len(result.data) > 0
        except Exception as e:
            logger.error(f"Error deleting expenditure: {e}")
            return False

# Create a simple initialization function
_db_instance = None

def get_db():
    global _db_instance
    if _db_instance is None:
        _db_instance = SupabaseDB()
    return _db_instance