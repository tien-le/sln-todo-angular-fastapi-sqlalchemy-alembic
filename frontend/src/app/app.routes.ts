import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  },
  {
    path: 'auth/login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'auth',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  },
  {
    path: 'tasks',
    canActivate: [authGuard],
    loadComponent: () => import('./features/tasks/task-list/task-list.component').then(m => m.TaskListComponent)
  },
  {
    path: 'tasks/new',
    canActivate: [authGuard],
    loadComponent: () => import('./features/tasks/task-form/task-form.component').then(m => m.TaskFormComponent)
  },
  {
    path: 'tasks/:id/edit',
    canActivate: [authGuard],
    loadComponent: () => import('./features/tasks/task-form/task-form.component').then(m => m.TaskFormComponent)
  },
  {
    path: '**',
    redirectTo: 'tasks'
  }
];
