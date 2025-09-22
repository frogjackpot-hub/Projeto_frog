import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-quick-actions',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="quick-actions">
      <h2>Ações Rápidas</h2>
      <div class="actions-grid">
        <a routerLink="/games" class="action-card">
          <div class="action-icon">🎮</div>
          <span class="action-label">Jogar Agora</span>
        </a>
        
        <a routerLink="/wallet/deposit" class="action-card">
          <div class="action-icon">💰</div>
          <span class="action-label">Depositar</span>
        </a>
        
        <a routerLink="/wallet/withdrawal" class="action-card">
          <div class="action-icon">💸</div>
          <span class="action-label">Sacar</span>
        </a>
        
        <a routerLink="/profile" class="action-card">
          <div class="action-icon">👤</div>
          <span class="action-label">Perfil</span>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .quick-actions {
      background: var(--card-bg);
      border-radius: var(--border-radius);
      padding: 1.5rem;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .action-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem;
      background: var(--card-bg-secondary);
      border-radius: var(--border-radius-sm);
      text-decoration: none;
      color: var(--text-color);
      transition: transform 0.2s, background-color 0.2s;

      &:hover {
        transform: translateY(-2px);
        background: var(--card-bg-hover);
      }
    }

    .action-icon {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }

    .action-label {
      font-size: 0.9rem;
      text-align: center;
    }
  `]
})
export class QuickActionsComponent {}
