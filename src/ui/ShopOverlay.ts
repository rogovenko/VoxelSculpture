import { CONFIG } from '../config';
import { EFFECT_CATALOG, type EffectId } from '../domain/EffectSystem';
import { formatDollars } from './WalletHud';

export interface ShopOverlayCallbacks {
  onBuy: (id: EffectId) => void;
  onClose: () => void;
}

interface ShopRow {
  id: EffectId;
  button: HTMLButtonElement;
}

export class ShopOverlay {
  private readonly element: HTMLDivElement;
  private readonly refuse: HTMLParagraphElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly rows: ShopRow[] = [];

  constructor(
    root: HTMLElement,
    private readonly cb: ShopOverlayCallbacks,
  ) {
    this.element = document.createElement('div');
    this.element.className = 'overlay shop-overlay is-hidden';

    const title = document.createElement('h1');
    title.textContent = 'Заказ по телефону';

    const hint = document.createElement('p');
    hint.textContent = 'Сигареты, пиво, кристалл. Наличные с кассы.';

    const list = document.createElement('div');
    list.className = 'shop-list';
    for (const item of CONFIG.effects.shop) {
      const info = EFFECT_CATALOG[item.id];
      const card = document.createElement('div');
      card.className = 'shop-card';

      const emoji = document.createElement('span');
      emoji.className = 'shop-card-emoji';
      emoji.textContent = info.emoji;

      const meta = document.createElement('div');
      meta.className = 'shop-card-meta';
      const name = document.createElement('p');
      name.className = 'shop-card-name';
      name.textContent = info.title;
      const blurb = document.createElement('p');
      blurb.className = 'shop-card-blurb';
      blurb.textContent = `${info.blurb}. ${item.duration} с.`;
      const detail = document.createElement('p');
      detail.className = 'shop-card-detail';
      detail.textContent = formatDollars(item.cents);
      meta.append(name, blurb, detail);

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Купить';
      button.addEventListener('click', () => {
        button.blur();
        this.cb.onBuy(item.id);
      });

      card.append(emoji, meta, button);
      list.append(card);
      this.rows.push({ id: item.id, button });
    }

    this.refuse = document.createElement('p');
    this.refuse.className = 'shop-refuse';

    this.closeButton = document.createElement('button');
    this.closeButton.type = 'button';
    this.closeButton.textContent = 'Повесить трубку';
    this.closeButton.addEventListener('click', () => {
      this.closeButton.blur();
      this.cb.onClose();
    });

    this.element.append(title, hint, list, this.refuse, this.closeButton);
    root.appendChild(this.element);
  }

  show(cents: number, active: ReadonlySet<EffectId>): void {
    this.refuse.textContent = '';
    this.sync(cents, active);
    this.element.classList.remove('is-hidden');
    window.addEventListener('keydown', this.onKeyDown);
  }

  sync(cents: number, _active: ReadonlySet<EffectId>): void {
    for (const row of this.rows) {
      const item = CONFIG.effects.shop.find((entry) => entry.id === row.id);
      if (item === undefined) continue;
      row.button.disabled = cents < item.cents;
    }
  }

  setRefuse(text: string): void {
    this.refuse.textContent = text;
  }

  setCloseEnabled(enabled: boolean): void {
    this.closeButton.disabled = !enabled;
  }

  hide(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.element.classList.add('is-hidden');
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.element.remove();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== 'Escape') return;
    event.preventDefault();
    this.cb.onClose();
  };
}
