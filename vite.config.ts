import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { parseVox, voxToGame } from './src/domain/levels/vox';

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
  build: { target: 'es2022' },
});
