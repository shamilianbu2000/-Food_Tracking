export type Meal = 'BREAKFAST' | 'LUNCH' | 'DINNER';
export type Role = 'employee' | 'admin';

export interface Employee { id: string; name: string; department: string; role: Role }
export interface MealSlot { meal: Meal; start: string; end: string }
export interface Token {
  tokenId: string;
  employeeId: string;
  meal: Meal;
  date: string; // YYYY-MM-DD
  issued: boolean;
  issuedAt?: string;
}
export interface QrPayload { tokenId: string; employeeId: string; meal: Meal; date: string }
export type VerifyStatus = 'VALID' | 'ALREADY_USED' | 'WRONG_MEAL_WINDOW' | 'EXPIRED' | 'INVALID';
export interface VerifyResult { status: VerifyStatus; message: string; token?: Token; employee?: Employee }
export interface Notification { id: number; employeeId: string; message: string; at: string }

export const EMPLOYEES: Employee[] = [
  { id: 'E001', name: 'Asha Rao', department: 'Engineering', role: 'employee' },
  { id: 'E002', name: 'Ben Carter', department: 'Finance', role: 'employee' },
  { id: 'E003', name: 'Chitra Nair', department: 'HR', role: 'employee' },
  { id: 'E004', name: 'Dev Patel', department: 'Engineering', role: 'employee' },
  { id: 'E005', name: 'Elena Gomez', department: 'Operations', role: 'employee' },
  { id: 'A001', name: 'Admin Frank', department: 'Facilities', role: 'admin' },
];

export const MEAL_SLOTS: MealSlot[] = [
  { meal: 'BREAKFAST', start: '07:00', end: '10:00' },
  { meal: 'LUNCH', start: '12:00', end: '15:00' },
  { meal: 'DINNER', start: '19:00', end: '22:00' },
];
