import { House, Member, Vehicle, HousesListResponse, MaintenancePayment, PaymentsListResponse, Expenditure, ExpendituresListResponse } from '@/types/models';

// Keys
const HOUSES_KEY = 'offline.houses';
const MEMBERS_KEY = 'offline.members';
const VEHICLES_KEY = 'offline.vehicles';
const PAYMENTS_KEY = 'offline.payments';
const EXPENDITURES_KEY = 'offline.expenditures';
const ACTIVITY_KEY = 'offline.activity';
const SNAPSHOT_VERSION = 1;

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, value: T[]) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------- Activity Log ----------
export interface ActivityEntry {
  id: string;
  ts: string; // ISO timestamp
  type: 'house' | 'member' | 'vehicle' | 'payment' | 'expenditure' | 'system';
  action: string; // create | update | delete | paid | generate | other
  summary: string; // short human readable line
  user?: string; // actor (static 'Admin' for now)
  amount?: number; // positive income, negative expense
  entityId?: string | number;
  meta?: any;
}

function readActivity(): ActivityEntry[] {
  return readArray<ActivityEntry>(ACTIVITY_KEY).sort((a,b)=> b.ts.localeCompare(a.ts));
}

function writeActivity(list: ActivityEntry[]) { writeArray<ActivityEntry>(ACTIVITY_KEY, list); }

export function appendActivity(entry: Omit<ActivityEntry,'id'|'ts'>) {
  const list = readActivity();
  const rec: ActivityEntry = { id: id(), ts: now(), ...entry };
  list.unshift(rec);
  // Keep last 1000 entries to avoid unbounded growth
  writeActivity(list.slice(0,1000));
  return rec;
}

export async function lsFetchActivity(): Promise<{ list: ActivityEntry[] }> {
  ensureSeed();
  return { list: readActivity() };
}

function now() {
  return new Date().toISOString();
}

function id() {
  return Math.random().toString(36).slice(2, 10);
}

export function ensureSeed() {
  if (!localStorage.getItem(HOUSES_KEY)) {
    const houses: House[] = [
      { _id: id(), houseNo: 'A-101', block: 'A', floor: 1, status: 'occupied', notes: 'Corner flat', membersCount: 3, vehiclesCount: 1, createdAt: now(), updatedAt: now() },
      { _id: id(), houseNo: 'A-102', block: 'A', floor: 1, status: 'vacant', createdAt: now(), updatedAt: now(), membersCount: 0, vehiclesCount: 0 },
      { _id: id(), houseNo: 'B-201', block: 'B', floor: 2, status: 'occupied', createdAt: now(), updatedAt: now(), membersCount: 2, vehiclesCount: 2 },
    ];
    writeArray(HOUSES_KEY, houses);
  }
  if (!localStorage.getItem(MEMBERS_KEY)) {
    const members: Member[] = [
      { _id: id(), name: 'Neha Sharma', house: 'A-101', role: 'Owner', phone: '9876543210', email: 'neha@example.com', status: 'active', createdAt: now(), updatedAt: now() },
      { _id: id(), name: 'Rahul Sharma', house: 'A-101', role: 'Family Member', phone: '9876543211', status: 'active', createdAt: now(), updatedAt: now() },
      { _id: id(), name: 'Suresh Patel', house: 'B-201', role: 'Tenant', phone: '9822001100', status: 'active', createdAt: now(), updatedAt: now() },
    ];
    writeArray(MEMBERS_KEY, members);
  }
  if (!localStorage.getItem(VEHICLES_KEY)) {
    const vehicles: Vehicle[] = [
      { _id: id(), number: 'GJ01AB1234', type: 'Four Wheeler', ownerName: 'Neha Sharma', house: 'A-101', createdAt: now(), updatedAt: now() },
      { _id: id(), number: 'GJ01ZZ9999', type: 'Two Wheeler', ownerName: 'Suresh Patel', house: 'B-201', createdAt: now(), updatedAt: now() },
    ];
    writeArray(VEHICLES_KEY, vehicles);
  }
  if (!localStorage.getItem(PAYMENTS_KEY)) {
    writeArray(PAYMENTS_KEY, [] as MaintenancePayment[]);
  }
  if (!localStorage.getItem(EXPENDITURES_KEY)) {
    writeArray(EXPENDITURES_KEY, [] as Expenditure[]);
  }
}

