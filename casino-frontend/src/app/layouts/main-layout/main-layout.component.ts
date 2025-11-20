import { CommonModule, NgIf } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { CurrencyPipe } from '../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  standalone: true,
  imports: [CommonModule, NgIf, RouterModule, CurrencyPipe]
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  showUserMenu = false;
  private subscription = new Subscription();
  private balanceCheckInterval?: ReturnType<typeof setInterval>;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
      })
    );

    // Atualizar saldo a cada 5 segundos quando o usuário está logado
    this.subscription.add(
      interval(5000).pipe(
        filter(() => this.authService.isAuthenticated),
        switchMap(() => this.authService.getCurrentUser(true))
      ).subscribe()
    );

    // Atualizar quando a página volta a ficar visível
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.authService.isAuthenticated) {
        this.authService.refreshUserData().subscribe();
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (this.balanceCheckInterval) {
      clearInterval(this.balanceCheckInterval);
    }
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu')) {
      this.showUserMenu = false;
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}