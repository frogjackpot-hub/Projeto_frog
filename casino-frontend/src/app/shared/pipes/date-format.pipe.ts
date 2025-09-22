import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'appDateFormat',
  standalone: true
})
export class DateFormatPipe implements PipeTransform {
  transform(value: string | Date, format: 'short' | 'medium' | 'long' | 'relative' = 'medium'): string {
    if (!value) {
      return '';
    }

    const date = typeof value === 'string' ? new Date(value) : value;
    
    if (isNaN(date.getTime())) {
      return '';
    }

    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    switch (format) {
      case 'short':
        return date.toLocaleDateString('pt-BR');
      
      case 'long':
        return date.toLocaleDateString('pt-BR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      
      case 'relative':
        if (diffInMinutes < 1) {
          return 'Agora mesmo';
        } else if (diffInMinutes < 60) {
          return `${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''} atrás`;
        } else if (diffInHours < 24) {
          return `${diffInHours} hora${diffInHours > 1 ? 's' : ''} atrás`;
        } else if (diffInDays < 7) {
          return `${diffInDays} dia${diffInDays > 1 ? 's' : ''} atrás`;
        } else {
          return date.toLocaleDateString('pt-BR');
        }
      
      case 'medium':
      default:
        return date.toLocaleDateString('pt-BR', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
    }
  }
}