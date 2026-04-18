import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { QRCodeComponent } from 'angularx-qrcode';
import { Subject, takeUntil } from 'rxjs';
import { Partner, PartnerStats, ReferredUser } from '../../../../core/models/partner.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { PartnerService } from '../../../../core/services/partner.service';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-partner-dashboard',
  templateUrl: './partner-dashboard.html',
  styleUrls: ['./partner-dashboard.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyPipe, QRCodeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PartnerDashboardComponent implements OnInit, OnDestroy {
  partner: Partner | null = null;
  stats: PartnerStats | null = null;
  recentReferred: ReferredUser[] = [];
  isLoading = true;
  referralLink = '';
  copied = false;
  copiedLink = false;

  private destroy$ = new Subject<void>();

  constructor(
    private partnerService: PartnerService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadPartnerData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPartnerData(): void {
    this.isLoading = true;
    this.partnerService.getMyProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.partner = response.data.partner;
            this.stats = response.data.stats;
            this.recentReferred = response.data.referredUsers.users.slice(0, 5);
            this.referralLink = `${window.location.origin}/auth/register?ref=${this.partner.referralCode}`;
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.notificationService.error('Erro', 'Não foi possível carregar dados do parceiro');
          this.cdr.markForCheck();
        }
      });
  }

  copyReferralCode(): void {
    if (!this.partner) return;
    navigator.clipboard.writeText(this.partner.referralCode).then(() => {
      this.copied = true;
      this.notificationService.success('Copiado!', 'Código copiado para a área de transferência');
      setTimeout(() => { this.copied = false; this.cdr.markForCheck(); }, 2000);
      this.cdr.markForCheck();
    });
  }

  copyReferralLink(): void {
    navigator.clipboard.writeText(this.referralLink).then(() => {
      this.copiedLink = true;
      this.notificationService.success('Copiado!', 'Link copiado para a área de transferência');
      setTimeout(() => { this.copiedLink = false; this.cdr.markForCheck(); }, 2000);
      this.cdr.markForCheck();
    });
  }

  getCommissionDisplay(): string {
    if (!this.partner) return '';
    if (this.partner.commissionType === 'percentage') {
      return `${this.partner.commissionValue}%`;
    }
    return `R$ ${this.partner.commissionValue.toFixed(2)}`;
  }

  trackByUserId(index: number, user: ReferredUser): string {
    return user.id;
  }
}
