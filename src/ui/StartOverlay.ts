const GAME_TITLE = 'Невероятно Точный Симулятор Скульптора';

const START_COPY = [
  'Это прототип: в игре нет музыки и очень ограниченный функционал.',
  'Пожалуйста, постарайтесь ответить на два вопроса, когда будете играть: что можно добавить в игру и захотелось ли вам подолбить камень.',
  'История такая: вы — голодающий скульптор, выполняете заказы.',
] as const;

const PAUSE_BINDS: readonly { keys: readonly string[]; label: string; cluster?: 'wasd' }[] = [
  { keys: ['W', 'A', 'S', 'D'], label: 'Ходить', cluster: 'wasd' },
  { keys: ['Space'], label: 'Прыжок' },
  { keys: ['C'], label: 'Присесть' },
  { keys: ['W'], label: 'Подъём по лестнице' },
  { keys: ['Shift'], label: 'Спуск по лестнице' },
  { keys: ['Мышь'], label: 'Обзор' },
  { keys: ['ЛКМ'], label: 'Долбить' },
  { keys: ['ПКМ'], label: 'Шире обзор' },
];

export interface StartOverlayCallbacks {
  onContinue: () => void;
}

export class StartOverlay {
  private readonly element: HTMLDivElement;
  private readonly startCopy: HTMLDivElement;
  private readonly pausePanel: HTMLDivElement;
  private readonly pauseNotice: HTMLParagraphElement;
  private readonly button: HTMLButtonElement;

  constructor(
    root: HTMLElement,
    private readonly cb: StartOverlayCallbacks,
  ) {
    this.element = document.createElement('div');
    this.element.className = 'overlay is-hidden';

    const title = document.createElement('h1');
    title.className = 'start-title';
    title.textContent = GAME_TITLE;

    this.startCopy = document.createElement('div');
    this.startCopy.className = 'start-copy';
    for (const text of START_COPY) {
      const p = document.createElement('p');
      p.textContent = text;
      this.startCopy.appendChild(p);
    }

    this.pausePanel = document.createElement('div');
    this.pausePanel.className = 'pause-panel is-hidden';

    const kicker = document.createElement('p');
    kicker.className = 'pause-kicker';
    kicker.textContent = 'Пауза';

    this.pauseNotice = document.createElement('p');
    this.pauseNotice.className = 'pause-notice is-hidden';

    const keys = document.createElement('div');
    keys.className = 'pause-keys';
    for (const bind of PAUSE_BINDS) keys.appendChild(createBind(bind));

    this.pausePanel.append(kicker, this.pauseNotice, keys);

    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.textContent = 'Начать';
    this.button.addEventListener('click', this.cb.onContinue);

    this.element.append(title, this.startCopy, this.pausePanel, this.button);
    root.appendChild(this.element);
  }

  show(mode: 'start' | 'resume' = 'start', hint?: string): void {
    const isStart = mode === 'start';
    this.element.classList.toggle('is-start', isStart);
    this.element.classList.toggle('is-pause', !isStart);
    this.startCopy.classList.toggle('is-hidden', !isStart);
    this.pausePanel.classList.toggle('is-hidden', isStart);
    const hasNotice = hint !== undefined && hint.length > 0;
    this.pauseNotice.classList.toggle('is-hidden', isStart || !hasNotice);
    this.pauseNotice.textContent = hint ?? '';
    this.button.textContent = isStart ? 'Начать' : 'Продолжить';
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

function createBind(bind: (typeof PAUSE_BINDS)[number]): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'pause-bind';

  const keys = document.createElement('div');
  keys.className = bind.cluster === 'wasd' ? 'key-cluster is-wasd' : 'key-cluster';
  for (const name of bind.keys) {
    const key = document.createElement('span');
    key.className = `key${name.length > 1 ? ' is-wide' : ''}`;
    if (bind.cluster === 'wasd') key.classList.add(`is-${name.toLowerCase()}`);
    key.textContent = name;
    keys.appendChild(key);
  }

  const label = document.createElement('span');
  label.className = 'pause-bind-label';
  label.textContent = bind.label;

  row.append(keys, label);
  return row;
}