// Houses API
export async function lsFetchHouses(): Promise<HousesListResponse> {
  ensureSeed();
  let houses = readArray<House>(HOUSES_KEY);
  const members = readArray<Member>(MEMBERS_KEY);
  const vehicles = readArray<Vehicle>(VEHICLES_KEY);

  // Recompute counts & occupancy status dynamically
  houses = houses.map(h => {
    const relatedMembers = members.filter(m => m.house === h.houseNo);
    const actualMembersCount = relatedMembers.length;
    const actualVehiclesCount = vehicles.filter(v => v.house === h.houseNo).length;

    // Determine owner name: role Owner preferred, else first member name
    let ownerName: string | undefined = undefined;
    const ownerMember = relatedMembers.find(m => m.role === 'Owner');
    if (ownerMember) ownerName = ownerMember.name;
    else if (relatedMembers[0]) ownerName = relatedMembers[0].name;

    // Use actual counts if there are members/vehicles, otherwise preserve stored initial counts
    const membersCount = actualMembersCount > 0 ? actualMembersCount : (h.membersCount || 0);
    const vehiclesCount = actualVehiclesCount > 0 ? actualVehiclesCount : (h.vehiclesCount || 0);

    let status: House['status'] = h.status || 'vacant';
    if (h.status === 'maintenance') {
      status = 'maintenance';
    } else if (membersCount > 0) {
      status = 'occupied';
    } else if (membersCount === 0 && (h.status === 'occupied' || h.status === 'vacant')) {
      status = h.status;
    }
    return { ...h, membersCount, vehiclesCount, status, ownerName };
  });
  writeArray(HOUSES_KEY, houses); // persist updated status

  const summary = {
    total: houses.length,
    occupied: houses.filter(h => h.status === 'occupied').length,
    vacant: houses.filter(h => h.status === 'vacant').length,
  };
  return {
    list: houses,
    summary,
    pagination: { total: houses.length, page: 1, pageSize: houses.length },
  };
}

export async function lsCreateHouse(payload: Partial<House>): Promise<House> {
  const houses = readArray<House>(HOUSES_KEY);
  const newHouse: House = {
    _id: id(),
    houseNo: String(payload.houseNo).trim(),
    block: String(payload.block).trim(),
    floor: payload.floor ?? '',
    status: payload.membersCount && payload.membersCount > 0 ? 'occupied' : (payload.status || 'vacant'),
    notes: payload.notes?.trim() || undefined,
    membersCount: typeof payload.membersCount === 'number' ? payload.membersCount : 0,
    vehiclesCount: typeof payload.vehiclesCount === 'number' ? payload.vehiclesCount : 0,
    createdAt: now(),
    updatedAt: now(),
  };
  houses.push(newHouse);
  writeArray(HOUSES_KEY, houses);
  appendActivity({
    type: 'house',
    action: 'create',
    summary: `House ${newHouse.houseNo} created`,
    user: 'Admin',
    entityId: newHouse._id,
    meta: { houseNo: newHouse.houseNo, block: newHouse.block }
  });
  return newHouse;
}

// Members
export async function lsFetchMembers(): Promise<Member[]> {
  ensureSeed();
  return readArray<Member>(MEMBERS_KEY);
}

export async function lsCreateMember(payload: Partial<Member>): Promise<Member> {
  const members = readArray<Member>(MEMBERS_KEY);
  const houses = readArray<House>(HOUSES_KEY);
  const newMember: Member = {
    _id: id(),
    name: String(payload.name).trim(),
    house: String(payload.house).trim(),
    role: (payload.role as any) || 'Owner',
    relationship: (payload.relationship as any) || (payload.role as any) || 'Owner',
    phone: String(payload.phone || ''),
    email: payload.email?.trim() || undefined,
    status: (payload.status as any) || 'active',
    createdAt: now(),
    updatedAt: now(),
  };
  members.push(newMember);
  writeArray(MEMBERS_KEY, members);

  // Update house status if needed
  const idx = houses.findIndex(h => h.houseNo === newMember.house);
  if (idx >= 0) {
    const mCount = members.filter(m => m.house === newMember.house).length;
    houses[idx] = { ...houses[idx], membersCount: mCount, status: mCount > 0 ? 'occupied' : 'vacant', updatedAt: now() };
    writeArray(HOUSES_KEY, houses);
  }

  appendActivity({
    type: 'member',
    action: 'create',
    summary: `Member ${newMember.name} added to ${newMember.house}`,
    user: 'Admin',
    entityId: newMember._id,
    meta: { house: newMember.house, role: newMember.role }
  });

  return newMember;
}

