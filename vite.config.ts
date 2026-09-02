import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { parseVox, voxToGame } from './src/domain/levels/vox';

const root = dirname(fileURLToPath(import.meta.url));

/** `.vox` → модуль с клетками уже в осях игры (Y вверх). Правка файла подхватывается HMR. */
function voxModulePlugin(): Plugin {
  return {
    name: 'vox-module',
    enforce: 'pre',
    load(id) {
      const file = id.split('?')[0];
      if (!file.endsWith('.vox')) return null;
      this.addWatchFile(file);
      const buf = readFileSync(file);
      const model = parseVox(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
      return `export default ${JSON.stringify(voxToGame(model))};`;
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [voxModulePlugin()],
  build: {
    target: 'es2022',
    rollupOptions: {
      // Редактор расстановки — только `npm.cmd run dev` → /editor.html
      input: resolve(root, 'index.html'),
    },
  },
  // FBX и хвосты копирования (.001_) на Windows часто залочены — вотчер на них падает.
  server: {
    watch: {
      ignored: ['**/assets/fbx/**', '**/*.001_', '**/*._'],
    },
  },
});
