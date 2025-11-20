import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BlockedUserService } from '../../services/blocked-user.service';

@Component({
  selector: 'app-blocked-user-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blocked-user-modal.component.html',
  styleUrls: ['./blocked-user-modal.component.scss']
})
export class BlockedUserModalComponent implements OnInit {
  constructor(
    private router: Router,
    private blockedUserService: BlockedUserService
  ) {}

  ngOnInit(): void {
    // Redirecionar após 5 segundos (tempo para ler a mensagem)
    setTimeout(() => {
      this.onClose();
    }, 5000);
  }

  onClose(): void {
    // Fechar o modal
    this.blockedUserService.closeModal();
    
    // Redirecionar para a página de login
    this.router.navigate(['/auth/login']);
  }
}
