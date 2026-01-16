import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-frogjackpot-game',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './frogjackpot-game.html',
  styleUrls: ['./frogjackpot-game.scss']
})
export class FrogjackpotGameComponent implements OnInit {
  betAmount: number = 10;
  balance: number = 1000; // Mock balance
  
  // Quick bet amounts
  quickBets = [10, 25, 50, 100, 500];

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Inicialização futura do jogo
  }

  // Set quick bet
  setQuickBet(amount: number): void {
    this.betAmount = amount;
  }

  // Increase bet
  increaseBet(): void {
    this.betAmount += 10;
    if (this.betAmount > this.balance) {
      this.betAmount = this.balance;
    }
  }

  // Decrease bet
  decreaseBet(): void {
    this.betAmount -= 10;
    if (this.betAmount < 1) {
      this.betAmount = 1;
    }
  }

  // Start game - será implementado depois
  startGame(): void {
    if (this.betAmount > this.balance) {
      alert('Saldo insuficiente!');
      return;
    }

    if (this.betAmount < 1) {
      alert('Aposta mínima é R$ 1!');
      return;
    }

    // Lógica do jogo será implementada aqui
    console.log('Iniciando jogo com aposta de R$', this.betAmount);
  }

  // Go back to games list
  goBack(): void {
    this.router.navigate(['/games']);
  }
}
