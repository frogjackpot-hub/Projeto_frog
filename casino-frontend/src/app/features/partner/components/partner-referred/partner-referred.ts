import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ReferredUser } from '../../../../core/models/partner.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { PartnerService } from '../../../../core/services/partner.service';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-partner-referred',
  templateUrl: './partner-referred.html',
  styleUrls: ['./partner-referred.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PartnerReferredComponent implements OnInit, OnDestroy {
  users: ReferredUser[] = [];
  isLoading = true;
  currentPage = 1;
  totalPages = 1;
  total = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private partnerService: PartnerService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.partnerService.getMyReferredUsers(this.currentPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.users = response.data.users;
            this.total = response.data.total;
            this.totalPages = response.data.totalPages;
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.notificationService.error('Erro', 'Falha ao carregar indicados');
          this.cdr.markForCheck();
        }
      });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadUsers();
  }

  trackByUserId(index: number, user: ReferredUser): string {
    return user.id;
  }
}
