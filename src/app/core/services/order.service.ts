import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Order } from '../models/order.model';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly API = '/api/orders'; // change to your backend URL

  constructor(private http: HttpClient) {}

  placeOrder(order: Order): Observable<{ success: boolean; orderId?: string | number; payload?: any }> {

    const fakeId = 'ORD-' + Date.now();
    return of({ success: true, orderId: fakeId, payload: order }).pipe(
      map(r => ({ success: true, orderId: r.orderId, payload: r.payload }))
    );
  }
}
