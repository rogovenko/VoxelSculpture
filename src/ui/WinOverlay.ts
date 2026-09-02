import type { ScoreResult } from '../domain/ScoreSystem';
import { formatDollars } from './WalletHud';

function plural(n: number, forms: [string, string, string]): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  const mod10 = n % 10;
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

const COMPLETE_COPY =
  'Вы прошли игру. Это прототип и он короткий, ну а что ж вы ожидали! Можете начать заново';

export interface WinOverlayCallbacks {
  onContinue: () => void;
  onRestart: () => void;
}

export class WinOverlay {
  private readonly element: HTMLDivElement;
  private readonly title: HTMLHeadingElement;
  private readonly scoreBlock: HTMLDivElement;
  private readonly damage: HTMLParagraphElement;
  private readonly marble: HTMLParagraphElement;
  private readonly time: HTMLParagraphElement;
  private readonly payout: HTMLParagraphElement;
  private readonly verdict: HTMLParagraphElement;
  private readonly complete: HTMLParagraphElement;
  private readonly workshopButton: HTMLButtonElement;
  private readonly restartButton: HTMLButtonElement;
  private readonly actions: HTMLButtonElement[] = [];

  constructor(root: HTMLElement, cb: WinOverlayCallbacks) {
    this.element = document.createElement('div');
    this.element.className = 'overlay is-hidden';

    this.title = document.createElement('h1');
    this.title.textContent = 'Работа принята';

    this.scoreBlock = document.createElement('div');
    this.scoreBlock.className = 'score';
    this.damage = createRow(this.scoreBlock, 'Повреждение оригинала');
    this.marble = createRow(this.scoreBlock, 'Снято мрамора');
    this.time = createRow(this.scoreBlock, 'Время в мастерской');
    this.payout = createRow(this.scoreBlock, 'Оплата заказа');

    this.verdict = document.createElement('p');
    this.verdict.className = 'verdict';

    this.complete = document.createElement('p');
    this.complete.className = 'complete-copy is-hidden';
    this.complete.textContent = COMPLETE_COPY;

    this.workshopButton = document.createElement('button');
    this.workshopButton.type = 'button';
    this.workshopButton.textContent = 'Вернуться в мастерскую';
    this.workshopButton.addEventListener('click', cb.onContinue);
    this.actions.push(this.workshopButton);

    this.restartButton = document.createElement('button');
    this.restartButton.type = 'button';
    this.restartButton.className = 'is-hidden';
    this.restartButton.textContent = 'Начать заново';
    this.restartButton.addEventListener('click', cb.onRestart);
    this.actions.push(this.restartButton);

    this.element.append(
      this.title,
      this.scoreBlock,
      this.verdict,
      this.complete,
      this.workshopButton,
      this.restartButton,
    );
    root.appendChild(this.element);
  }

  show(score: ScoreResult, payoutCents: number): void {
    const percent = Math.round(score.sculptureDamageAvg * 100);
    this.damage.textContent =
      score.sculptureRuined === 0 && percent === 0
        ? 'ни одной царапины'
        : `${score.sculptureRuined} из ${score.sculptureTotal} ${plural(score.sculptureTotal, ['клетки', 'клеток', 'клеток'])} добито, средний урон ${percent}%`;

    this.marble.textContent = `${score.marbleDestroyed} ${plural(score.marbleDestroyed, ['блок', 'блока', 'блоков'])} из ${score.marbleTotal}`;
    this.time.textContent = formatTime(score.timeSeconds);
    this.payout.textContent = formatDollars(payoutCents);
    this.verdict.textContent = score.verdict;
    this.title.textContent = 'Работа принята';
    this.scoreBlock.classList.remove('is-hidden');
    this.verdict.classList.remove('is-hidden');
    this.complete.classList.add('is-hidden');
    this.workshopButton.classList.remove('is-hidden');
    this.restartButton.classList.add('is-hidden');
    this.element.classList.remove('is-hidden');
  }

  showComplete(): void {
    this.title.textContent = 'Поздравляем!';
    this.scoreBlock.classList.add('is-hidden');
    this.verdict.classList.add('is-hidden');
    this.complete.classList.remove('is-hidden');
    this.workshopButton.classList.add('is-hidden');
    this.restartButton.classList.remove('is-hidden');
    this.element.classList.remove('is-hidden');
  }

  setEnabled(enabled: boolean): void {
    for (const button of this.actions) button.disabled = !enabled;
  }

  hide(): void {
    this.element.classList.add('is-hidden');
  }

  destroy(): void {
    this.element.remove();
  }
}

function createRow(parent: HTMLElement, label: string): HTMLParagraphElement {
  const row = document.createElement('div');
  row.className = 'score-row';

  const name = document.createElement('span');
  name.textContent = label;

  const value = document.createElement('p');

  row.append(name, value);
  parent.appendChild(row);
  return value;
}
