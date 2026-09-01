import './ui/styles.css';
import { Game } from './app/Game';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
const ui = document.querySelector<HTMLElement>('#ui');
if (!canvas || !ui) {
  throw new Error('Required DOM nodes #scene and #ui not found');
}

const game = new Game(canvas, ui);
game.start();
