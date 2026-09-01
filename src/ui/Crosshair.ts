export class Crosshair {
  private readonly element: HTMLDivElement;

  constructor(root: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'crosshair is-hidden';

    const horizontal = document.createElement('span');
    horizontal.className = 'crosshair-line crosshair-line--h';
    const vertical = document.createElement('span');
    vertical.className = 'crosshair-line crosshair-line--v';

    this.element.append(horizontal, vertical);
    root.appendChild(this.element);
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
}
