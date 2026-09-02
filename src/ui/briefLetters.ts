import { CONFIG } from '../config';

export interface BriefLetter {
  paragraphs: string[];
}

function dollars(cents: number): string {
  const n = cents / 100;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function pay(levelId: string): string {
  const table = CONFIG.money.payouts as Record<string, number>;
  return dollars(table[levelId] ?? 0);
}

const LETTERS: Record<string, (fee: string) => BriefLetter> = {
  frog: (fee) => ({
    paragraphs: [
      'Уважаемый г-н В.,',
      'сердечно благодарим, что согласились изваять лягушку для сада камней при нашем буддистском храме. Она стоит у дорожки и, по уверению старших, направляет ци. Прежняя, к прискорбию, пала жертвой вандала и обращена в щебень. Без неё поток энергии в храм оскудел, монахи нервничают, сад молчит.',
      `Просим не мешкать. Гонорар — ${fee} долларов.`,
      'Искренне Ваш,\nнастоятель храма на Beacon Street\nSamuel Goldberg',
    ],
  }),
  chick: (fee) => ({
    paragraphs: [
      'Уважаемый г-н В.,',
      `обращаюсь к Вам как директор детского дома «Птенцы». Дети давно просят статую птенца на площадку — чтобы было кого обнимать и перед кем отчитываться за кашу. Настоящего скульптора нам не осилить: в кассе всего ${fee} долларов. Надеемся на Ваше понимание и на то, что мрамор простит бюджет.`,
      'Заранее благодарны.',
      'С уважением,\nдиректор детского дома «Птенцы»\nMargaret Brennan',
    ],
  }),
  buddha: (fee) => ({
    paragraphs: [
      'Уважаемый г-н В.,',
      'пишет снова Goldberg. Лягушка сработала сверх меры: ци ударила по храму такой струёй, что в неё полился бесконечно огромный поток инвестиций. Совет решил не искушать судьбу и поставить перед храмом Будду — чтобы энергия знала, куда приземляться, а вкладчики — на что смотреть.',
      `Мрамора не жалейте. Гонорар — ${fee} долларов. Касса храма, наконец, не шутит.`,
      'Искренне Ваш,\nнастоятель храма на Beacon Street\nSamuel Goldberg',
    ],
  }),
};

const FALLBACK: BriefLetter = {
  paragraphs: ['Письмо выцвело. Кажется, заказ всё же был.'],
};

export function briefFor(levelId: string): BriefLetter {
  const make = LETTERS[levelId];
  return make === undefined ? FALLBACK : make(pay(levelId));
}
