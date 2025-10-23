import { Component, inject ,EventEmitter,Output} from '@angular/core';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  auth : AuthService = inject(AuthService);
  searchTerm: string = '';

  @Output() search = new EventEmitter<string>();

  private debouncer?: number;

  onSearchChange(): void {
    if (this.debouncer) {
      window.clearTimeout(this.debouncer);
    }

    this.debouncer = window.setTimeout(() => {
      this.search.emit(this.searchTerm.trim());
    }, 250);
  }
}
