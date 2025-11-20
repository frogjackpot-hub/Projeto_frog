import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
export class AdminLoginComponent implements OnInit {
  loginForm: FormGroup;
  isSubmitting = false;
  showPassword = false;
  returnUrl = '/admin/dashboard';

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
      password: ['', [Validators.required, Validators.minLength(6)]]
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
    // Validar formulário
    if (this.loginForm.invalid) {
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const credentials = this.loginForm.value;

    this.adminService.login(credentials).subscribe({
      next: (response) => {
        if (response.success) {
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
}
