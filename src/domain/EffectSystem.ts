export type EffectId = 'oneshot' | 'haste' | 'care';

export interface EffectInfo {
  id: EffectId;
  emoji: string;
  title: string;
  refuse: string;
  blurb: string;
}

export const EFFECT_CATALOG: Record<EffectId, EffectInfo> = {
  haste: {
    id: 'haste',
    emoji: '🚬',
    title: 'Сигареты',
    refuse: 'Я совсем недавно курил',
    blurb: 'Долбишь в два раза быстрее',
  },
  oneshot: {
    id: 'oneshot',
    emoji: '🍺',
    title: 'Пиво',
    refuse: 'Я совсем недавно пил',
    blurb: 'Мрамор снимается сразу, с одного касания',
  },
  care: {
    id: 'care',
    emoji: '💎',
    title: 'Кристалл',
    refuse: 'Я совсем недавно нюхал',
    blurb: 'Зелёные клетки оригинала не получают урон',
  },
};

const ORDER: readonly EffectId[] = ['haste', 'oneshot', 'care'];

export interface ActiveEffect {
  id: EffectId;
  remaining: number;
}

/** Временные баффы долбёжки. Время тикает только когда игра сама вызывает update. */
export class EffectSystem {
  private readonly remaining = new Map<EffectId, number>();

  grant(id: EffectId, seconds: number): void {
    if (seconds <= 0) return;
    this.remaining.set(id, Math.max(this.remaining.get(id) ?? 0, seconds));
  }

  has(id: EffectId): boolean {
    return (this.remaining.get(id) ?? 0) > 0;
  }

  update(dt: number): void {
    for (const id of ORDER) {
      const left = this.remaining.get(id);
      if (left === undefined) continue;
      const next = left - dt;
      if (next <= 0) this.remaining.delete(id);
      else this.remaining.set(id, next);
    }
  }

  snapshot(): ActiveEffect[] {
    const list: ActiveEffect[] = [];
    for (const id of ORDER) {
      const left = this.remaining.get(id);
      if (left === undefined || left <= 0) continue;
      list.push({ id, remaining: left });
    }
    return list;
  }

  clear(): void {
    this.remaining.clear();
  }
}
