import * as THREE from 'three';
import { CONFIG } from '../config';
import type { ArenaBox, ArenaBoxKind } from '../domain/levels/arena';
import woodUrl from '../../assets/images/decorations/Wood_01.png';
import concreteUrl from '../../assets/images/decorations/Concrete_Tex.png';

const COLORS: Record<ArenaBoxKind, number> = {
  floor: 0xffffff,
  wall: CONFIG.colors.blockout,
  ceiling: CONFIG.colors.ceiling,
  structure: CONFIG.colors.blockout,
  ladder: CONFIG.colors.ladder,
  decor: CONFIG.colors.decor,
  table: 0xffffff,
};

const woodMap = loadTiled(woodUrl);
const concreteMap = loadTiled(concreteUrl);

function loadTiled(url: string): THREE.Texture {
  const map = new THREE.TextureLoader().load(url);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;
  return map;
}

/**
 * Меши строятся ровно по тем же коробкам, что и коллизия: второго списка нет,
 * иначе картинка и физика разъедутся при первой правке раскладки.
 */
export function createBlockout(
  boxes: readonly ArenaBox[],
  ladders: readonly ArenaBox[] = [],
): THREE.Group {
  const group = new THREE.Group();

  for (const box of [...boxes, ...ladders]) {
    // коробку, за которую отвечает модель, рисовать не надо — коллизия у неё остаётся
    if (box.invisible === true) continue;

    const extra = box.kind === 'floor' ? CONFIG.arena.floorOverhang : 0;
    const width = box.maxX - box.minX + 2 * extra;
    const height = box.maxY - box.minY;
    const depth = box.maxZ - box.minZ + 2 * extra;
    // Центр от коллизии, не от расширенного размера: иначе выступ уезжает
    // только в +X/+Z, а под южной дверью остаётся дыра в фон.
    const cx = (box.minX + box.maxX) / 2;
    const cy = box.minY + height / 2;
    const cz = (box.minZ + box.maxZ) / 2;

    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = materialFor(box.kind);
    if (box.kind === 'floor' || box.kind === 'table') {
      applyWorldUv(geometry, cx, cy, cz, 1 / CONFIG.arena.floorTile);
    } else if (box.kind === 'ceiling') {
      applyWorldUv(geometry, cx, cy, cz, 1 / CONFIG.arena.ceilingTile);
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(cx, cy, cz);
    group.add(mesh);
  }

  return group;
}

function materialFor(kind: ArenaBoxKind): THREE.MeshLambertMaterial | THREE.MeshBasicMaterial {
  if (kind === 'floor' || kind === 'table') {
    return new THREE.MeshLambertMaterial({ color: COLORS[kind], map: woodMap });
  }
  // Ламберт на нижней грани берёт тёмный грунт полусферы — бетон уезжает в грязь.
  if (kind === 'ceiling') {
    return new THREE.MeshBasicMaterial({ color: COLORS.ceiling, map: concreteMap });
  }
  return new THREE.MeshLambertMaterial({ color: COLORS[kind] });
}

/** Как у мрамора: пара осей от нормали, чтобы соседние грани продолжали один узор. */
function applyWorldUv(
  geometry: THREE.BufferGeometry,
  cx: number,
  cy: number,
  cz: number,
  scale: number,
): void {
  const pos = geometry.getAttribute('position');
  const nrm = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + cx;
    const y = pos.getY(i) + cy;
    const z = pos.getZ(i) + cz;
    const ax = Math.abs(nrm.getX(i));
    const ay = Math.abs(nrm.getY(i));
    const az = Math.abs(nrm.getZ(i));
    let u: number;
    let v: number;
    if (ay >= ax && ay >= az) {
      u = x;
      v = z;
    } else if (ax >= ay && ax >= az) {
      u = z;
      v = y;
    } else {
      u = x;
      v = y;
    }
    uv.setXY(i, u * scale, v * scale);
  }
  uv.needsUpdate = true;
}
