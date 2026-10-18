import { Routes } from '@angular/router';
import { MealsPage } from './meals-page';
import { ScannerPage } from './scanner-page';
import { AdminPage } from './admin-page';
import { HistoryPage } from './history-page';
import { DashboardPage } from './dashboard-page';
import { MenuAdminPage } from './menu-admin-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'meals' },
  { path: 'meals', component: MealsPage },
  { path: 'history', component: HistoryPage },
  { path: 'scanner', component: ScannerPage },
  { path: 'admin', component: AdminPage },
  { path: 'dashboard', component: DashboardPage },
  { path: 'menu-planner', component: MenuAdminPage },
];
