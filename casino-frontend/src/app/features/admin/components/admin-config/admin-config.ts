import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AdminService, CasinoConfig } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-admin-config',
  templateUrl: './admin-config.html',
  styleUrls: ['./admin-config.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class AdminConfigComponent implements OnInit, OnDestroy {
  configs: CasinoConfig[] = [];
  isLoading = true;
  isSaving = false;
  private destroy$ = new Subject<void>();

  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadConfig();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadConfig(): void {
    this.isLoading = true;
    this.adminService.getConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success && response.data) {
            this.configs = response.data.map((config: any) => ({
              ...config,
              value: typeof config.value === 'string' ? JSON.parse(config.value) : config.value
            }));
          }
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.notificationService.error('Erro', 'Não foi possível carregar as configurações');
        }
      });
  }

  saveConfig(): void {
    if (confirm('Deseja realmente salvar as configurações?')) {
      this.isSaving = true;
      
      const configsToSave = this.configs.map(config => ({
        key: config.key,
        value: config.value,
        description: config.description
      }));

      this.adminService.updateConfig(configsToSave)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              this.notificationService.success('Sucesso', 'Configurações salvas com sucesso');
              this.loadConfig();
            }
            this.isSaving = false;
          },
          error: () => {
            this.isSaving = false;
            this.notificationService.error('Erro', 'Não foi possível salvar as configurações');
          }
        });
    }
  }

  getConfigValue(config: CasinoConfig): any {
    return config.value;
  }

  updateConfigValue(config: CasinoConfig, value: any): void {
    config.value = value;
  }
}
