import { EFFECT_CATALOG, type ActiveEffect, type EffectId } from '../domain/EffectSystem';

export class EffectHud {
  private readonly element: HTMLDivElement;
  private readonly chips = new Map<EffectId, { root: HTMLDivElement; time: HTMLSpanElement }>();

  constructor(root: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'effect-hud';
    root.appendChild(this.element);
  }

  sync(active: readonly ActiveEffect[]): void {
    const seen = new Set<EffectId>();
    for (const effect of active) {
      seen.add(effect.id);
      const chip = this.chips.get(effect.id) ?? this.mount(effect.id);
      chip.time.textContent = `${effect.remaining.toFixed(1)}с`;
    }
    for (const [id, chip] of this.chips) {
      if (seen.has(id)) continue;
      chip.root.remove();
      this.chips.delete(id);
    }
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
    this.chips.clear();
  }

  private mount(id: EffectId): { root: HTMLDivElement; time: HTMLSpanElement } {
    const info = EFFECT_CATALOG[id];
    const root = document.createElement('div');
    root.className = 'effect-chip';

    const emoji = document.createElement('span');
    emoji.className = 'effect-chip-emoji';
    emoji.textContent = info.emoji;

    const meta = document.createElement('div');
    meta.className = 'effect-chip-meta';

    const title = document.createElement('p');
    title.className = 'effect-chip-title';
    title.textContent = info.title;

    const time = document.createElement('span');
    time.className = 'effect-chip-time';

    meta.append(title, time);
    root.append(emoji, meta);
    this.element.append(root);

    const chip = { root, time };
    this.chips.set(id, chip);
    return chip;
  }
}
