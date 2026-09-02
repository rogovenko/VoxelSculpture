import '../ui/styles.css';
import './editor.css';
import { parseFurnitureLayout } from '../domain/levels/furnitureCatalog';
import { LayoutEditor } from './LayoutEditor';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
const rotateBtn = document.querySelector<HTMLButtonElement>('#rotate');
const saveBtn = document.querySelector<HTMLButtonElement>('#save');
const loadInput = document.querySelector<HTMLInputElement>('#load');
const status = document.querySelector<HTMLElement>('#status');
if (!canvas || !rotateBtn || !saveBtn || !loadInput || !status) {
  throw new Error('editor DOM nodes missing');
}

canvas.addEventListener('contextmenu', (event) => event.preventDefault());

const editor = new LayoutEditor(canvas, rotateBtn, status);
void editor.start();

rotateBtn.addEventListener('click', () => editor.rotateSelected());

saveBtn.addEventListener('click', () => {
  const layout = editor.currentLayout();
  const blob = new Blob([`${JSON.stringify(layout, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${layout.name}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

loadInput.addEventListener('change', async () => {
  const file = loadInput.files?.[0];
  loadInput.value = '';
  if (!file) return;
  try {
    const text = await file.text();
    editor.loadLayout(parseFurnitureLayout(JSON.parse(text) as unknown));
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'не открылось';
  }
});
