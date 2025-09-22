import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { User } from '../../../../core/models/user.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';
import { DashboardService, DashboardStats, RecentActivity } from '../../services/dashboard.service';
import { QuickActionsComponent } from '../quick-actions/quick-actions.component';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    CurrencyPipe,
    DateFormatPipe,
    QuickActionsComponent,
  ],
  templateUrl: './dashboard-home.html',
  styleUrls: ['./dashboard-home.scss']
})
export class DashboardHomeComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  stats: DashboardStats | null = null;
  recentActivity: RecentActivity | null = null;
  activeTab: 'transactions' | 'games' = 'transactions';
  
  private subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadUserData(): void {
    this.subscription.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
      })
    );
  }

  private loadDashboardData(): void {
    this.subscription.add(
      this.dashboardService.stats$.subscribe((stats: DashboardStats | null) => {
        this.stats = stats;
      })
    );

    this.subscription.add(
      this.dashboardService.recentActivity$.subscribe((activity: RecentActivity | null) => {
        this.recentActivity = activity;
      })
    );

    // Carregar dados do dashboard
    this.subscription.add(
      this.dashboardService.loadDashboardData().subscribe({
        next: (data: { stats: DashboardStats; activity: RecentActivity }) => {
          console.log('Dashboard data loaded:', data);
        },
        error: (error: unknown) => {
          console.error('Error loading dashboard data:', error);
        }
      })
    );
  }

  setActiveTab(tab: 'transactions' | 'games'): void {
    this.activeTab = tab;
  }

  getAmountClass(transactionType: string): string {
    switch (transactionType) {
      case 'deposit':
      case 'win':
        return 'positive';
      case 'withdrawal':
      case 'bet':
        return 'negative';
      default:
        return '';
    }
  }

  getAmountPrefix(transactionType: string): string {
    switch (transactionType) {
      case 'deposit':
      case 'win':
        return '+';
      case 'withdrawal':
      case 'bet':
        return '-';
      default:
        return '';
    }
  }
}