// Vehicles
export async function lsFetchVehicles(): Promise<Vehicle[]> {
  ensureSeed();
  let vehicles = readArray<Vehicle>(VEHICLES_KEY);
  // Normalize legacy fields
  vehicles = vehicles.map(v => ({
    ...v,
    status: v.status || 'active',
  }));
  writeArray(VEHICLES_KEY, vehicles);
  return vehicles;
}

export async function lsCreateVehicle(payload: any): Promise<Vehicle> {
  const vehicles = readArray<Vehicle>(VEHICLES_KEY);
  const houses = readArray<House>(HOUSES_KEY);
  const newVehicle: Vehicle = {
    _id: id(),
    number: String(payload.vehicleNumber || payload.number || '').trim(),
    type: (payload.type === 'Four Wheeler' || payload.type === 'Two Wheeler') ? payload.type : 'Two Wheeler',
    brandModel: payload.brandModel?.trim(),
    color: payload.color?.trim(),
    ownerName: (payload.ownerName || payload.owner || '').trim() || undefined,
    house: String(payload.house || ''),
    registrationDate: payload.registrationDate || payload.regDate || now().slice(0,10),
    status: payload.status || 'active',
    createdAt: now(),
    updatedAt: now(),
  };
  vehicles.push(newVehicle);
  writeArray(VEHICLES_KEY, vehicles);

  // Update related house vehiclesCount
  const hIdx = houses.findIndex(h => h.houseNo === newVehicle.house);
  if (hIdx >= 0) {
    const vCount = vehicles.filter(v => v.house === newVehicle.house).length;
    houses[hIdx] = { ...houses[hIdx], vehiclesCount: vCount, updatedAt: now() };
    writeArray(HOUSES_KEY, houses);
  }

  appendActivity({
    type: 'vehicle',
    action: 'create',
    summary: `Vehicle ${newVehicle.number} registered (${newVehicle.type})`,
    user: 'Admin',
    entityId: newVehicle._id,
    meta: { house: newVehicle.house, type: newVehicle.type }
  });

  return newVehicle;
}

export async function lsUpdateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
  const vehicles = readArray<Vehicle>(VEHICLES_KEY);
  const houses = readArray<House>(HOUSES_KEY);
  const idx = vehicles.findIndex(v => v._id === id);
  if (idx < 0) throw new Error('Vehicle not found');
  const existing = vehicles[idx];
  // prevent duplicate number if changed
  if (updates.number && updates.number !== existing.number) {
    if (vehicles.some(v => v.number.toLowerCase() === updates.number!.toLowerCase())) {
      throw new Error('Vehicle number already exists');
    }
  }
  const merged: Vehicle = {
    ...existing,
    ...updates,
    number: (updates.number || existing.number).trim(),
    type: updates.type || existing.type,
    color: updates.color !== undefined ? updates.color : existing.color,
    ownerName: updates.ownerName !== undefined ? updates.ownerName : existing.ownerName,
    house: updates.house || existing.house,
    status: updates.status || existing.status || 'active',
    updatedAt: now(),
  };
  vehicles[idx] = merged;
  writeArray(VEHICLES_KEY, vehicles);
  // If house changed, update counts for old and new houses
  if (updates.house && updates.house !== existing.house) {
    const all = readArray<Vehicle>(VEHICLES_KEY);
    const houseNos = [existing.house, updates.house];
    const housesArr = houses.map(h => {
      if (houseNos.includes(h.houseNo)) {
        const vCount = all.filter(v => v.house === h.houseNo).length;
        return { ...h, vehiclesCount: vCount, updatedAt: now() };
      }
      return h;
    });
    writeArray(HOUSES_KEY, housesArr);
  } else {
    // Update same house count
    const vCount = vehicles.filter(v => v.house === merged.house).length;
    const hIdx = houses.findIndex(h => h.houseNo === merged.house);
    if (hIdx >= 0) {
      houses[hIdx] = { ...houses[hIdx], vehiclesCount: vCount, updatedAt: now() };
      writeArray(HOUSES_KEY, houses);
    }
  }
  appendActivity({
    type: 'vehicle',
    action: 'update',
    summary: `Vehicle ${merged.number} updated`,
    user: 'Admin',
    entityId: merged._id,
    meta: { changes: updates }
  });
  return merged;
}

