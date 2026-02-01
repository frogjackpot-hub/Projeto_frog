import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Interface para as cores do jogo
interface GameColor {
  id: number;
  name: string;
  gradient: string;
}

@Component({
  selector: 'app-frogjackpot-game',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './frogjackpot-game.html',
  styleUrls: ['./frogjackpot-game.scss']
})
export class FrogjackpotGameComponent implements OnInit {
  // Configuração de apostas
  betAmount: number = 10;
  balance: number = 1000; // Mock balance - será integrado com API
  quickBets = [10, 25, 50, 100, 500];

  // Estado do jogo
  isPlaying: boolean = false;
  gameFinished: boolean = false;
  matchCount: number = 0;
  lastWin: number = 0;

  // Cores selecionadas pelo jogador (índices)
  selectedColors: number[] = [];

  // Slots visuais
  playerSlots: (GameColor | null)[] = [null, null, null, null, null, null];
  systemSlots: (GameColor | null)[] = [null, null, null, null, null, null];

  // Multiplicadores de prêmio
  prizeMultipliers: { [key: number]: number } = {
    6: 50,
    5: 20,
    4: 10,
    3: 5,
    2: 2,
    1: 1,
    0: 0
  };

  // Cores disponíveis para seleção (12 cores - 2 linhas de 6)
  availableColors: GameColor[] = [
    { id: 0, name: 'Vermelho', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
    { id: 1, name: 'Azul', gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' },
    { id: 2, name: 'Roxo', gradient: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)' },
    { id: 3, name: 'Ciano', gradient: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)' },
    { id: 4, name: 'Verde Limão', gradient: 'linear-gradient(135deg, #a3e635 0%, #84cc16 100%)' },
    { id: 5, name: 'Rosa', gradient: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)' },
    { id: 6, name: 'Laranja', gradient: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)' },
    { id: 7, name: 'Azul Claro', gradient: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)' },
    { id: 8, name: 'Turquesa', gradient: 'linear-gradient(135deg, #2dd4bf 0%, #14b8a6 100%)' },
    { id: 9, name: 'Azul Marinho', gradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)' },
    { id: 10, name: 'Amarelo', gradient: 'linear-gradient(135deg, #fde047 0%, #facc15 100%)' },
    { id: 11, name: 'Magenta', gradient: 'linear-gradient(135deg, #e879f9 0%, #d946ef 100%)' }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Carregar saldo do usuário da API futuramente
    this.loadBalance();
  }

  // Carregar saldo (mock por enquanto)
  private loadBalance(): void {
    // TODO: Integrar com API
    // this.authService.currentUser$.subscribe(user => {
    //   if (user) this.balance = user.balance;
    // });
  }

  // Verificar se uma cor está selecionada
  isColorSelected(index: number): boolean {
    return this.selectedColors.includes(index);
  }

  // Obter a ordem de seleção de uma cor (1-6)
  getSelectionOrder(index: number): number {
    const position = this.selectedColors.indexOf(index);
    return position >= 0 ? position + 1 : 0;
  }

  // Alternar seleção de cor
  toggleColor(index: number): void {
    if (this.isPlaying) return;

    // Se o jogo terminou, resetar para nova rodada
    if (this.gameFinished) {
      this.resetGame();
    }

    const existingIndex = this.selectedColors.indexOf(index);

    if (existingIndex >= 0) {
      // Remover cor
      this.selectedColors.splice(existingIndex, 1);
    } else if (this.selectedColors.length < 6) {
      // Adicionar cor
      this.selectedColors.push(index);
    }

    // Atualizar slots visuais do jogador
    this.updatePlayerSlots();
  }

  // Atualizar slots visuais do jogador
  private updatePlayerSlots(): void {
    this.playerSlots = Array(6).fill(null).map((_, i) => {
      if (i < this.selectedColors.length) {
        return this.availableColors[this.selectedColors[i]];
      }
      return null;
    });
  }

  // Limpar todas as seleções
  clearSelections(): void {
    if (this.isPlaying) return;
    
    this.selectedColors = [];
    this.playerSlots = [null, null, null, null, null, null];
    this.systemSlots = [null, null, null, null, null, null];
    this.gameFinished = false;
    this.matchCount = 0;
    this.lastWin = 0;
  }

  // Reset para nova rodada
  private resetGame(): void {
    this.systemSlots = [null, null, null, null, null, null];
    this.gameFinished = false;
    this.matchCount = 0;
    this.lastWin = 0;
  }

  // Definir aposta rápida
  setQuickBet(amount: number): void {
    if (amount <= this.balance) {
      this.betAmount = amount;
    }
  }

  // Aumentar aposta
  increaseBet(): void {
    const increment = this.betAmount >= 100 ? 50 : 10;
    this.betAmount = Math.min(this.betAmount + increment, this.balance);
  }

  // Diminuir aposta
  decreaseBet(): void {
    const decrement = this.betAmount > 100 ? 50 : 10;
    this.betAmount = Math.max(this.betAmount - decrement, 1);
  }

  // Iniciar jogo
  async startGame(): Promise<void> {
    if (this.selectedColors.length < 6) {
      alert('Selecione 6 cores para jogar!');
      return;
    }

    if (this.betAmount > this.balance) {
      alert('Saldo insuficiente!');
      return;
    }

    if (this.betAmount < 1) {
      alert('Aposta mínima é R$ 1!');
      return;
    }

    // Reset se jogo anterior terminou
    if (this.gameFinished) {
      this.systemSlots = [null, null, null, null, null, null];
      this.matchCount = 0;
      this.lastWin = 0;
    }

    this.isPlaying = true;
    this.gameFinished = false;

    // Deduzir aposta do saldo
    this.balance -= this.betAmount;

    // Animação de revelação do sistema
    await this.revealSystemColors();

    // Calcular resultado
    this.calculateResult();

    this.isPlaying = false;
    this.gameFinished = true;
  }

  // Revelar cores do sistema com animação
  private async revealSystemColors(): Promise<void> {
    // Gerar cores aleatórias do sistema (sem repetição)
    const systemColorIndices = this.generateRandomColors();

    // Revelar uma cor por vez com delay
    for (let i = 0; i < 6; i++) {
      await this.delay(300);
      this.systemSlots[i] = this.availableColors[systemColorIndices[i]];
    }
  }

  // Gerar 6 cores aleatórias sem repetição
  private generateRandomColors(): number[] {
    const indices: number[] = [];
    const available = [...Array(12).keys()]; // [0, 1, 2, ..., 11]

    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * available.length);
      indices.push(available[randomIndex]);
      available.splice(randomIndex, 1);
    }

    return indices;
  }

  // Calcular resultado do jogo
  private calculateResult(): void {
    this.matchCount = 0;

    // Comparar cada posição
    for (let i = 0; i < 6; i++) {
      const playerColor = this.playerSlots[i];
      const systemColor = this.systemSlots[i];

      if (playerColor && systemColor && playerColor.id === systemColor.id) {
        this.matchCount++;
      }
    }

    // Calcular prêmio
    const multiplier = this.prizeMultipliers[this.matchCount] || 0;
    this.lastWin = this.betAmount * multiplier;

    // Adicionar prêmio ao saldo
    if (this.lastWin > 0) {
      this.balance += this.lastWin;
    }

    console.log(`Resultado: ${this.matchCount} acertos! Prêmio: R$ ${this.lastWin}`);
  }

  // Utilitário de delay para animações
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Voltar para lista de jogos
  goBack(): void {
    this.router.navigate(['/games']);
  }
}
