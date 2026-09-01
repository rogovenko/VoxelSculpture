import * as THREE from 'three';
import { CONFIG } from '../config';
import type { ArenaBoxKind, ArenaLayout } from '../domain/levels/arena';

const COLORS: Record<ArenaBoxKind, number> = {
  floor: CONFIG.colors.floor,
  structure: CONFIG.colors.blockout,
  ladder: CONFIG.colors.ladder,
  decor: CONFIG.colors.decor,
};

/**
 * Меши строятся ровно по тем же коробкам, что и коллизия: второго списка нет,
 * иначе картинка и физика разъедутся при первой правке раскладки.
 */
export function createBlockout(arena: ArenaLayout): THREE.Group {
  const group = new THREE.Group();

  for (const box of [...arena.boxes, ...arena.ladders]) {
    // коробку, за которую отвечает модель, рисовать не надо — коллизия у неё остаётся
    if (box.invisible === true) continue;

    const width = box.maxX - box.minX;
    const height = box.maxY - box.minY;
    const depth = box.maxZ - box.minZ;

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshLambertMaterial({ color: COLORS[box.kind] }),
    );
    mesh.position.set(box.minX + width / 2, box.minY + height / 2, box.minZ + depth / 2);
    group.add(mesh);
  }

  return group;
}
