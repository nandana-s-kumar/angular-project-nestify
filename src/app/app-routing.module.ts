import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CommonModule } from '@angular/common';
import { NavbarComponent } from './core/navbar/navbar.component';
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './features/auth/login/login.component';
import { SignupComponent } from './features/auth/signup/signup.component';
import { ProfileComponent } from './features/user/profile/profile.component';
import { ProductPageComponent } from './features/product/product-page/product-page.component';
import { ProductDetailsComponent } from './features/product/product-details/product-details.component';
import { CartComponent } from './features/cart/cart.component';
import { CheckoutComponent } from './features/checkout/checkout.component';
import { AuthGuard } from './core/auth.guard';
import { AdminDashboardComponent } from './features/user/admin/admin-dashboard/admin-dashboard.component';
import { AdminGuard } from './core/admin.guard';

const routes: Routes = [
{path:'',component: HomeComponent},
{path:'login',component: LoginComponent},
{path: 'signup',component: SignupComponent},
{path: 'profile',component:ProfileComponent},
{path:'product-page',component:ProductPageComponent},
{path: 'product/:id', component:ProductDetailsComponent},
{path:'cart',component:CartComponent},
{ path: 'checkout', component: CheckoutComponent, canActivate: [AuthGuard] },
{path:'dashboard',canActivate:[AdminGuard],component:AdminDashboardComponent},
{path:'**',redirectTo:''},
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes)
  ],
    exports: [RouterModule]

})
export class AppRoutingModule { }
