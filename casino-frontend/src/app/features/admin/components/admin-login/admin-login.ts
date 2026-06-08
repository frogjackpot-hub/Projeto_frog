import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AdminService } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-admin-login',
  templateUrl: './admin-login.html',
  styleUrls: ['./admin-login.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class AdminLoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  isSubmitting = false;
  showPassword = false;
  returnUrl = '/admin/dashboard';
  loginStep: 'credentials' | 'twoFactor' = 'credentials';
  twoFactorChallengeId: string | null = null;
  twoFactorExpiresIn = 0;
  private twoFactorCountdownInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private notificationService: NotificationService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Criar formulário de login
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      twoFactorCode: ['', [Validators.pattern(/^\d{6}$/)]]
    });
  }

  ngOnInit(): void {
    // Verificar se já está autenticado
    if (this.adminService.isAdmin) {
      this.router.navigate(['/admin/dashboard']);
      return;
    }

    // Obter URL de retorno dos parâmetros da query
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/admin/dashboard';
  }

  ngOnDestroy(): void {
    this.stopTwoFactorCountdown();
  }

  /**
   * Alternar visibilidade da senha
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Verificar se um campo tem erro
   */
  hasError(fieldName: string, errorType?: string): boolean {
    const field = this.loginForm.get(fieldName);
    if (!field) return false;

    if (errorType) {
      return field.hasError(errorType) && (field.dirty || field.touched);
    }
    return field.invalid && (field.dirty || field.touched);
  }

  /**
   * Obter mensagem de erro para um campo
   */
  getErrorMessage(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) {
      return 'Este campo é obrigatório';
    }
    if (field.errors['email']) {
      return 'Email inválido';
    }
    if (field.errors['minlength']) {
      return `Mínimo de ${field.errors['minlength'].requiredLength} caracteres`;
    }

    return 'Campo inválido';
  }

  /**
   * Submeter formulário de login
   */
  onSubmit(): void {
    if (this.loginStep === 'twoFactor') {
      this.submitTwoFactor();
      return;
    }

    // Validar formulário
    const emailCtrl = this.loginForm.get('email');
    const passwordCtrl = this.loginForm.get('password');
    if (emailCtrl?.invalid || passwordCtrl?.invalid) {
      emailCtrl?.markAsTouched();
      passwordCtrl?.markAsTouched();
      return;
    }

    this.isSubmitting = true;
    const credentials = this.loginForm.value;

    this.adminService.login(credentials).subscribe({
      next: (response) => {
        const payload: any = response?.data || response;
        const challengeId = payload?.challengeId || payload?.challenge_id || payload?.twoFactorChallengeId || null;
        const requires2FA = Boolean(
          payload?.requires2FA ||
          payload?.requiresTwoFactor ||
          payload?.twoFactorRequired ||
          challengeId
        );

        if (response.success && requires2FA) {
          if (!challengeId) {
            this.isSubmitting = false;
            this.notificationService.error(
              'Falha ao iniciar 2FA',
              'O servidor enviou o codigo, mas nao retornou o identificador do desafio. Tente novamente.'
            );
            return;
          }

          this.twoFactorChallengeId = challengeId;
          this.twoFactorExpiresIn = payload?.expiresIn || payload?.expires_in || 300;
          this.loginStep = 'twoFactor';
          this.startTwoFactorCountdown();
          this.notificationService.info(
            'Codigo enviado',
            'Enviamos um codigo de verificacao no grupo do Telegram de seguranca.'
          );
          this.loginForm.get('twoFactorCode')?.setValidators([Validators.required, Validators.pattern(/^\d{6}$/)]);
          this.loginForm.get('twoFactorCode')?.updateValueAndValidity();
          this.isSubmitting = false;
          return;
        }

        if (response.success && payload?.accessToken) {
          this.notificationService.success(
            'Login realizado com sucesso',
            'Bem-vindo ao painel administrativo!'
          );
          
          // Redirecionar para a página de retorno ou dashboard
          this.router.navigate([this.returnUrl]);
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        
        // Mostrar mensagem de erro
        const errorMessage = error?.error?.message || 'Credenciais inválidas. Tente novamente.';
        this.notificationService.error('Erro ao fazer login', errorMessage);
        
        // Limpar senha
        this.loginForm.patchValue({ password: '' });
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }

  submitTwoFactor(): void {
    const codeControl = this.loginForm.get('twoFactorCode');
    if (!this.twoFactorChallengeId) {
      this.notificationService.error('Sessao invalida', 'Refaca o login para gerar um novo codigo.');
      this.resetTwoFactorStep();
      return;
    }

    if (!codeControl || codeControl.invalid) {
      codeControl?.markAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.adminService.verifyTwoFactor({
      challengeId: this.twoFactorChallengeId,
      code: codeControl.value,
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success(
            'Login realizado com sucesso',
            'Bem-vindo ao painel administrativo!'
          );

          this.router.navigate([this.returnUrl]);
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        const errorMessage = error?.error?.message || 'Codigo invalido ou expirado. Gere um novo login.';
        this.notificationService.error('Falha na verificacao 2FA', errorMessage);
        codeControl.patchValue('');
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }

  backToCredentials(): void {
    this.resetTwoFactorStep();
  }

  private resetTwoFactorStep(): void {
    this.stopTwoFactorCountdown();
    this.loginStep = 'credentials';
    this.twoFactorChallengeId = null;
    this.twoFactorExpiresIn = 0;
    this.loginForm.get('twoFactorCode')?.patchValue('');
    this.loginForm.get('twoFactorCode')?.clearValidators();
    this.loginForm.get('twoFactorCode')?.setValidators([Validators.pattern(/^\d{6}$/)]);
    this.loginForm.get('twoFactorCode')?.updateValueAndValidity();
  }

  get twoFactorRemainingTimeLabel(): string {
    const remaining = Math.max(0, this.twoFactorExpiresIn || 0);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  private startTwoFactorCountdown(): void {
    this.stopTwoFactorCountdown();
    this.twoFactorCountdownInterval = setInterval(() => {
      if (this.loginStep !== 'twoFactor') {
        this.stopTwoFactorCountdown();
        return;
      }

      this.twoFactorExpiresIn = Math.max(0, this.twoFactorExpiresIn - 1);

      if (this.twoFactorExpiresIn <= 0) {
        this.stopTwoFactorCountdown();
        this.notificationService.warning(
          'Codigo expirado',
          'O codigo 2FA expirou. Faca login novamente para gerar um novo codigo.'
        );
        this.resetTwoFactorStep();
      }
    }, 1000);
  }

  private stopTwoFactorCountdown(): void {
    if (this.twoFactorCountdownInterval) {
      clearInterval(this.twoFactorCountdownInterval);
      this.twoFactorCountdownInterval = null;
    }
  }
}
