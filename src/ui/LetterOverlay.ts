export interface LetterOverlayCallbacks {
  onClose: () => void;
}

export class LetterOverlay {
  private readonly element: HTMLDivElement;
  private readonly title: HTMLHeadingElement;
  private readonly body: HTMLDivElement;
  private readonly closeButton: HTMLButtonElement;
  private hideTimer = 0;
  private open = false;

  constructor(
    root: HTMLElement,
    private readonly cb: LetterOverlayCallbacks,
  ) {
    this.element = document.createElement('div');
    this.element.className = 'overlay letter-overlay is-hidden';

    this.title = document.createElement('h1');

    this.body = document.createElement('div');
    this.body.className = 'letter-body';

    this.closeButton = document.createElement('button');
    this.closeButton.type = 'button';
    this.closeButton.textContent = 'Закрыть';
    this.closeButton.addEventListener('click', () => {
      this.closeButton.blur();
      this.cb.onClose();
    });

    const sheet = document.createElement('div');
    sheet.className = 'letter-sheet';
    sheet.append(this.title, this.body, this.closeButton);
    this.element.append(sheet);
    root.appendChild(this.element);
  }

  show(kind: 'letter' | 'diary', title: string, paragraphs: readonly string[]): void {
    this.open = true;
    this.clearHideTimer();
    this.element.classList.toggle('is-diary', kind === 'diary');
    this.element.classList.toggle('is-brief', kind === 'letter');
    this.title.textContent = title;
    this.body.replaceChildren();
    for (const text of paragraphs) {
      const p = document.createElement('p');
      p.textContent = text;
      this.body.appendChild(p);
    }
    this.element.classList.remove('is-hidden');
    this.element.classList.remove('is-in');
    window.addEventListener('keydown', this.onKeyDown);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!this.open) return;
        this.element.classList.add('is-in');
      });
    });
  }

  setCloseEnabled(enabled: boolean): void {
    this.closeButton.disabled = !enabled;
  }

  hide(): void {
    this.open = false;
    window.removeEventListener('keydown', this.onKeyDown);
    this.element.classList.remove('is-in');
    if (this.element.classList.contains('is-hidden')) {
      this.clearHideTimer();
      return;
    }
    this.clearHideTimer();
    this.hideTimer = window.setTimeout(() => {
      this.element.classList.add('is-hidden');
      this.hideTimer = 0;
    }, 480);
  }

  destroy(): void {
    this.open = false;
    this.clearHideTimer();
    window.removeEventListener('keydown', this.onKeyDown);
    this.element.remove();
  }

  private clearHideTimer(): void {
    if (this.hideTimer === 0) return;
    window.clearTimeout(this.hideTimer);
    this.hideTimer = 0;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== 'Escape') return;
    event.preventDefault();
    this.cb.onClose();
  };
}
