import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-blocked-user-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blocked-user-modal.component.html',
  styleUrls: ['./blocked-user-modal.component.scss']
})
export class BlockedUserModalComponent {
  constructor(private router: Router) {}

  onClose(): void {
    // Redirecionar para a página de login
    this.router.navigate(['/auth/login']);
  }
}
