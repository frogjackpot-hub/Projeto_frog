import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { User } from '../../../../core/models/user.model';
import { AdminService } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyPipe]
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  currentAdmin: User | null = null;
  stats: any = null;
  period: string = 'today';
  users: User[] = [];
  isLoadingStats = true;
  isLoadingUsers = true;
  private destroy$ = new Subject<void>();

  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadAdminData();
    
    // Usar setTimeout para garantir que o carregamento não seja bloqueado pela notificação
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
          this.loadStats();
          this.loadUsers();
        });
      }, 50);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carregar dados do administrador
   */
  private loadAdminData(): void {
    this.adminService.currentAdmin$
      .pipe(takeUntil(this.destroy$))
      .subscribe(admin => {
        this.currentAdmin = admin;
      });
  }

  /**
   * Carregar estatísticas do sistema
   */
  loadStats(): void {
    this.isLoadingStats = true;
    this.adminService.getStats(this.period)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.stats = response.data;
          }
          this.isLoadingStats = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.isLoadingStats = false;
          this.notificationService.error('Erro', 'Não foi possível carregar as estatísticas');
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Alterar período das estatísticas
   */
  changePeriod(period: string): void {
    this.period = period;
    this.loadStats();
  }

  /**
   * Carregar lista de usuários
   */
  loadUsers(): void {
    this.isLoadingUsers = true;
    this.adminService.getAllUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.users = response.data;
          }
          this.isLoadingUsers = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.isLoadingUsers = false;
          this.notificationService.error('Erro', 'Não foi possível carregar os usuários');
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Fazer logout do administrador
   */
  logout(): void {
    if (confirm('Deseja realmente sair do painel administrativo?')) {
      this.adminService.logout().subscribe({
        next: () => {
          this.notificationService.success('Logout realizado', 'Até logo!');
          this.router.navigate(['/admin/login']);
        },
        error: () => {
          // Mesmo com erro, limpar dados locais
          this.router.navigate(['/admin/login']);
        }
      });
    }
  }

  /**
   * Obter badge de status do usuário
   */
  getUserStatusBadge(user: User): string {
    if (!user.isActive) return 'inativo';
    if (!user.isVerified) return 'não-verificado';
    return 'ativo';
  }

  /**
   * Obter classe CSS do badge de status
   */
  getStatusClass(user: User): string {
    if (!user.isActive) return 'status-inactive';
    if (!user.isVerified) return 'status-unverified';
    return 'status-active';
  }
}
