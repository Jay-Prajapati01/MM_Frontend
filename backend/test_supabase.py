#!/usr/bin/env python3
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

print("Environment variables:")
print(f"SUPABASE_URL: {os.getenv('SUPABASE_URL')}")
print(f"SUPABASE_SERVICE_ROLE_KEY: {os.getenv('SUPABASE_SERVICE_ROLE_KEY', 'NOT_SET')[:20]}...")
print(f"SUPABASE_ANON_KEY: {os.getenv('SUPABASE_ANON_KEY', 'NOT_SET')[:20]}...")

try:
    from supabase import create_client, Client
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if url and key:
        print("Creating Supabase client...")
        supabase: Client = create_client(url, key)
        print("✓ Supabase client created successfully")
        
        # Test basic connection
        result = supabase.table('test_connection').select('*').limit(1).execute()
        print("✓ Connection test successful")
    else:
        print("✗ Missing Supabase credentials")
        
except Exception as e:
    print(f"✗ Error: {e}")