export async function lsDeleteVehicle(id: string): Promise<void> {
  const vehicles = readArray<Vehicle>(VEHICLES_KEY);
  const houses = readArray<House>(HOUSES_KEY);
  const idx = vehicles.findIndex(v => v._id === id);
  if (idx < 0) throw new Error('Vehicle not found');
  const removed = vehicles[idx];
  vehicles.splice(idx,1);
  writeArray(VEHICLES_KEY, vehicles);
  // Update affected house vehiclesCount
  const hIdx = houses.findIndex(h => h.houseNo === removed.house);
  if (hIdx >= 0) {
    const vCount = vehicles.filter(v => v.house === removed.house).length;
    houses[hIdx] = { ...houses[hIdx], vehiclesCount: vCount, updatedAt: now() };
    writeArray(HOUSES_KEY, houses);
  }
  appendActivity({
    type: 'vehicle',
    action: 'delete',
    summary: `Vehicle ${removed.number} deleted`,
    user: 'Admin',
    entityId: removed._id,
    meta: { house: removed.house }
  });
}

export function resetOfflineData() {
  localStorage.removeItem(HOUSES_KEY);
  localStorage.removeItem(MEMBERS_KEY);
  localStorage.removeItem(VEHICLES_KEY);
  localStorage.removeItem(PAYMENTS_KEY);
  localStorage.removeItem(EXPENDITURES_KEY);
}

// ---------------- Backup / Export / Import ----------------

export interface OfflineSnapshot {
  version: number;
  exportedAt: string;
  houses: House[];
  members: Member[];
  vehicles: Vehicle[];
  payments: MaintenancePayment[];
  expenditures: Expenditure[];
}

export function exportOfflineSnapshot(): OfflineSnapshot {
  ensureSeed();
  return {
    version: SNAPSHOT_VERSION,
    exportedAt: now(),
    houses: readArray<House>(HOUSES_KEY),
    members: readArray<Member>(MEMBERS_KEY),
    vehicles: readArray<Vehicle>(VEHICLES_KEY),
    payments: readArray<MaintenancePayment>(PAYMENTS_KEY),
    expenditures: readArray<Expenditure>(EXPENDITURES_KEY),
  };
}

export interface ImportOptions { mode?: 'replace' | 'merge'; }

