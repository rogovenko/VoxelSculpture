const DESK_HINT = 'Нажмите на рабочий стол, чтобы сдать работу';
const BED_HINT = 'Нажмите на кровать, чтобы поспать';

export class MarbleBar {
  private readonly element: HTMLDivElement;
  private readonly fill: HTMLDivElement;
  private readonly gone: HTMLSpanElement;
  private readonly left: HTMLSpanElement;
  private readonly submitHint: HTMLParagraphElement;
  private submitted = false;

  constructor(root: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'marble-bar';

    const label = document.createElement('p');
    label.className = 'marble-bar-label';
    label.textContent = 'Долбежка камня';

    const track = document.createElement('div');
    track.className = 'marble-bar-track';
    this.fill = document.createElement('div');
    this.fill.className = 'marble-bar-fill';
    track.append(this.fill);

    const stats = document.createElement('div');
    stats.className = 'marble-bar-stats';
    this.gone = document.createElement('span');
    this.left = document.createElement('span');
    stats.append(this.gone, this.left);

    this.submitHint = document.createElement('p');
    this.submitHint.className = 'marble-bar-submit is-hidden';
    this.submitHint.textContent = DESK_HINT;

    this.element.append(label, track, stats, this.submitHint);
    root.appendChild(this.element);
    this.set(0, 0);
  }

  set(total: number, remaining: number): void {
    const left = Math.max(0, remaining);
    const all = Math.max(0, total);
    const gone = Math.max(0, all - left);
    const ratio = all === 0 ? 0 : gone / all;
    this.fill.style.transform = `scaleX(${ratio})`;
    this.gone.textContent = `Выдолблено ${gone} из ${all}`;
    this.left.textContent = `осталось ${left}`;
    if (all === 0 || left > 0) {
      this.submitted = false;
      this.submitHint.textContent = DESK_HINT;
      this.submitHint.classList.add('is-hidden');
      return;
    }
    this.submitHint.textContent = this.submitted ? BED_HINT : DESK_HINT;
    this.submitHint.classList.remove('is-hidden');
  }

  /** После первой сдачи стола: дальше к кровати. */
  markSubmitted(): void {
    this.submitted = true;
    this.submitHint.textContent = BED_HINT;
    this.submitHint.classList.remove('is-hidden');
  }

  show(): void {
    this.element.classList.remove('is-in');
    void this.element.offsetWidth;
    this.element.classList.add('is-in');
  }

  hide(): void {
    this.element.classList.remove('is-in');
  }

  destroy(): void {
    this.element.remove();
  }
}
