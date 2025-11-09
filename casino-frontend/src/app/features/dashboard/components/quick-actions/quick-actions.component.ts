import { CommonModule, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { Game } from '../../../../core/models/game.model';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-quick-actions',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, RouterModule, CurrencyPipe],
  templateUrl: './quick-actions.html',
  styleUrls: ['./quick-actions.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuickActionsComponent implements OnInit, OnDestroy {
  featuredGames: Game[] = [];
  private subscription = new Subscription();

  constructor(
    private dashboardService: DashboardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFeaturedGames();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadFeaturedGames(): void {
    this.subscription.add(
      this.dashboardService.getAvailableGames().subscribe({
        next: (games) => {
          // Pegar os 3 primeiros jogos como destaque
          this.featuredGames = games.slice(0, 3);
        },
        error: (error) => {
          console.error('Error loading featured games:', error);
        }
      })
    );
  }

  trackByGameId(index: number, game: Game): string {
    return game.id;
  }

  playGame(game: Game): void {
    // Navegar para o jogo específico
    this.router.navigate(['/games', game.type, game.id]);
  }
}