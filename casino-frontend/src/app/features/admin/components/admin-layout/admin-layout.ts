import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { User } from '../../../../core/models/user.model';
import { AdminService } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  currentAdmin: User | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.adminService.currentAdmin$
      .pipe(takeUntil(this.destroy$))
      .subscribe(admin => {
        this.currentAdmin = admin;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout(): void {
    if (confirm('Deseja realmente sair do painel administrativo?')) {
      this.adminService.logout().subscribe({
        next: () => {
          this.notificationService.success('Logout realizado', 'Até logo!');
          this.router.navigate(['/admin/login']);
        },
        error: () => {
          this.router.navigate(['/admin/login']);
        }
      });
    }
  }
}
