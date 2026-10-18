import { Routes } from '@angular/router';
import { MealsPage } from './meals-page';
import { ScannerPage } from './scanner-page';
import { AdminPage } from './admin-page';
import { HistoryPage } from './history-page';
import { DashboardPage } from './dashboard-page';
import { MenuAdminPage } from './menu-admin-page';
import { adminGuard } from './admin-guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'meals' },
  { path: 'meals', component: MealsPage },
  { path: 'history', component: HistoryPage },
  { path: 'scanner', component: ScannerPage, canActivate: [adminGuard] },
  { path: 'admin', component: AdminPage, canActivate: [adminGuard] },
  { path: 'dashboard', component: DashboardPage, canActivate: [adminGuard] },
  { path: 'menu-planner', component: MenuAdminPage, canActivate: [adminGuard] },
];
