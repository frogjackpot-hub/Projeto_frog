import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Game } from '../../../../core/models/game.model';
import { ApiService } from '../../../../core/services/api.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-games-list',
  standalone: false,
  templateUrl: './games-list.html',
  styleUrls: ['./games-list.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GamesListComponent implements OnInit {
  games: Game[] = [];

  constructor(
    private apiService: ApiService,
    private router: Router,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadGames();
  }

  // Getter para filtrar jogos (excluindo FrogJackpot)
  get otherGames(): Game[] {
    return this.games.filter(game => 
      game.name.toLowerCase() !== 'frogjackpot' && 
      !game.name.toLowerCase().includes('frog')
    );
  }

  private loadGames(): void {
    this.apiService.get<{ games: Game[] }>('games').subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.games = response.data.games;
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error loading games:', error);
        this.notificationService.error(
          'Erro ao carregar jogos',
          'Não foi possível carregar a lista de jogos'
        );
      }
    });
  }

  trackByGameId(index: number, game: Game): string {
    return game.id;
  }

  playGame(game: Game): void {
    this.notificationService.info(
      'Jogo em desenvolvimento',
      `O jogo ${game.name} será implementado em breve!`
    );
  }
}
