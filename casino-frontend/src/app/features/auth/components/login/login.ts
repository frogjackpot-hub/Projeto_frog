import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isSubmitting = false;
  showPassword = false;
  returnUrl = '/dashboard';
  blockedMessage: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService
  ) {
    this.loginForm = this.createLoginForm();
  }

  ngOnInit(): void {
    // Obter URL de retorno dos parâmetros de query
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    
    // Verificar se o usuário foi bloqueado
    this.checkBlockedStatus();
  }
  
  private checkBlockedStatus(): void {
    // Verificar parâmetro de query
    const isBlocked = this.route.snapshot.queryParams['blocked'];
    
    // Verificar localStorage
    const blockedReason = localStorage.getItem('user_blocked_reason');
    
    if (isBlocked === 'true' || blockedReason) {
      this.blockedMessage = blockedReason || 'Sua conta foi bloqueada. Entre em contato com o suporte.';
      
      // Mostrar notificação
      this.notificationService.error(
        'Conta Bloqueada',
        this.blockedMessage
      );
      
      // Limpar a mensagem após 10 segundos
      setTimeout(() => {
        this.blockedMessage = null;
        localStorage.removeItem('user_blocked_reason');
      }, 10000);
    }
  }

  private createLoginForm(): FormGroup {
    return this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      
      const loginData = this.loginForm.value;
      
      this.authService.login(loginData).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          
          if (response.success) {
            this.notificationService.success(
              'Login realizado com sucesso!',
              `Bem-vindo de volta, ${response.data?.user.firstName}!`
            );
            
            this.router.navigate([this.returnUrl]);
          } else {
            this.notificationService.error(
              'Erro no login',
              response.message || 'Credenciais inválidas'
            );
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Login error:', error);
          
          // Verificar se o usuário está bloqueado
          const isBlocked = error?.error?.code === 'USER_BLOCKED' ||
                           error?.error?.message?.includes('bloqueada') ||
                           error?.error?.message?.includes('bloqueado') ||
                           error?.error?.error?.includes('bloqueada') ||
                           error?.error?.error?.includes('bloqueado');
          
          if (isBlocked) {
            this.blockedMessage = 'Sua conta foi bloqueada. Entre em contato com o suporte para mais informações.';
            this.notificationService.error(
              'Conta Bloqueada',
              this.blockedMessage
            );
            setTimeout(() => {
              this.blockedMessage = null;
            }, 10000);
            return;
          }
          
          let errorMessage = 'Erro interno do servidor';
          
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.status === 401) {
            errorMessage = 'E-mail ou senha incorretos';
          } else if (error.status === 0) {
            errorMessage = 'Não foi possível conectar ao servidor';
          }
          
          this.notificationService.error('Erro no login', errorMessage);
        }
      });
    } else {
      // Marcar todos os campos como touched para mostrar erros
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
    }
  }
}