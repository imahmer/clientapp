import { LayoutComponent } from './core/components';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';


const routes: Routes = [


  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      { path: 'dashboard', loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule) },
      { path: 'panel-managment', loadChildren: () => import('./features/panel-managment/panel-managment.module').then(m => m.PanelManagmentModule) },
      { path: 'product-managment', loadChildren: () => import('./features/product-managment/product-managment.module').then(m => m.ProductManagmentModule) },
      { path: 'document-management', loadChildren: () => import('./features/document-management/document-management.module').then(m => m.DocumentManagementModule) },
      { path: 'email-management', loadChildren: () => import('./features/email-management/email-management.module').then(m => m.EmailManagementModule) },
      { path: 'acl-management', loadChildren: () => import('./features/acl-management/acl-management.module').then(m => m.AclManagementModule) },
      { path: 'review-check-list', loadChildren: () => import('./features/review-check-list/review-check-list.module').then(m => m.ReviewCheckListModule) },
    ],
  },

  { path: 'account', loadChildren: () => import('./features/account/account.module').then(m => m.AccountModule) },













];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
