import os
import logging
from supabase import create_client, Client
from typing import List, Dict, Any, Optional
import asyncio
from functools import wraps

logger = logging.getLogger(__name__)

class SupabaseDB:
    def __init__(self):
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not url or not key:
            raise ValueError("Missing Supabase credentials")
            
        self.supabase: Client = create_client(url, key)
        self.init_tables()
    
    def init_tables(self):
        """Initialize database tables if they don't exist"""
        try:
            # Create houses table
            self.supabase.table('houses').select('id').limit(1).execute()
        except Exception as e:
            logger.info("Creating houses table...")
            # Table doesn't exist, create it via SQL
            self.create_tables()
    
    def create_tables(self):
        """Create all required tables"""
        try:
            # Houses table
            houses_sql = """
            CREATE TABLE IF NOT EXISTS houses (
                id TEXT PRIMARY KEY,
                "houseNo" TEXT NOT NULL,
                block TEXT NOT NULL,
                floor TEXT NOT NULL,
                status TEXT DEFAULT 'vacant',
                notes TEXT,
                "ownerName" TEXT,
                "membersCount" INTEGER DEFAULT 0,
                "vehiclesCount" INTEGER DEFAULT 0,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """
            
            # Members table
            members_sql = """
            CREATE TABLE IF NOT EXISTS members (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                house TEXT NOT NULL,
                role TEXT NOT NULL,
                relationship TEXT,
                phone TEXT NOT NULL,
                email TEXT,
                status TEXT DEFAULT 'active',
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """
            
            # Vehicles table
            vehicles_sql = """
            CREATE TABLE IF NOT EXISTS vehicles (
                id TEXT PRIMARY KEY,
                number TEXT NOT NULL,
                type TEXT NOT NULL,
                "brandModel" TEXT,
                color TEXT,
                "ownerName" TEXT,
                house TEXT NOT NULL,
                "registrationDate" TEXT,
                status TEXT DEFAULT 'active',
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """
            
            # Maintenance payments table
            payments_sql = """
            CREATE TABLE IF NOT EXISTS maintenance_payments (
                id SERIAL PRIMARY KEY,
                house TEXT NOT NULL,
                owner TEXT NOT NULL,
                amount DECIMAL NOT NULL,
                "amountPaid" DECIMAL DEFAULT 0,
                month TEXT NOT NULL,
                "monthRange" TEXT,
                "fromMonth" TEXT,
                "toMonth" TEXT,
                "fromMonthRaw" TEXT,
                "toMonthRaw" TEXT,
                "monthsCount" INTEGER DEFAULT 1,
                "latePayment" BOOLEAN DEFAULT FALSE,
                "dueDate" TEXT NOT NULL,
                "paidDate" TEXT,
                status TEXT DEFAULT 'pending',
                method TEXT,
                remarks TEXT,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                "updatedAt" TIMESTAMP WITH TIME ZONE
            );
            """
            
            # Expenditures table
            expenditures_sql = """
            CREATE TABLE IF NOT EXISTS expenditures (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                amount DECIMAL NOT NULL,
                "paymentMode" TEXT NOT NULL,
                date TEXT NOT NULL,
                description TEXT,
                "attachmentName" TEXT,
                "attachmentData" TEXT,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                "updatedAt" TIMESTAMP WITH TIME ZONE
            );
            """
            
            # Execute table creation
            tables = [houses_sql, members_sql, vehicles_sql, payments_sql, expenditures_sql]
            for sql in tables:
                self.supabase.rpc('exec_sql', {'sql': sql}).execute()
                
            logger.info("All tables created successfully")
            
        except Exception as e:
            logger.error(f"Error creating tables: {e}")
            # Fallback: tables might already exist
            pass
    
    # Houses operations
    def create_house(self, house_data: Dict[str, Any]) -> Dict[str, Any]:
        result = self.supabase.table('houses').insert(house_data).execute()
        return result.data[0] if result.data else None
    
    def get_houses(self, limit: int = 1000) -> List[Dict[str, Any]]:
        result = self.supabase.table('houses').select('*').limit(limit).execute()
        return result.data or []
    
    def get_house_by_id(self, house_id: str) -> Optional[Dict[str, Any]]:
        result = self.supabase.table('houses').select('*').eq('id', house_id).execute()
        return result.data[0] if result.data else None
    
    def update_house(self, house_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        result = self.supabase.table('houses').update(update_data).eq('id', house_id).execute()
        return result.data[0] if result.data else None
    
    def delete_house(self, house_id: str) -> bool:
        result = self.supabase.table('houses').delete().eq('id', house_id).execute()
        return len(result.data) > 0
    
    # Members operations
    def create_member(self, member_data: Dict[str, Any]) -> Dict[str, Any]:
        result = self.supabase.table('members').insert(member_data).execute()
        return result.data[0] if result.data else None
    
    def get_members(self, limit: int = 1000) -> List[Dict[str, Any]]:
        result = self.supabase.table('members').select('*').limit(limit).execute()
        return result.data or []
    
    def get_member_by_id(self, member_id: str) -> Optional[Dict[str, Any]]:
        result = self.supabase.table('members').select('*').eq('id', member_id).execute()
        return result.data[0] if result.data else None
    
    def update_member(self, member_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        result = self.supabase.table('members').update(update_data).eq('id', member_id).execute()
        return result.data[0] if result.data else None
    
    def delete_member(self, member_id: str) -> bool:
        result = self.supabase.table('members').delete().eq('id', member_id).execute()
        return len(result.data) > 0
    
    # Vehicles operations
    def create_vehicle(self, vehicle_data: Dict[str, Any]) -> Dict[str, Any]:
        result = self.supabase.table('vehicles').insert(vehicle_data).execute()
        return result.data[0] if result.data else None
    
    def get_vehicles(self, limit: int = 1000) -> List[Dict[str, Any]]:
        result = self.supabase.table('vehicles').select('*').limit(limit).execute()
        return result.data or []
    
    def get_vehicle_by_id(self, vehicle_id: str) -> Optional[Dict[str, Any]]:
        result = self.supabase.table('vehicles').select('*').eq('id', vehicle_id).execute()
        return result.data[0] if result.data else None
    
    def update_vehicle(self, vehicle_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        result = self.supabase.table('vehicles').update(update_data).eq('id', vehicle_id).execute()
        return result.data[0] if result.data else None
    
    def delete_vehicle(self, vehicle_id: str) -> bool:
        result = self.supabase.table('vehicles').delete().eq('id', vehicle_id).execute()
        return len(result.data) > 0
    
    # Payments operations
    def create_payment(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        result = self.supabase.table('maintenance_payments').insert(payment_data).execute()
        return result.data[0] if result.data else None
    
    def get_payments(self, limit: int = 1000) -> List[Dict[str, Any]]:
        result = self.supabase.table('maintenance_payments').select('*').limit(limit).execute()
        return result.data or []
    
    def get_payment_by_id(self, payment_id: int) -> Optional[Dict[str, Any]]:
        result = self.supabase.table('maintenance_payments').select('*').eq('id', payment_id).execute()
        return result.data[0] if result.data else None
    
    def update_payment(self, payment_id: int, update_data: Dict[str, Any]) -> Dict[str, Any]:
        result = self.supabase.table('maintenance_payments').update(update_data).eq('id', payment_id).execute()
        return result.data[0] if result.data else None
    
    def delete_payment(self, payment_id: int) -> bool:
        result = self.supabase.table('maintenance_payments').delete().eq('id', payment_id).execute()
        return len(result.data) > 0
    
    # Expenditures operations
    def create_expenditure(self, expenditure_data: Dict[str, Any]) -> Dict[str, Any]:
        result = self.supabase.table('expenditures').insert(expenditure_data).execute()
        return result.data[0] if result.data else None
    
    def get_expenditures(self, limit: int = 1000) -> List[Dict[str, Any]]:
        result = self.supabase.table('expenditures').select('*').limit(limit).execute()
        return result.data or []
    
    def get_expenditure_by_id(self, expenditure_id: int) -> Optional[Dict[str, Any]]:
        result = self.supabase.table('expenditures').select('*').eq('id', expenditure_id).execute()
        return result.data[0] if result.data else None
    
    def update_expenditure(self, expenditure_id: int, update_data: Dict[str, Any]) -> Dict[str, Any]:
        result = self.supabase.table('expenditures').update(update_data).eq('id', expenditure_id).execute()
        return result.data[0] if result.data else None
    
    def delete_expenditure(self, expenditure_id: int) -> bool:
        result = self.supabase.table('expenditures').delete().eq('id', expenditure_id).execute()
        return len(result.data) > 0

# Global database instance
db = SupabaseDB()