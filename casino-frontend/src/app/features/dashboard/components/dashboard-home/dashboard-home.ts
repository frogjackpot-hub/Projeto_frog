import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { Game } from '../../../../core/models/game.model';
import { User } from '../../../../core/models/user.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CurrencyPipe,
  ],
  templateUrl: './dashboard-home.html',
  styleUrls: ['./dashboard-home.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardHomeComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  availableGames: Game[] = [];

  private subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
        this.cdr.markForCheck();
      })
    );

    this.subscription.add(
      this.dashboardService.getAvailableGames().subscribe({
        next: (games) => {
          this.availableGames = games;
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Error loading games:', err)
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  playGame(game: Game): void {
    this.router.navigate(['/games', game.type, game.id]);
  }

  getGameIcon(type: string): string {
    const icons: Record<string, string> = {
      slot: '🎰', roulette: '🎡', blackjack: '🃏', poker: '♠️', color: '🎨'
    };
    return icons[type] || '🎮';
  }

  trackByGameId(_: number, game: Game): string {
    return game.id;
  }
}