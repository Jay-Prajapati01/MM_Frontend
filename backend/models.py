from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

def get_current_timestamp():
    return datetime.utcnow().isoformat() + 'Z'

# Pydantic Models for API
class House(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    houseNo: str
    block: str
    floor: str
    status: str = Field(default="vacant")  # occupied, vacant, maintenance
    notes: Optional[str] = None
    ownerName: Optional[str] = None
    membersCount: Optional[int] = 0
    vehiclesCount: Optional[int] = 0
    createdAt: str = Field(default_factory=get_current_timestamp)
    updatedAt: str = Field(default_factory=get_current_timestamp)

class HouseCreate(BaseModel):
    houseNo: str
    block: str
    floor: str
    status: str = "vacant"
    notes: Optional[str] = None
    ownerName: Optional[str] = None

class HouseUpdate(BaseModel):
    houseNo: Optional[str] = None
    block: Optional[str] = None
    floor: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    ownerName: Optional[str] = None
    membersCount: Optional[int] = None
    vehiclesCount: Optional[int] = None

class Member(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    house: str  # houseNo reference
    role: str  # Owner, Tenant, Family Member
    relationship: Optional[str] = None  # Owner, Father, Mother, Son, Daughter, Spouse, Other
    phone: str
    email: Optional[str] = None
    status: str = "active"  # active, inactive
    createdAt: str = Field(default_factory=get_current_timestamp)
    updatedAt: str = Field(default_factory=get_current_timestamp)

class MemberCreate(BaseModel):
    name: str
    house: str
    role: str
    relationship: Optional[str] = None
    phone: str
    email: Optional[str] = None
    status: str = "active"

class MemberUpdate(BaseModel):
    name: Optional[str] = None
    house: Optional[str] = None
    role: Optional[str] = None
    relationship: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None

class Vehicle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    number: str  # vehicle number
    type: str  # Two Wheeler, Four Wheeler
    brandModel: Optional[str] = None
    color: Optional[str] = None
    ownerName: Optional[str] = None
    house: str  # houseNo reference
    registrationDate: Optional[str] = None
    status: str = "active"  # active, inactive
    createdAt: str = Field(default_factory=get_current_timestamp)
    updatedAt: str = Field(default_factory=get_current_timestamp)

class VehicleCreate(BaseModel):
    number: str
    type: str
    brandModel: Optional[str] = None
    color: Optional[str] = None
    ownerName: Optional[str] = None
    house: str
    registrationDate: Optional[str] = None
    status: str = "active"

class VehicleUpdate(BaseModel):
    number: Optional[str] = None
    type: Optional[str] = None
    brandModel: Optional[str] = None
    color: Optional[str] = None
    ownerName: Optional[str] = None
    house: Optional[str] = None
    registrationDate: Optional[str] = None
    status: Optional[str] = None

class MaintenancePayment(BaseModel):
    id: int  # incremental id
    house: str  # houseNo
    owner: str
    amount: float
    amountPaid: float = 0
    month: str  # first month label
    monthRange: Optional[str] = None
    fromMonth: Optional[str] = None
    toMonth: Optional[str] = None
    fromMonthRaw: Optional[str] = None
    toMonthRaw: Optional[str] = None
    monthsCount: Optional[int] = 1
    latePayment: Optional[bool] = False
    dueDate: str  # YYYY-MM-DD
    paidDate: Optional[str] = None
    status: str = "pending"  # pending, partial, paid, overdue
    method: Optional[str] = None
    remarks: Optional[str] = None
    createdAt: str = Field(default_factory=get_current_timestamp)
    updatedAt: Optional[str] = None

class MaintenancePaymentCreate(BaseModel):
    house: str
    owner: str
    amount: float
    month: str
    monthRange: Optional[str] = None
    fromMonth: Optional[str] = None
    toMonth: Optional[str] = None
    fromMonthRaw: Optional[str] = None
    toMonthRaw: Optional[str] = None
    monthsCount: Optional[int] = 1
    latePayment: Optional[bool] = False
    dueDate: str
    status: str = "pending"
    method: Optional[str] = None
    remarks: Optional[str] = None

class MaintenancePaymentUpdate(BaseModel):
    house: Optional[str] = None
    owner: Optional[str] = None
    amount: Optional[float] = None
    amountPaid: Optional[float] = None
    month: Optional[str] = None
    monthRange: Optional[str] = None
    fromMonth: Optional[str] = None
    toMonth: Optional[str] = None
    fromMonthRaw: Optional[str] = None
    toMonthRaw: Optional[str] = None
    monthsCount: Optional[int] = None
    latePayment: Optional[bool] = None
    dueDate: Optional[str] = None
    paidDate: Optional[str] = None
    status: Optional[str] = None
    method: Optional[str] = None
    remarks: Optional[str] = None

class Expenditure(BaseModel):
    id: int  # incremental id
    title: str
    category: str  # Security, Cleaning, Repairs, Utilities, Events, Maintenance, Administration, Other
    amount: float
    paymentMode: str  # Cash, Bank, Online, Vendor Transfer
    date: str  # YYYY-MM-DD
    description: Optional[str] = None
    attachmentName: Optional[str] = None
    attachmentData: Optional[str] = None  # base64 encoded
    createdAt: str = Field(default_factory=get_current_timestamp)
    updatedAt: Optional[str] = None

class ExpenditureCreate(BaseModel):
    title: str
    category: str
    amount: float
    paymentMode: str
    date: str
    description: Optional[str] = None
    attachmentName: Optional[str] = None
    attachmentData: Optional[str] = None

class ExpenditureUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    paymentMode: Optional[str] = None
    date: Optional[str] = None
    description: Optional[str] = None
    attachmentName: Optional[str] = None
    attachmentData: Optional[str] = None

# Response models
class HousesListResponse(BaseModel):
    list: List[House]
    summary: dict
    pagination: dict

class PaymentsListResponse(BaseModel):
    list: List[MaintenancePayment]
    summary: dict

class ExpendituresListResponse(BaseModel):
    list: List[Expenditure]
    summary: dict