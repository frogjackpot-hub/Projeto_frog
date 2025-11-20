import { ApplicationRef, ComponentRef, createComponent, EnvironmentInjector, Injectable } from '@angular/core';
import { BlockedUserModalComponent } from '../components/blocked-user-modal/blocked-user-modal.component';

@Injectable({
  providedIn: 'root'
})
export class BlockedUserService {
  private modalRef: ComponentRef<BlockedUserModalComponent> | null = null;

  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector
  ) {}

  showBlockedModal(): void {
    // Se já existe um modal aberto, não abre outro
    if (this.modalRef) {
      return;
    }

    // Criar o componente dinamicamente
    this.modalRef = createComponent(BlockedUserModalComponent, {
      environmentInjector: this.injector
    });

    // Adicionar ao DOM
    document.body.appendChild(this.modalRef.location.nativeElement);
    
    // Registrar no ApplicationRef
    this.appRef.attachView(this.modalRef.hostView);
  }

  closeModal(): void {
    if (this.modalRef) {
      this.appRef.detachView(this.modalRef.hostView);
      this.modalRef.destroy();
      this.modalRef = null;
    }
  }
}
