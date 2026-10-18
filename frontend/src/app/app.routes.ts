import { Routes } from '@angular/router';
import { MealsPage } from './meals-page';
import { ScannerPage } from './scanner-page';
import { AdminPage } from './admin-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'meals' },
  { path: 'meals', component: MealsPage },
  { path: 'scanner', component: ScannerPage },
  { path: 'admin', component: AdminPage },
];