export function importOfflineSnapshot(snapshot: OfflineSnapshot, opts: ImportOptions = {}): { houses: number; members: number; vehicles: number; payments: number; expenditures: number; } {
  const mode = opts.mode || 'replace';
  if (!snapshot || typeof snapshot !== 'object') throw new Error('Invalid snapshot');
  if (snapshot.version > SNAPSHOT_VERSION) throw new Error('Snapshot version is newer than supported');

  if (mode === 'replace') {
    writeArray(HOUSES_KEY, snapshot.houses || []);
    writeArray(MEMBERS_KEY, snapshot.members || []);
    writeArray(VEHICLES_KEY, snapshot.vehicles || []);
    writeArray(PAYMENTS_KEY, snapshot.payments || []);
    writeArray(EXPENDITURES_KEY, snapshot.expenditures || []);
  } else {
    // merge: append non-duplicate entries based on primary identifiers
    const houses = readArray<House>(HOUSES_KEY);
    const members = readArray<Member>(MEMBERS_KEY);
    const vehicles = readArray<Vehicle>(VEHICLES_KEY);
    const payments = readArray<MaintenancePayment>(PAYMENTS_KEY);
    const expenditures = readArray<Expenditure>(EXPENDITURES_KEY);

    const houseNos = new Set(houses.map(h=> h.houseNo.toLowerCase()));
    const memberIds = new Set(members.map(m=> m._id));
    const vehicleNums = new Set(vehicles.map(v=> v.number.toLowerCase()));
    const paymentIds = new Set(payments.map(p=> p.id));
    const expenditureIds = new Set(expenditures.map(e=> e.id));

    const mergedHouses = [...houses, ...snapshot.houses.filter(h => !houseNos.has(h.houseNo.toLowerCase()))];
    const mergedMembers = [...members, ...snapshot.members.filter(m => !memberIds.has(m._id))];
    const mergedVehicles = [...vehicles, ...snapshot.vehicles.filter(v => !vehicleNums.has(v.number.toLowerCase()))];
    const mergedPayments = [...payments, ...snapshot.payments.filter(p => !paymentIds.has(p.id))];
    const mergedExpenditures = [...expenditures, ...(snapshot.expenditures || []).filter(e => !expenditureIds.has(e.id))];

    writeArray(HOUSES_KEY, mergedHouses);
    writeArray(MEMBERS_KEY, mergedMembers);
    writeArray(VEHICLES_KEY, mergedVehicles);
    writeArray(PAYMENTS_KEY, mergedPayments);
    writeArray(EXPENDITURES_KEY, mergedExpenditures);
  }

  return {
    houses: readArray<House>(HOUSES_KEY).length,
    members: readArray<Member>(MEMBERS_KEY).length,
    vehicles: readArray<Vehicle>(VEHICLES_KEY).length,
    payments: readArray<MaintenancePayment>(PAYMENTS_KEY).length,
    expenditures: readArray<Expenditure>(EXPENDITURES_KEY).length,
  };
}

export async function lsUpdateHouse(id: string, updates: Partial<House>): Promise<House> {
  const houses = readArray<House>(HOUSES_KEY);
  const idx = houses.findIndex(h => h._id === id || h.houseNo === id);
  if (idx < 0) throw new Error('House not found');
  const existing = houses[idx];
  // Prevent changing houseNo to duplicate
  if (updates.houseNo && updates.houseNo !== existing.houseNo) {
    if (houses.some(h => h.houseNo === updates.houseNo)) throw new Error('House number already exists');
  }
  const merged: House = {
    ...existing,
    ...updates,
    houseNo: (updates.houseNo || existing.houseNo).trim(),
    block: (updates.block || existing.block).trim(),
    floor: updates.floor !== undefined ? updates.floor : existing.floor,
    status: updates.status || existing.status,
    membersCount: updates.membersCount !== undefined ? updates.membersCount : existing.membersCount,
    vehiclesCount: updates.vehiclesCount !== undefined ? updates.vehiclesCount : existing.vehiclesCount,
    notes: updates.notes?.trim() || existing.notes,
    updatedAt: now(),
  };
  houses[idx] = merged;
  writeArray(HOUSES_KEY, houses);
  appendActivity({
    type: 'house',
    action: 'update',
    summary: `House ${merged.houseNo} updated`,
    user: 'Admin',
    entityId: merged._id,
    meta: { changes: updates }
  });
  return merged;
}

export async function lsUpdateMember(id: string, updates: Partial<Member>): Promise<Member> {
  const members = readArray<Member>(MEMBERS_KEY);
  const idx = members.findIndex(m => m._id === id);
  if (idx < 0) throw new Error('Member not found');
  const existing = members[idx];
  const merged: Member = {
    ...existing,
    ...updates,
    name: (updates.name || existing.name).trim(),
    house: updates.house || existing.house,
    role: updates.role || existing.role,
  relationship: updates.relationship || existing.relationship || (existing.role === 'Tenant' ? 'Other' : (existing.role as any)),
    phone: updates.phone || existing.phone,
    email: updates.email !== undefined ? updates.email : existing.email,
    status: updates.status || existing.status,
    updatedAt: now(),
  };
  members[idx] = merged;
  writeArray(MEMBERS_KEY, members);
  appendActivity({
    type: 'member',
    action: 'update',
    summary: `Member ${merged.name} updated`,
    user: 'Admin',
    entityId: merged._id,
    meta: { changes: updates }
  });
  return merged;
}

