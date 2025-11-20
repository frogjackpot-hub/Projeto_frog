import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Game } from '../../../core/models/game.model';
import { Transaction } from '../../../core/models/transaction.model';
import { User } from '../../../core/models/user.model';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

export interface DashboardStats {
  totalGamesPlayed: number;
  totalWinnings: number;
  totalDeposits: number;
  favoriteGame: string;
  winRate: number;
  currentStreak: number;
}

export interface RecentActivity {
  transactions: Transaction[];
  games: any[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private statsSubject = new BehaviorSubject<DashboardStats | null>(null);
  private recentActivitySubject = new BehaviorSubject<RecentActivity | null>(null);

  public stats$ = this.statsSubject.asObservable();
  public recentActivity$ = this.recentActivitySubject.asObservable();

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  loadDashboardData(): Observable<any> {
    return combineLatest([
      this.loadUserStats(),
      this.loadRecentActivity()
    ]).pipe(
      map(([stats, activity]) => ({ stats, activity }))
    );
  }

  private loadUserStats(): Observable<DashboardStats> {
    return this.apiService.get<any>('dashboard/stats').pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        // Dados mock se a API não estiver implementada
        return this.getMockStats();
      }),
      tap(stats => this.statsSubject.next(stats))
    );
  }

  private loadRecentActivity(): Observable<RecentActivity> {
    return combineLatest([
      this.apiService.get<{ transactions: Transaction[] }>('wallet/transactions', { limit: 5 }),
      this.apiService.get<any>('games/recent', { limit: 5 })
    ]).pipe(
      map(([transactionsResponse, gamesResponse]) => {
        const transactions = transactionsResponse.success ? transactionsResponse.data?.transactions || [] : [];
        const games = gamesResponse.success ? gamesResponse.data || [] : [];
        
        return { transactions, games };
      }),
      tap(activity => {
        this.recentActivitySubject.next(activity);
        // Atualizar o saldo do usuário sempre que houver novas transações
        this.authService.refreshUserData().subscribe();
      })
    );
  }

  private getMockStats(): DashboardStats {
    return {
      totalGamesPlayed: 0,
      totalWinnings: 0,
      totalDeposits: 0,
      favoriteGame: 'Nenhum',
      winRate: 0,
      currentStreak: 0
    };
  }

  updateUserProfile(profileData: Partial<User>): Observable<any> {
    return this.apiService.put('auth/profile', profileData).pipe(
      tap(response => {
        if (response.success && response.data) {
          // Atualizar o usuário atual no AuthService
          this.authService.getCurrentUser().subscribe();
        }
      })
    );
  }

  getAvailableGames(): Observable<Game[]> {
    return this.apiService.get<{ games: Game[] }>('games').pipe(
      map(response => response.success ? response.data?.games || [] : [])
    );
  }
}