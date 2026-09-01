import * as THREE from 'three';

interface Polyline {
  stage: number;
  points: [number, number][];
}

/** Детерминированный LCG: стадии обязаны совпадать между запусками, иначе отладка невозможна. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function createCrackAtlas(stages: number, tileSize: number, seed: number): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = stages * tileSize;
  canvas.height = tileSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context is not available for the crack atlas');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const random = createRandom(seed);
  const segment = tileSize / 6;
  const polylines: Polyline[] = [];

  for (let i = 0; i < stages * 2; i++) {
    const points: [number, number][] = [];
    let x = tileSize * (0.3 + random() * 0.4);
    let y = tileSize * (0.3 + random() * 0.4);
    let angle = random() * Math.PI * 2;
    points.push([x, y]);

    const segments = 3 + Math.floor(random() * 4);
    for (let s = 0; s < segments; s++) {
      angle += (random() - 0.5) * 1.4;
      x += Math.cos(angle) * segment;
      y += Math.sin(angle) * segment;
      points.push([x, y]);
    }

    polylines.push({ stage: Math.floor(i / 2), points });
  }

  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';

  const widthSpan = Math.max(1, stages - 1);
  for (let stage = 0; stage < stages; stage++) {
    const offset = stage * tileSize;
    ctx.save();
    ctx.beginPath();
    ctx.rect(offset, 0, tileSize, tileSize);
    ctx.clip();
    ctx.lineWidth = 1 + (stage / widthSpan) * 1.5;

    for (const line of polylines) {
      if (line.stage > stage) continue;
      ctx.beginPath();
      ctx.moveTo(offset + line.points[0][0], line.points[0][1]);
      for (let p = 1; p < line.points.length; p++) {
        ctx.lineTo(offset + line.points[p][0], line.points[p][1]);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}