export async function lsDeleteMember(id: string): Promise<void> {
  const members = readArray<Member>(MEMBERS_KEY);
  const idx = members.findIndex(m => m._id === id);
  if (idx < 0) throw new Error('Member not found');
  const removed = members[idx];
  members.splice(idx, 1);
  writeArray(MEMBERS_KEY, members);
  appendActivity({
    type: 'member',
    action: 'delete',
    summary: `Member ${removed.name} removed`,
    user: 'Admin',
    entityId: removed._id,
    meta: { house: removed.house }
  });
}

export async function lsDeleteHouse(id: string): Promise<void> {
  const houses = readArray<House>(HOUSES_KEY);
  const idx = houses.findIndex(h => h._id === id || h.houseNo === id);
  if (idx < 0) throw new Error('House not found');
  houses.splice(idx, 1);
  writeArray(HOUSES_KEY, houses);
  appendActivity({
    type: 'house',
    action: 'delete',
    summary: `House deleted`,
    user: 'Admin',
    entityId: id,
    meta: { id }
  });
}

// ---------------- Maintenance Payments (offline) ----------------

function computePaymentSummary(list: MaintenancePayment[]): PaymentsListResponse['summary'] {
  // Revised semantics (per user request):
  // PENDING: Full amount for records where amountPaid == 0 (not started) regardless of date and not late.
  // LATE PAYMENT: Full amount for records that are fully paid (status paid) AND latePayment === true.
  // Partials are ignored for both cards (can be added later if needed).
  const total = list.reduce((s,p)=> s + p.amount, 0);
  const collected = list.filter(p=> p.status === 'paid').reduce((s,p)=> s + p.amountPaid, 0);
  const pendingAmount = list.filter(p => p.amountPaid === 0).reduce((s,p)=> s + p.amount, 0);
  const lateAmount = list.filter(p => p.status === 'paid' && p.latePayment).reduce((s,p)=> s + p.amount, 0);
  const collectionRate = total === 0 ? 0 : Math.round((collected/total)*100);
  return { total, collected, pending: pendingAmount, overdue: lateAmount, collectionRate };
}

export async function lsFetchPayments(): Promise<PaymentsListResponse> {
  ensureSeed();
  let payments = readArray<MaintenancePayment>(PAYMENTS_KEY);
  // Overdue recalculation
  const today = new Date().toISOString().slice(0,10);
  let changed = false;
  payments = payments.map(p => {
    if ((p.status === 'pending' || p.status === 'partial') && p.dueDate && p.dueDate < today) {
      changed = true; return { ...p, status: 'overdue' };
    }
    return p;
  });
  if (changed) writeArray(PAYMENTS_KEY, payments);
  return { list: payments.sort((a,b)=> b.id - a.id), summary: computePaymentSummary(payments) };
}

export interface CreatePaymentInput {
  house: string; owner: string; amount: number; amountPaid: number; fromMonthRaw: string; toMonthRaw: string; monthsCount: number; latePayment: boolean; month: string; monthRange: string; fromMonth: string; toMonth: string; paymentDate: string; method: string | null; remarks?: string;
}

export async function lsCreatePayment(payload: CreatePaymentInput): Promise<MaintenancePayment> {
  const payments = readArray<MaintenancePayment>(PAYMENTS_KEY);
  const newId = payments.length ? Math.max(...payments.map(p=> p.id)) + 1 : 1;
  const dueDate = new Date(); dueDate.setDate(5);
  const status: MaintenancePayment['status'] = payload.amountPaid === 0 ? 'pending' : payload.amountPaid < payload.amount ? 'partial' : 'paid';
  const record: MaintenancePayment = {
    id: newId,
    house: payload.house.toUpperCase(),
    owner: payload.owner,
    amount: payload.amount,
    amountPaid: payload.amountPaid,
    month: payload.month,
    monthRange: payload.monthRange,
    fromMonth: payload.fromMonth,
    toMonth: payload.toMonth,
    fromMonthRaw: payload.fromMonthRaw,
    toMonthRaw: payload.toMonthRaw,
    monthsCount: payload.monthsCount,
    latePayment: payload.latePayment,
    dueDate: new Date(dueDate.getFullYear(), dueDate.getMonth(), 5).toISOString().slice(0,10),
    paidDate: payload.amountPaid > 0 ? payload.paymentDate : null,
    status,
    method: payload.method,
    remarks: payload.remarks || '',
    createdAt: now(),
  };
  payments.push(record);
  writeArray(PAYMENTS_KEY, payments);
  appendActivity({
    type: 'payment',
    action: 'create',
    summary: `Payment record for ${record.house} (${record.monthRange}) created`,
    user: 'Admin',
    entityId: record.id,
    amount: record.amountPaid > 0 ? record.amountPaid : 0,
    meta: { amount: record.amount, amountPaid: record.amountPaid, status: record.status }
  });
  return record;
}

