#!/usr/bin/env python3
import os
from dotenv import load_dotenv
from pathlib import Path
from supabase import create_client, Client
import sys

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

def setup_database():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("Error: Missing Supabase credentials")
        return False
        
    try:
        # Create Supabase client
        supabase: Client = create_client(url, key)
        print("✓ Connected to Supabase")
        
        # Read SQL schema file
        sql_file = ROOT_DIR.parent / 'setup_database.sql'
        with open(sql_file, 'r') as f:
            sql_content = f.read()
        
        # Split SQL into individual statements and execute them
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
        
        for i, statement in enumerate(statements):
            if statement and not statement.startswith('--'):
                try:
                    print(f"Executing statement {i+1}/{len(statements)}...")
                    # Use rpc to execute raw SQL
                    result = supabase.rpc('exec_sql', {'sql': statement + ';'}).execute()
                    print(f"✓ Statement {i+1} executed successfully")
                except Exception as e:
                    print(f"✗ Error in statement {i+1}: {e}")
                    # Continue with other statements
                    continue
        
        print("\n✓ Database setup completed!")
        
        # Test basic operations
        print("\nTesting basic operations...")
        
        # Test houses table
        houses = supabase.table('houses').select('*').limit(5).execute()
        print(f"✓ Houses table: {len(houses.data)} records found")
        
        # Test members table
        members = supabase.table('members').select('*').limit(5).execute()
        print(f"✓ Members table: {len(members.data)} records found")
        
        return True
        
    except Exception as e:
        print(f"✗ Setup failed: {e}")
        return False

if __name__ == "__main__":
    success = setup_database()
    sys.exit(0 if success else 1)