import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error';
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toastSubject = new BehaviorSubject<ToastMessage[]>([]);
  toasts$ = this.toastSubject.asObservable();

  show(message: string, type: 'success' | 'error' = 'success') {
    const newToast: ToastMessage = { message, type };
    const current = this.toastSubject.value;
    this.toastSubject.next([...current, newToast]);

    // Auto remove toast after 3 seconds
    setTimeout(() => this.remove(newToast), 3000);
  }

  private remove(toast: ToastMessage) {
    const updated = this.toastSubject.value.filter((t) => t !== toast);
    this.toastSubject.next(updated);
  }
}
