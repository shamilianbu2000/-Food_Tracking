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
export type DayMenu = Record<Meal, string[]>;
export type TokenStatus = 'issued' | 'unused' | 'expired';

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

/** Minutes before a meal window starts after which a booking can no longer be cancelled. */
export const DEFAULT_CUTOFF_MINUTES = 60;

export const SEED_MENU: DayMenu[] = [
  { BREAKFAST: ['Idli', 'Sambar', 'Coconut chutney'], LUNCH: ['Rice', 'Dal tadka', 'Paneer curry', 'Salad'], DINNER: ['Chapati', 'Mixed veg curry', 'Curd rice'] },
  { BREAKFAST: ['Poha', 'Boiled egg', 'Tea'], LUNCH: ['Jeera rice', 'Rajma', 'Aloo gobi', 'Papad'], DINNER: ['Veg pulao', 'Raita', 'Gulab jamun'] },
  { BREAKFAST: ['Masala dosa', 'Sambar'], LUNCH: ['Rice', 'Sambar', 'Cabbage poriyal', 'Buttermilk'], DINNER: ['Chapati', 'Chicken curry', 'Dal fry'] },
  { BREAKFAST: ['Upma', 'Banana', 'Coffee'], LUNCH: ['Veg biryani', 'Raita', 'Boiled egg'], DINNER: ['Noodles', 'Manchurian', 'Fruit salad'] },
  { BREAKFAST: ['Aloo paratha', 'Curd', 'Pickle'], LUNCH: ['Rice', 'Fish curry', 'Dal', 'Beans fry'], DINNER: ['Fried rice', 'Paneer tikka', 'Ice cream'] },
  { BREAKFAST: ['Pongal', 'Vada', 'Chutney'], LUNCH: ['Lemon rice', 'Chole', 'Poori'], DINNER: ['Pasta', 'Garlic bread', 'Soup'] },
  { BREAKFAST: ['Pancakes', 'Fruit', 'Juice'], LUNCH: ['Special thali'], DINNER: ['Light khichdi', 'Papad', 'Kheer'] },
];