export async function lsUpdatePayment(id: number, updates: Partial<MaintenancePayment>): Promise<MaintenancePayment> {
  const payments = readArray<MaintenancePayment>(PAYMENTS_KEY);
  const idx = payments.findIndex(p => p.id === id);
  if (idx < 0) throw new Error('Payment not found');
  const existing = payments[idx];
  const merged: MaintenancePayment = { ...existing, ...updates, updatedAt: now() };
  // Recompute status if amounts changed
  if (updates.amountPaid !== undefined || updates.amount !== undefined) {
    if (merged.amountPaid === 0) merged.status = 'pending';
    else if (merged.amountPaid < merged.amount) merged.status = 'partial';
    else merged.status = 'paid';
  }
  payments[idx] = merged;
  writeArray(PAYMENTS_KEY, payments);
  appendActivity({
    type: 'payment',
    action: 'update',
    summary: `Payment ${merged.id} updated (${merged.status})`,
    user: 'Admin',
    entityId: merged.id,
    amount: merged.amountPaid - existing.amountPaid || 0,
    meta: { changes: updates }
  });
  return merged;
}

export async function lsDeletePayment(id: number): Promise<void> {
  const payments = readArray<MaintenancePayment>(PAYMENTS_KEY);
  const idx = payments.findIndex(p => p.id === id);
  if (idx < 0) throw new Error('Payment not found');
  const removed = payments[idx];
  payments.splice(idx,1);
  writeArray(PAYMENTS_KEY, payments);
  appendActivity({
    type: 'payment',
    action: 'delete',
    summary: `Payment ${removed.id} deleted`,
    user: 'Admin',
    entityId: removed.id,
    meta: { house: removed.house, month: removed.month }
  });
}

export async function lsGenerateMonthlyPayments(defaultAmount: number): Promise<number> {
  const payments = readArray<MaintenancePayment>(PAYMENTS_KEY);
  const houses = readArray<House>(HOUSES_KEY);
  const members = readArray<Member>(MEMBERS_KEY);
  const currentMonthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const existingKeys = new Set(payments.map(p => `${p.house}-${p.month}`));
  const ownerByHouse: Record<string,string> = {};
  members.forEach(m => { if (m.role==='Owner' && !ownerByHouse[m.house.toUpperCase()]) ownerByHouse[m.house.toUpperCase()] = m.name; });
  let added = 0;
  houses.forEach(h => {
    if (h.status === 'occupied') {
      const key = `${h.houseNo}-${currentMonthLabel}`;
      if (!existingKeys.has(key)) {
        const owner = ownerByHouse[h.houseNo.toUpperCase()] || h.ownerName || '';
        const dueDate = new Date(); dueDate.setDate(5);
        const rec: MaintenancePayment = {
          id: payments.length ? Math.max(...payments.map(p=> p.id)) + added + 1 : 1 + added,
          house: h.houseNo.toUpperCase(),
          owner,
          amount: defaultAmount,
          amountPaid: 0,
          month: currentMonthLabel,
          fromMonth: currentMonthLabel,
          toMonth: currentMonthLabel,
            fromMonthRaw: new Date().toISOString().slice(0,7),
            toMonthRaw: new Date().toISOString().slice(0,7),
          monthsCount: 1,
          latePayment: false,
          monthRange: currentMonthLabel,
          dueDate: new Date(dueDate.getFullYear(), dueDate.getMonth(), 5).toISOString().slice(0,10),
          paidDate: null,
          status: 'pending',
          method: null,
          remarks: '',
          createdAt: now(),
        };
        payments.push(rec);
        added++;
      }
    }
  });
  if (added>0) writeArray(PAYMENTS_KEY, payments);
  if (added>0) {
    appendActivity({
      type: 'payment',
      action: 'generate',
      summary: `Generated ${added} monthly payments`,
      user: 'Admin',
      meta: { month: currentMonthLabel, count: added }
    });
  }
  return added;
}

