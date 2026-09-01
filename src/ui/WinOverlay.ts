import type { ScoreResult } from '../domain/ScoreSystem';

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

export class WinOverlay {
  private readonly element: HTMLDivElement;
  private readonly damage: HTMLParagraphElement;
  private readonly marble: HTMLParagraphElement;
  private readonly time: HTMLParagraphElement;
  private readonly verdict: HTMLParagraphElement;

  constructor(root: HTMLElement, onRestart: () => void) {
    this.element = document.createElement('div');
    this.element.className = 'overlay is-hidden';

    const title = document.createElement('h1');
    title.textContent = 'Работа принята';

    const score = document.createElement('div');
    score.className = 'score';
    this.damage = createRow(score, 'Повреждение оригинала');
    this.marble = createRow(score, 'Снято мрамора');
    this.time = createRow(score, 'Время в мастерской');

    this.verdict = document.createElement('p');
    this.verdict.className = 'verdict';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Заново';
    button.addEventListener('click', onRestart);

    this.element.append(title, score, this.verdict, button);
    root.appendChild(this.element);
  }

  show(score: ScoreResult): void {
    const percent = Math.round(score.sculptureDamageAvg * 100);
    this.damage.textContent =
      score.sculptureRuined === 0 && percent === 0
        ? 'ни одной царапины'
        : `${score.sculptureRuined} из ${score.sculptureTotal} ${plural(score.sculptureTotal, ['клетки', 'клеток', 'клеток'])} добито, средний урон ${percent}%`;

    this.marble.textContent = `${score.marbleDestroyed} ${plural(score.marbleDestroyed, ['блок', 'блока', 'блоков'])} из ${score.marbleTotal}`;
    this.time.textContent = formatTime(score.timeSeconds);
    this.verdict.textContent = score.verdict;
    this.element.classList.remove('is-hidden');
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
