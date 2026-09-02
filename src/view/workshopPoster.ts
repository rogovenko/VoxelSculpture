import * as THREE from 'three';
import { CONFIG } from '../config';
import { FURNITURE, type FurnitureLayout } from '../domain/levels/furnitureCatalog';
import workshopJson from '../domain/levels/layouts/workshop.json';
import buddhaPosterUrl from '../../assets/images/model_posters/buddha_poster.png';
import chickPosterUrl from '../../assets/images/model_posters/chick_poster.png';
import frogPosterUrl from '../../assets/images/model_posters/frog_poster.png';
import chiselUrl from '../../assets/images/poster-chisel-guide-aged.png';
import controlsUrl from '../../assets/images/poster-controls-aged.png';
import inspireUrl from '../../assets/images/poster-inspire-edit.png';
import phoneUrl from '../../assets/images/poster-phone-boost-aged.png';

/** Плакаты на западной стене: два слева от стола, два справа, над столом — заказ. */
const POSTER_W = 1.8;
const POSTER_H = 2.4;
/** Референс заказа 1024×1536, 2:3. Ширина как у соседей. */
const MODEL_POSTER_W = 1.8;
const MODEL_POSTER_H = 2.7;
const WALL_GAP = 0.05;
/** Было 2.55 на нижних обоях; в полтора раза выше — ещё в нижнем ряду. */
const CENTER_Y = 2.55 * 1.5;
const POSTER_GAP = 0.2;
/** Зазор между торцом стола и кромкой ближайшего плаката. */
const DESK_CLEARANCE = 0.35;

const MODEL_POSTERS: Record<string, string> = {
  frog: frogPosterUrl,
  chick: chickPosterUrl,
  buddha: buddhaPosterUrl,
};

/**
 * Слева направо, если смотреть на стену из комнаты (взгляд на −X):
 * лево = +Z, дальше от двери. inspire → controls | заказ | chisel → phone.
 */
const POSTERS = [
  { url: inspireUrl, name: 'posterInspire' },
  { url: controlsUrl, name: 'posterControls' },
  { url: chiselUrl, name: 'posterChisel' },
  { url: phoneUrl, name: 'posterPhone' },
] as const;

function deskAlongZ(): { center: number; half: number } {
  const layout = workshopJson as FurnitureLayout;
  const desk = layout.items.find((item) => item.id === 'desk');
  const alongCm =
    desk !== undefined && (desk.yawDeg === 90 || desk.yawDeg === -90)
      ? FURNITURE.desk.sizeCm[0]
      : FURNITURE.desk.sizeCm[2];
  return {
    center: desk?.z ?? 0,
    half: (alongCm * CONFIG.arena.rugScale) / 2,
  };
}

export function createWorkshopPosters(): THREE.Group {
  const group = new THREE.Group();
  const x = wallX();
  const step = POSTER_W + POSTER_GAP;
  const { center, half } = deskAlongZ();
  const inner = half + DESK_CLEARANCE + POSTER_W / 2;
  const zs = [
    center + inner + step,
    center + inner,
    center - inner,
    center - inner - step,
  ];

  POSTERS.forEach((poster, index) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(POSTER_W, POSTER_H),
      new THREE.MeshLambertMaterial({ map: loadPosterMap(poster.url) }),
    );
    mesh.position.set(x, CENTER_Y, zs[index]);
    mesh.rotation.y = Math.PI / 2;
    mesh.name = poster.name;
    group.add(mesh);
  });

  return group;
}

/**
 * Референс текущего заказа над столом. Комната не пересобирается —
 * текстуру меняет `applyModelPoster` при смене уровня.
 */
export function createModelPoster(levelId: string): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(MODEL_POSTER_W, MODEL_POSTER_H),
    new THREE.MeshLambertMaterial(),
  );
  mesh.position.set(wallX(), CENTER_Y, deskAlongZ().center);
  mesh.rotation.y = Math.PI / 2;
  mesh.name = 'posterModel';
  applyModelPoster(mesh, levelId);
  return mesh;
}

export function applyModelPoster(mesh: THREE.Mesh, levelId: string): void {
  const url = MODEL_POSTERS[levelId];
  const material = mesh.material as THREE.MeshLambertMaterial;
  if (url === undefined) {
    mesh.visible = false;
    return;
  }
  mesh.visible = true;
  const previous = material.map;
  material.map = loadPosterMap(url);
  material.needsUpdate = true;
  previous?.dispose();
}

function wallX(): number {
  return -(CONFIG.arena.halfExtent - WALL_GAP);
}

function loadPosterMap(url: string): THREE.Texture {
  const map = new THREE.TextureLoader().load(url);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}