// ---------------- Expenditures (offline) ----------------

function computeExpenditureSummary(expenditures: Expenditure[], payments: MaintenancePayment[]): ExpendituresListResponse['summary'] {
  const totalExpenditure = expenditures.reduce((s, e) => s + e.amount, 0);
  const totalCollection = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amountPaid, 0);
  const remainingBalance = totalCollection - totalExpenditure;
  
  const categoryBreakdown = expenditures.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  
  return {
    totalExpenditure,
    totalCollection,
    remainingBalance,
    categoryBreakdown,
  };
}

export async function lsFetchExpenditures(): Promise<ExpendituresListResponse> {
  ensureSeed();
  const expenditures = readArray<Expenditure>(EXPENDITURES_KEY);
  const payments = readArray<MaintenancePayment>(PAYMENTS_KEY);
  
  return {
    list: expenditures.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    summary: computeExpenditureSummary(expenditures, payments),
  };
}

export interface CreateExpenditureInput {
  title: string;
  category: Expenditure['category'];
  amount: number;
  paymentMode: Expenditure['paymentMode'];
  date: string;
  description?: string;
  attachmentName?: string;
  attachmentData?: string;
}

export async function lsCreateExpenditure(payload: CreateExpenditureInput): Promise<Expenditure> {
  const expenditures = readArray<Expenditure>(EXPENDITURES_KEY);
  const newId = expenditures.length ? Math.max(...expenditures.map(e => e.id)) + 1 : 1;
  
  const record: Expenditure = {
    id: newId,
    title: payload.title.trim(),
    category: payload.category,
    amount: payload.amount,
    paymentMode: payload.paymentMode,
    date: payload.date,
    description: payload.description?.trim() || undefined,
    attachmentName: payload.attachmentName,
    attachmentData: payload.attachmentData,
    createdAt: now(),
  };
  
  expenditures.push(record);
  writeArray(EXPENDITURES_KEY, expenditures);
  appendActivity({
    type: 'expenditure',
    action: 'create',
    summary: `Expense: ${record.title} (-${record.amount})`,
    user: 'Admin',
    entityId: record.id,
    amount: -record.amount,
    meta: { category: record.category }
  });
  return record;
}

export async function lsUpdateExpenditure(id: number, updates: Partial<Expenditure>): Promise<Expenditure> {
  const expenditures = readArray<Expenditure>(EXPENDITURES_KEY);
  const idx = expenditures.findIndex(e => e.id === id);
  if (idx < 0) throw new Error('Expenditure not found');
  
  const existing = expenditures[idx];
  const merged: Expenditure = {
    ...existing,
    ...updates,
    title: updates.title?.trim() || existing.title,
    description: updates.description !== undefined ? updates.description?.trim() : existing.description,
    updatedAt: now(),
  };
  
  expenditures[idx] = merged;
  writeArray(EXPENDITURES_KEY, expenditures);
  appendActivity({
    type: 'expenditure',
    action: 'update',
    summary: `Expense ${merged.id} updated`,
    user: 'Admin',
    entityId: merged.id,
    meta: { changes: updates }
  });
  return merged;
}

export async function lsDeleteExpenditure(id: number): Promise<void> {
  const expenditures = readArray<Expenditure>(EXPENDITURES_KEY);
  const idx = expenditures.findIndex(e => e.id === id);
  if (idx < 0) throw new Error('Expenditure not found');
  const removed = expenditures[idx];
  expenditures.splice(idx, 1);
  writeArray(EXPENDITURES_KEY, expenditures);
  appendActivity({
    type: 'expenditure',
    action: 'delete',
    summary: `Expense ${removed.id} deleted`,
    user: 'Admin',
    entityId: removed.id,
    amount: 0,
    meta: { title: removed.title }
  });
}