import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { User } from '../../../../core/models/user.model';
import { AuthService } from '../../../../core/services/auth.service';
import { PartnerService } from '../../../../core/services/partner.service';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';
import { DashboardService, DashboardStats, RecentActivity } from '../../services/dashboard.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CurrencyPipe,
    DateFormatPipe,
  ],
  templateUrl: './user-profile.html',
  styleUrls: ['./user-profile.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserProfile implements OnInit, OnDestroy {
  currentUser: User | null = null;
  stats: DashboardStats | null = null;
  recentActivity: RecentActivity | null = null;
  activeTab: 'transactions' | 'games' = 'transactions';
  isPartner = false;

  private subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private partnerService: PartnerService,
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
      this.dashboardService.stats$.subscribe(stats => {
        this.stats = stats;
        this.cdr.markForCheck();
      })
    );

    this.subscription.add(
      this.dashboardService.recentActivity$.subscribe(activity => {
        this.recentActivity = activity;
        this.cdr.markForCheck();
      })
    );

    this.subscription.add(
      this.dashboardService.loadDashboardData().subscribe()
    );

    this.subscription.add(
      this.partnerService.getMyProfile().subscribe({
        next: (response) => {
          this.isPartner = response.success && !!response.data?.partner;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isPartner = false;
          this.cdr.markForCheck();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  setActiveTab(tab: 'transactions' | 'games'): void {
    this.activeTab = tab;
  }

  getAmountClass(type: string): string {
    return type === 'deposit' || type === 'win' ? 'positive' : 'negative';
  }

  getAmountPrefix(type: string): string {
    return type === 'deposit' || type === 'win' ? '+' : '-';
  }

  getTransactionIcon(type: string): string {
    const icons: Record<string, string> = { deposit: '💳', withdrawal: '💸', bet: '🎲', win: '🏆' };
    return icons[type] || '💰';
  }

  getUserInitials(): string {
    if (!this.currentUser) return '?';
    return (this.currentUser.firstName?.charAt(0) || '') + (this.currentUser.lastName?.charAt(0) || '');
  }

  getMemberSince(): string {
    if (!this.currentUser?.createdAt) return '';
    const date = new Date(this.currentUser.createdAt);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  trackByTransactionId(_: number, t: any): string {
    return t.id;
  }

  trackByGameId(_: number, g: any): string {
    return g.id;
  }
}
