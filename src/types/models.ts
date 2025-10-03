export interface House {
  _id: string; // generated uuid-like
  houseNo: string;
  block: string;
  floor: string | number;
  status: 'occupied' | 'vacant' | 'maintenance';
  notes?: string;
  ownerName?: string; // derived from members (role Owner preferred)
  membersCount?: number;
  vehiclesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  _id: string;
  name: string;
  house: string; // store houseNo reference for simplicity in offline mode
  role: 'Owner' | 'Tenant' | 'Family Member';
  // Relationship within the household (additional semantic info)
  relationship?: 'Owner' | 'Father' | 'Mother' | 'Son' | 'Daughter' | 'Spouse' | 'Other';
  phone: string;
  email?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  _id: string;
  number: string; // vehicleNumber normalized
  type: 'Two Wheeler' | 'Four Wheeler';
  brandModel?: string;
  color?: string;
  ownerName?: string; // stored simple string
  house: string; // houseNo reference
  registrationDate?: string;
  status?: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface MaintenancePayment {
  id: number; // incremental id for offline mode
  house: string; // houseNo uppercased
  owner: string;
  amount: number;
  amountPaid: number;
  month: string; // first month label for backward compat
  monthRange?: string; // e.g. March 2025 – May 2025
  fromMonth?: string; // display label (e.g. March 2025)
  toMonth?: string;
  fromMonthRaw?: string; // canonical YYYY-MM
  toMonthRaw?: string; // canonical YYYY-MM
  monthsCount?: number;
  latePayment?: boolean;
  dueDate: string; // YYYY-MM-DD
  paidDate: string | null;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  method: string | null;
  remarks?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentsListResponse {
  list: MaintenancePayment[];
  summary: {
    total: number; // total amount expected (sum amount)
    collected: number; // sum amountPaid where status paid
    pending: number; // pending outstanding sum
    overdue: number; // overdue outstanding sum
    collectionRate: number; // percentage
  };
}

export interface HousesListResponse {
  list: House[];
  summary: {
    total: number;
    occupied: number;
    vacant: number;
  };
  pagination: {
    total: number;
    page: number;
    pageSize: number;
  };
}

export interface Expenditure {
  id: number; // incremental id for offline mode
  title: string;
  category: 'Security' | 'Cleaning' | 'Repairs' | 'Utilities' | 'Events' | 'Maintenance' | 'Administration' | 'Other';
  amount: number;
  paymentMode: 'Cash' | 'Bank' | 'Online' | 'Vendor Transfer';
  date: string; // YYYY-MM-DD
  description?: string;
  attachmentName?: string; // filename of uploaded document
  attachmentData?: string; // base64 encoded file data for offline storage
  createdAt: string;
  updatedAt?: string;
}

export interface ExpendituresListResponse {
  list: Expenditure[];
  summary: {
    totalExpenditure: number;
    totalCollection: number; // from maintenance
    remainingBalance: number;
    categoryBreakdown: Record<string, number>;
  };
}