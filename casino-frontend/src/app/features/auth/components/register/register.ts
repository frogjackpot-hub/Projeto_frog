import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';

// Validador customizado para nomes - apenas letras
export function nameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    
    // Apenas letras (incluindo acentos) - sem espaços, números ou símbolos
    const namePattern = /^[a-zA-ZÀ-ÿ]+$/;
    if (!namePattern.test(control.value)) {
      return { 
        pattern: { 
          requiredPattern: '^[a-zA-ZÀ-ÿ]+$', 
          actualValue: control.value 
        } 
      };
    }
    return null;
  };
}

// Validador customizado para username
export function usernameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    
    const usernamePattern = /^[a-zA-Z0-9_]+$/;
    if (!usernamePattern.test(control.value)) {
      return { 
        pattern: { 
          requiredPattern: '^[a-zA-Z0-9_]+$', 
          actualValue: control.value 
        } 
      };
    }
    return null;
  };
}

@Component({
  selector: 'app-register',
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  isSubmitting = false;
  showPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) {
    this.registerForm = this.createRegisterForm();
  }

  ngOnInit(): void {
    // Componente inicializado
  }

  private createRegisterForm(): FormGroup {
    return this.formBuilder.group({
      firstName: ['', [
        Validators.required, 
        Validators.minLength(2),
        Validators.maxLength(50),
        nameValidator() // Usar validador customizado
      ]],
      lastName: ['', [
        Validators.required, 
        Validators.minLength(2),
        Validators.maxLength(50),
        nameValidator() // Usar validador customizado
      ]],
      username: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(30),
        usernameValidator() // Usar validador customizado
      ]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      ]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    
    if (!password || !confirmPassword) {
      return null;
    }
    
    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      // Remove o erro se as senhas coincidirem
      const errors = confirmPassword.errors;
      if (errors) {
        delete errors['passwordMismatch'];
        if (Object.keys(errors).length === 0) {
          confirmPassword.setErrors(null);
        }
      }
    }
    
    return null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldErrorMessage(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    if (!field || !field.errors || !this.isFieldInvalid(fieldName)) {
      return '';
    }

    const errors = field.errors;
    
    // Mensagens específicas por campo
    if (fieldName === 'firstName') {
      if (errors['required']) return 'Nome é obrigatório';
      if (errors['minlength']) return 'Nome deve ter pelo menos 2 caracteres';
      if (errors['maxlength']) return 'Nome deve ter no máximo 50 caracteres';
      if (errors['pattern']) return 'Nome deve conter apenas letras';
    }
    
    if (fieldName === 'lastName') {
      if (errors['required']) return 'Sobrenome é obrigatório';
      if (errors['minlength']) return 'Sobrenome deve ter pelo menos 2 caracteres';
      if (errors['maxlength']) return 'Sobrenome deve ter no máximo 50 caracteres';
      if (errors['pattern']) return 'Sobrenome deve conter apenas letras';
    }
    
    if (fieldName === 'username') {
      if (errors['required']) return 'Nome de usuário é obrigatório';
      if (errors['minlength']) return 'Nome de usuário deve ter pelo menos 3 caracteres';
      if (errors['pattern']) return 'Nome de usuário deve conter apenas letras, números e underscore';
    }
    
    if (fieldName === 'email') {
      if (errors['required']) return 'E-mail é obrigatório';
      if (errors['email']) return 'E-mail deve ter um formato válido';
    }
    
    if (fieldName === 'password') {
      if (errors['required']) return 'Senha é obrigatória';
      if (errors['minlength']) return 'Senha deve ter pelo menos 8 caracteres';
      if (errors['pattern']) return 'Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número';
    }
    
    if (fieldName === 'confirmPassword') {
      if (errors['required']) return 'Confirmação de senha é obrigatória';
      if (errors['passwordMismatch']) return 'As senhas não coincidem';
    }
    
    if (fieldName === 'acceptTerms') {
      if (errors['required']) return 'Você deve aceitar os termos e condições';
    }
    
    return 'Campo inválido';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  getPasswordStrength(): string {
    const password = this.registerForm.get('password')?.value || '';
    
    if (password.length < 6) return 'weak';
    if (password.length < 8) return 'medium';
    
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const score = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (score >= 3) return 'strong';
    if (score >= 2) return 'medium';
    return 'weak';
  }

  getPasswordStrengthPercentage(): number {
    const strength = this.getPasswordStrength();
    switch (strength) {
      case 'weak': return 33;
      case 'medium': return 66;
      case 'strong': return 100;
      default: return 0;
    }
  }

  getPasswordStrengthText(): string {
    const strength = this.getPasswordStrength();
    switch (strength) {
      case 'weak': return 'Senha fraca';
      case 'medium': return 'Senha média';
      case 'strong': return 'Senha forte';
      default: return '';
    }
  }

  // Filtro para impedir caracteres especiais em tempo real nos campos de nome
  onNameKeypress(event: KeyboardEvent): void {
    const char = event.key;
    console.log('Key pressed in name field:', char); // Debug
    // Permitir apenas letras (sem espaços, números ou símbolos)
    const allowedPattern = /^[a-zA-ZÀ-ÿ]$/;
    const specialKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'];
    
    if (!allowedPattern.test(char) && !specialKeys.includes(char) && !event.ctrlKey && !event.altKey) {
      console.log('Preventing character:', char); // Debug
      event.preventDefault();
    }
  }

  // Filtro para username (apenas letras, números e underscore)
  onUsernameKeypress(event: KeyboardEvent): void {
    const char = event.key;
    const allowedPattern = /^[a-zA-Z0-9_]$/;
    const specialKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'];
    
    if (!allowedPattern.test(char) && !specialKeys.includes(char) && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
    }
  }

  // Validação adicional para entrada de texto (cola/input)
  onNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    console.log('Name input value before cleaning:', value); // Debug
    // Remover tudo que não for letra
    const cleanedValue = value.replace(/[^a-zA-ZÀ-ÿ]/g, '');
    if (value !== cleanedValue) {
      console.log('Cleaned value:', cleanedValue); // Debug
      input.value = cleanedValue;
      this.registerForm.get(input.getAttribute('formControlName') || '')?.setValue(cleanedValue);
    }
  }

  // Validação adicional para username
  onUsernameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    // Remover caracteres não permitidos
    const cleanedValue = value.replace(/[^a-zA-Z0-9_]/g, '');
    if (value !== cleanedValue) {
      input.value = cleanedValue;
      this.registerForm.get('username')?.setValue(cleanedValue);
    }
  }

  onSubmit(): void {
    if (this.registerForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      
      const registerData = {
        firstName: this.registerForm.value.firstName,
        lastName: this.registerForm.value.lastName,
        username: this.registerForm.value.username,
        email: this.registerForm.value.email,
        password: this.registerForm.value.password
      };
      
      this.authService.register(registerData).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          
          if (response.success) {
            this.notificationService.success(
              'Conta criada com sucesso!',
              `Bem-vindo, ${response.data?.user.firstName}!`
            );
            
            this.router.navigate(['/dashboard']);
          } else {
            this.notificationService.error(
              'Erro ao criar conta',
              response.message || 'Erro desconhecido'
            );
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Register error:', error);
          
          let errorMessage = 'Erro interno do servidor';
          
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.status === 409) {
            errorMessage = 'E-mail ou nome de usuário já está em uso';
          } else if (error.status === 0) {
            errorMessage = 'Não foi possível conectar ao servidor';
          }
          
          this.notificationService.error('Erro ao criar conta', errorMessage);
        }
      });
    } else {
      // Marcar todos os campos como touched para mostrar erros
      Object.keys(this.registerForm.controls).forEach(key => {
        this.registerForm.get(key)?.markAsTouched();
      });
    }
  }
}