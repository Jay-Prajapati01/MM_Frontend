// Offline localStorage-backed API layer
// This file preserves previous export names to avoid widespread refactors.

import { lsFetchHouses, lsCreateHouse, lsUpdateHouse, lsDeleteHouse, lsFetchMembers, lsCreateMember, lsUpdateMember, lsDeleteMember, lsFetchVehicles, lsCreateVehicle, lsUpdateVehicle, lsDeleteVehicle, lsFetchPayments, lsCreatePayment, lsUpdatePayment, lsDeletePayment, lsGenerateMonthlyPayments, exportOfflineSnapshot, importOfflineSnapshot, resetOfflineData } from '@/lib/storage';
import type { House } from '@/types/models';

// Houses list
export const fetchHouses = async () => lsFetchHouses();

// Members
export const fetchMembers = async () => lsFetchMembers();
export const createMember = async (payload: any) => lsCreateMember(payload);
export const updateMember = async (id: string, updates: any) => lsUpdateMember(id, updates);
export const deleteMember = async (id: string) => lsDeleteMember(id);

// Vehicles
export const fetchVehicles = async () => lsFetchVehicles();
export const createVehicle = async (payload: any) => lsCreateVehicle(payload);
export const updateVehicle = async (id: string, updates: any) => lsUpdateVehicle(id, updates);
export const deleteVehicle = async (id: string) => lsDeleteVehicle(id);

// Payments
export const fetchPayments = async () => lsFetchPayments();
export const createPayment = async (payload: any) => lsCreatePayment(payload);
export const updatePayment = async (id: number, updates: any) => lsUpdatePayment(id, updates);
export const deletePayment = async (id: number) => lsDeletePayment(id);
export const generateMonthlyPayments = async (defaultAmount: number) => lsGenerateMonthlyPayments(defaultAmount);

// Create House
export const createHouse = async (payload: Partial<House>) => lsCreateHouse(payload);
export const updateHouse = async (id: string, updates: Partial<House>) => lsUpdateHouse(id, updates);
export const deleteHouse = async (id: string) => lsDeleteHouse(id);

// NOTE: request/postJson removed in offline mode. If reintroducing backend, restore previous implementation.

// Backup / Restore
export const exportData = () => exportOfflineSnapshot();
export const importData = (snapshot: any, opts?: any) => importOfflineSnapshot(snapshot, opts);
export const resetData = () => resetOfflineData();
