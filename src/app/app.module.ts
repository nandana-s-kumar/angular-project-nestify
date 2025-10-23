import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule,ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

import { NavbarComponent } from './core/navbar/navbar.component';
import { FooterComponent } from './core/footer/footer.component';

import { HomeComponent } from './features/home/home.component';
import { ProfileComponent } from './features/user/profile/profile.component';
import { LoginComponent } from './features/auth/login/login.component';
import { SignupComponent } from './features/auth/signup/signup.component';
import { UserComponent } from './features/user/user.component';
import { CartComponent } from './features/cart/cart.component';
import { OrdersComponent } from './features/user/orders/orders.component';
import { ProductPageComponent } from './features/product/product-page/product-page.component';
import { ProductDetailsComponent } from './features/product/product-details/product-details.component';
import { CheckoutComponent } from './features/checkout/checkout.component';
import { AdminDashboardComponent } from './features/user/admin/admin-dashboard/admin-dashboard.component';
@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    FooterComponent,
    HomeComponent,
    ProfileComponent,
    LoginComponent,
    SignupComponent,
    UserComponent,
    CartComponent,
    OrdersComponent,
    ProductPageComponent,
    ProductDetailsComponent,
    CheckoutComponent,
    AdminDashboardComponent,    
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    HttpClientModule,

  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
