import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout/admin-layout.component';
import { UsersManagementComponent } from './users-management/users-management.component';
import {MediaTemplatesManagementComponent} from './media-templates-management/media-templates-management.component';
import {SourceAssetsManagementComponent} from './source-assets-management/source-assets-management.component';

const routes: Routes = [
  {
    path: '', // This will be '/admin' because of the main app routing
    component: AdminLayoutComponent,
    children: [
      {path: '', redirectTo: 'users', pathMatch: 'full'}, // Default child route
      {path: 'users', component: UsersManagementComponent},
      {path: 'source-assets', component: SourceAssetsManagementComponent},
      {path: 'media-templates', component: MediaTemplatesManagementComponent},
      // Add more routes for other entities here
      // Example: { path: 'orders', component: OrdersManagementComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
