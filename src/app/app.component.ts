import { Component,OnInit } from '@angular/core';
import { ToastService,ToastMessage } from './core/services/toast.services';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
  title = 'project';
  toasts:ToastMessage[]=[];
  constructor(private toastService: ToastService){}
  ngOnInit(): void {
    this.toastService.toasts$.subscribe((toasts) => (this.toasts = toasts));
  }
}
