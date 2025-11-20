import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BlockedUserService {
  private showModalSubject = new BehaviorSubject<boolean>(false);
  public showModal$ = this.showModalSubject.asObservable();

  showBlockedModal(): void {
    this.showModalSubject.next(true);
  }

  closeModal(): void {
    this.showModalSubject.next(false);
  }
}
