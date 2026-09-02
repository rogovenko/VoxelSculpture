import { CONFIG } from '../config';
import type { InteractKind } from '../domain/levels/layoutToDecor';

export const INTERACT_HINTS: Record<InteractKind, { prompt: string; thought: string | null }> = {
  desk: { prompt: 'Сдать работу', thought: 'Заказ еще не готов!' },
  phone: { prompt: 'Позвонить в доставку', thought: null },
  letter: { prompt: 'Прочитать ТЗ', thought: null },
  diary: { prompt: 'Открыть дневник', thought: null },
  bed: { prompt: 'Поспать', thought: 'Сон для слабаков' },
  armchair: { prompt: 'Расслабиться', thought: 'Телевизор показывает неинтересную передачу' },
  boxPile: { prompt: 'Разобрать вещи', thought: 'Есть более важные дела' },
  cabinet: { prompt: 'Осмотреть', thought: 'Здесь хранятся мои награды, которых нет' },
  door: { prompt: 'Выйти', thought: 'Не выходи из комнаты, не совершай ошибку' },
  television: { prompt: 'Включить', thought: 'Он не рабатает. Как и я в данный момент' },
};

type ThoughtJob = { text: string; ms: number };

export class InteractHint {
  private readonly prompt: HTMLDivElement;
  private readonly thought: HTMLParagraphElement;
  private promptText: string | null = null;
  private thoughtTimer = 0;
  private showing = false;
  private readonly queue: ThoughtJob[] = [];

  constructor(root: HTMLElement) {
    this.prompt = document.createElement('div');
    this.prompt.className = 'interact-prompt';

    this.thought = document.createElement('p');
    this.thought.className = 'interact-thought';

    root.append(this.prompt, this.thought);
  }

  setLook(kind: InteractKind | null): void {
    const text = kind === null ? null : INTERACT_HINTS[kind].prompt;
    if (text === this.promptText) return;
    this.promptText = text;
    if (text === null) {
      this.prompt.classList.remove('is-in');
      return;
    }
    this.prompt.textContent = text;
    this.prompt.classList.add('is-in');
  }

  /** Клик по реквизиту: сразу, очередь сюжетных реплик сбрасывается. */
  think(text: string, ms: number = CONFIG.cues.thoughtMs): void {
    this.queue.length = 0;
    this.present(text, ms);
  }

  /** Сюжет и пороги сколов: если мысль уже на экране — встаёт в очередь. */
  cue(text: string, ms: number = CONFIG.cues.hintMs): void {
    if (this.showing) {
      this.queue.push({ text, ms });
      return;
    }
    this.present(text, ms);
  }

  hide(): void {
    this.promptText = null;
    this.prompt.classList.remove('is-in');
    this.thought.classList.remove('is-in');
    this.showing = false;
    this.queue.length = 0;
    window.clearTimeout(this.thoughtTimer);
  }

  destroy(): void {
    window.clearTimeout(this.thoughtTimer);
    this.prompt.remove();
    this.thought.remove();
  }

  private present(text: string, ms: number): void {
    this.showing = true;
    this.thought.textContent = text;
    this.thought.classList.remove('is-in');
    void this.thought.offsetWidth;
    this.thought.classList.add('is-in');
    window.clearTimeout(this.thoughtTimer);
    this.thoughtTimer = window.setTimeout(() => this.advance(), ms);
  }

  private advance(): void {
    const next = this.queue.shift();
    if (next === undefined) {
      this.showing = false;
      this.thought.classList.remove('is-in');
      return;
    }
    this.present(next.text, next.ms);
  }
}
