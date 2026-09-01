export interface DebugMenuCallbacks {
  onOneShotChange: (enabled: boolean) => void;
  onKeepSingleVoxel: () => void;
}

/**
 * Отладочный блок внутри меню паузы. Живёт отдельным файлом, чтобы игровые оверлеи
 * не обрастали служебными кнопками: этот блок можно выкинуть целиком, ничего не сломав.
 */
export class DebugMenu {
  readonly element: HTMLDivElement;

  private readonly toggle: HTMLInputElement;

  constructor(private readonly cb: DebugMenuCallbacks) {
    this.element = document.createElement('div');
    this.element.className = 'debug is-hidden';

    const title = document.createElement('span');
    title.className = 'debug-title';
    title.textContent = 'Отладка';

    const label = document.createElement('label');
    label.className = 'debug-row';

    this.toggle = document.createElement('input');
    this.toggle.type = 'checkbox';
    this.toggle.addEventListener('change', this.onToggle);

    const caption = document.createElement('span');
    caption.textContent = 'Ваншот: мрамор с одного касания';
    label.append(this.toggle, caption);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'debug-button';
    button.textContent = 'Оставить один воксель';
    button.addEventListener('click', this.onKeepSingle);

    this.element.append(title, label, button);
  }

  show(): void {
    this.element.classList.remove('is-hidden');
  }

  hide(): void {
    this.element.classList.add('is-hidden');
  }

  destroy(): void {
    this.element.remove();
  }

  // Снимаем фокус с элемента управления: иначе Space и Enter в игре продолжали бы
  // щёлкать по нему, а не прыгать.
  private readonly onToggle = (): void => {
    this.toggle.blur();
    this.cb.onOneShotChange(this.toggle.checked);
  };

  private readonly onKeepSingle = (event: MouseEvent): void => {
    (event.currentTarget as HTMLButtonElement).blur();
    this.cb.onKeepSingleVoxel();
  };
}
