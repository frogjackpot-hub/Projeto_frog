import { Directive, ElementRef, Input, OnInit } from '@angular/core';

@Directive({
  selector: '[appLazyLoad]',
  standalone: true
})
export class LazyLoadDirective implements OnInit {
  @Input() appLazyLoad: string = '';
  @Input() placeholder: string = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNhcnJlZ2FuZG8uLi48L3RleHQ+PC9zdmc+';

  constructor(private el: ElementRef) {}

  ngOnInit() {
    const img = this.el.nativeElement;
    
    // Definir placeholder inicial
    img.src = this.placeholder;
    
    // Configurar IntersectionObserver
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadImage(img);
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });

    observer.observe(img);
  }

  private loadImage(img: HTMLImageElement) {
    const imageLoader = new Image();
    
    imageLoader.onload = () => {
      img.src = this.appLazyLoad;
      img.classList.add('loaded');
    };
    
    imageLoader.onerror = () => {
      img.src = 'assets/images/error-placeholder.png';
      img.classList.add('error');
    };
    
    imageLoader.src = this.appLazyLoad;
  }
}