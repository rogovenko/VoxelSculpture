export class SleepOverlay {
  private readonly element: HTMLDivElement;
  private readonly caption: HTMLParagraphElement;

  constructor(root: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'sleep-veil is-hidden';

    this.caption = document.createElement('p');
    this.caption.className = 'sleep-day';
    this.element.appendChild(this.caption);
    root.appendChild(this.element);
  }

  show(): void {
    this.element.classList.remove('is-hidden');
    this.element.classList.add('is-visible');
  }

  setFade(alpha: number): void {
    const t = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
    this.element.style.opacity = String(t);
  }

  setDay(day: number): void {
    this.caption.textContent = `День ${day}`;
  }

  setCaption(visible: boolean): void {
    this.caption.classList.toggle('is-on', visible);
  }

  hide(): void {
    this.element.classList.add('is-hidden');
    this.element.classList.remove('is-visible');
    this.caption.classList.remove('is-on');
    this.element.style.opacity = '0';
  }

  destroy(): void {
    this.element.remove();
  }
}
