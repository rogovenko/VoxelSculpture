export function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export class WalletHud {
  private readonly element: HTMLDivElement;
  private readonly plate: HTMLDivElement;
  private readonly amount: HTMLSpanElement;
  private readonly floatRoot: HTMLDivElement;
  private cents = 0;
  private shown = 0;
  private pendingGain = 0;
  private floaterTimer = 0;
  private rollTimer = 0;

  constructor(root: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'wallet';

    this.plate = document.createElement('div');
    this.plate.className = 'wallet-plate';

    const label = document.createElement('p');
    label.className = 'wallet-label';
    label.textContent = 'Наличные';

    this.floatRoot = document.createElement('div');
    this.floatRoot.className = 'wallet-float-root';
    this.amount = document.createElement('span');
    this.amount.className = 'wallet-amount';
    this.floatRoot.append(this.amount);

    this.plate.append(label, this.floatRoot);
    this.element.append(this.plate);
    root.appendChild(this.element);
    this.writeAmount();
  }

  /** Старт и траты: без всплывающего плюса. */
  set(cents: number): void {
    this.cents = Math.max(0, cents);
    this.shown = this.cents;
    this.writeAmount();
  }

  add(cents: number): void {
    if (cents <= 0) return;
    this.cents += cents;
    this.pendingGain += cents;
    this.kickRoll();
    this.pulse();
    this.scheduleFloater();
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
    window.clearTimeout(this.floaterTimer);
    window.clearTimeout(this.rollTimer);
    this.element.remove();
  }

  private writeAmount(): void {
    this.amount.textContent = formatDollars(this.shown);
  }

  private kickRoll(): void {
    if (this.rollTimer !== 0) return;
    const step = (): void => {
      const diff = this.cents - this.shown;
      if (diff <= 0) {
        this.shown = this.cents;
        this.writeAmount();
        this.rollTimer = 0;
        return;
      }
      this.shown += Math.max(1, Math.ceil(diff * 0.4));
      this.writeAmount();
      this.rollTimer = window.setTimeout(step, 32);
    };
    this.rollTimer = window.setTimeout(step, 16);
  }

  private pulse(): void {
    this.plate.classList.remove('is-gain');
    void this.plate.offsetWidth;
    this.plate.classList.add('is-gain');
  }

  private scheduleFloater(): void {
    if (this.floaterTimer !== 0) return;
    this.floaterTimer = window.setTimeout(() => {
      this.floaterTimer = 0;
      const gain = this.pendingGain;
      this.pendingGain = 0;
      if (gain > 0) this.spawnFloater(gain);
    }, 70);
  }

  private spawnFloater(cents: number): void {
    const chip = document.createElement('span');
    chip.className = 'wallet-floater';
    chip.textContent = `+${formatDollars(cents)}`;
    chip.addEventListener('animationend', () => chip.remove());
    this.floatRoot.append(chip);
  }
}
