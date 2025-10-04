-- Society Management Database Schema for Supabase

-- Enable RLS (Row Level Security)
-- Note: For this demo, we'll keep it simple without RLS, but in production you should enable it

-- Houses table
CREATE TABLE IF NOT EXISTS houses (
    id TEXT PRIMARY KEY,
    "houseNo" TEXT NOT NULL,
    block TEXT NOT NULL,
    floor TEXT NOT NULL,
    status TEXT DEFAULT 'vacant' CHECK (status IN ('occupied', 'vacant', 'maintenance')),
    notes TEXT,
    "ownerName" TEXT,
    "membersCount" INTEGER DEFAULT 0,
    "vehiclesCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Members table
CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    house TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Owner', 'Tenant', 'Family Member')),
    relationship TEXT CHECK (relationship IN ('Owner', 'Father', 'Mother', 'Son', 'Daughter', 'Spouse', 'Other')),
    phone TEXT NOT NULL,
    email TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    number TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Two Wheeler', 'Four Wheeler')),
    "brandModel" TEXT,
    color TEXT,
    "ownerName" TEXT,
    house TEXT NOT NULL,
    "registrationDate" TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance payments table
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
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
    method TEXT,
    remarks TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE
);

-- Expenditures table
CREATE TABLE IF NOT EXISTS expenditures (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Security', 'Cleaning', 'Repairs', 'Utilities', 'Events', 'Maintenance', 'Administration', 'Other')),
    amount DECIMAL NOT NULL,
    "paymentMode" TEXT NOT NULL CHECK ("paymentMode" IN ('Cash', 'Bank', 'Online', 'Vendor Transfer')),
    date TEXT NOT NULL,
    description TEXT,
    "attachmentName" TEXT,
    "attachmentData" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_houses_house_no ON houses("houseNo");
CREATE INDEX IF NOT EXISTS idx_members_house ON members(house);
CREATE INDEX IF NOT EXISTS idx_vehicles_house ON vehicles(house);
CREATE INDEX IF NOT EXISTS idx_payments_house ON maintenance_payments(house);
CREATE INDEX IF NOT EXISTS idx_payments_status ON maintenance_payments(status);
CREATE INDEX IF NOT EXISTS idx_expenditures_category ON expenditures(category);
CREATE INDEX IF NOT EXISTS idx_expenditures_date ON expenditures(date);

-- Insert some sample data
INSERT INTO houses (id, "houseNo", block, floor, status, "ownerName") VALUES
    ('house-1', 'A-101', 'A', '1', 'occupied', 'John Doe'),
    ('house-2', 'A-102', 'A', '1', 'vacant', NULL),
    ('house-3', 'B-201', 'B', '2', 'occupied', 'Jane Smith')
ON CONFLICT (id) DO NOTHING;

INSERT INTO members (id, name, house, role, phone, email, status) VALUES
    ('member-1', 'John Doe', 'A-101', 'Owner', '9876543210', 'john@example.com', 'active'),
    ('member-2', 'Jane Smith', 'B-201', 'Owner', '9876543211', 'jane@example.com', 'active')
ON CONFLICT (id) DO NOTHING;