import { LEVELS } from '../domain/levels/catalog';

const DEFAULT_HINT =
  'WASD — ходить, Space — прыжок, C — присесть, W у лестницы — подъём, Shift — спуск, ' +
  'мышь — обзор, ЛКМ — долбить, ПКМ — шире обзор';

export interface StartOverlayCallbacks {
  onSelectLevel: (id: string) => void;
  onContinue: () => void;
}

export class StartOverlay {
  private readonly element: HTMLDivElement;
  private readonly hint: HTMLParagraphElement;
  private readonly levels: HTMLDivElement;
  private readonly button: HTMLButtonElement;

  constructor(
    root: HTMLElement,
    private readonly cb: StartOverlayCallbacks,
  ) {
    this.element = document.createElement('div');
    this.element.className = 'overlay is-hidden';

    const title = document.createElement('h1');
    title.textContent = 'SculptureCraft';

    this.hint = document.createElement('p');
    this.hint.textContent = DEFAULT_HINT;

    this.levels = document.createElement('div');
    this.levels.className = 'levels';
    for (const level of LEVELS) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'level-tile';
      tile.textContent = String(level.number);
      tile.title = level.title;
      tile.disabled = level.create === null;
      tile.addEventListener('click', () => {
        tile.blur();
        this.cb.onSelectLevel(level.id);
      });
      this.levels.appendChild(tile);
    }

    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.textContent = 'Продолжить';
    this.button.addEventListener('click', this.cb.onContinue);

    this.element.append(title, this.hint, this.levels, this.button);
    root.appendChild(this.element);
  }

  show(mode: 'start' | 'resume' = 'start', hint?: string): void {
    this.hint.textContent = hint ?? DEFAULT_HINT;
    this.levels.classList.toggle('is-hidden', mode !== 'start');
    this.button.classList.toggle('is-hidden', mode === 'start');
    this.button.disabled = false;
    this.element.classList.remove('is-hidden');
  }

  setEnabled(enabled: boolean): void {
    this.button.disabled = !enabled;
  }

  /** Слот под дополнительный блок: отладочное меню должно жить внутри оверлея. */
  mount(element: HTMLElement): void {
    this.element.appendChild(element);
  }

  hide(): void {
    this.element.classList.add('is-hidden');
  }

  destroy(): void {
    this.element.remove();
  }
}
