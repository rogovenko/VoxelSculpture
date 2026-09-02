import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { CONFIG } from '../config';
import { DESK_DIARY, DESK_LETTER, DESK_PHONE, type FurnitureKind, type LayoutItem } from '../domain/levels/furnitureCatalog';
import armchairUrl from '../../assets/fbx/decorations/SM_Prop_ArmChair_01.fbx?url';
import bedUrl from '../../assets/fbx/decorations/SM_Prop_Bed_Small_01.fbx?url';
import booksUrl from '../../assets/fbx/decorations/SM_Prop_Book_Pile_01.fbx?url';
import boxesUrl from '../../assets/fbx/decorations/SM_Prop_Box_Pile_01.fbx?url';
import cabinetUrl from '../../assets/fbx/decorations/SM_Prop_Cabinet_01.fbx?url';
import deskUrl from '../../assets/fbx/SM_Prop_Desk_01.fbx?url';
import phoneUrl from '../../assets/fbx/Items/SM_Prop_Phone_Rotary_01.fbx?url';
import stoolUrl from '../../assets/fbx/SM_Prop_Stool_02.fbx?url';
import rugUrl from '../../assets/fbx/decorations/SM_Prop_Rug_01.fbx?url';
import tvUrl from '../../assets/fbx/decorations/SM_Prop_Television_01.fbx?url';
import horrorAtlasUrl from '../../assets/images/decorations/PolygonHorror_Texture_01_A.png';

const SIMPLE_URLS: Record<Exclude<FurnitureKind, 'desk'>, string> = {
  armchair: armchairUrl,
  television: tvUrl,
  boxPile: boxesUrl,
  bookPile: booksUrl,
  bed: bedUrl,
  cabinet: cabinetUrl,
  rug: rugUrl,
};

/** Табурет чуть выдвинут из-под столешницы и развёрнут, чтобы не стоял «по линейке». */
const DESK_STOOL_X_CM = 10;
const DESK_STOOL_Z_CM = 30;
const DESK_STOOL_YAW_DEG = 12;

export async function loadFurniturePrototypes(): Promise<Record<FurnitureKind, THREE.Group>> {
  const loader = new FBXLoader();
  const atlas = loadHorrorAtlas();
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff, map: atlas });
  const screen = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const simpleKinds = (Object.keys(SIMPLE_URLS) as Exclude<FurnitureKind, 'desk'>[]).filter(
    (kind) => kind !== 'television',
  );
  const entries = await Promise.all(
    simpleKinds.map(async (kind) => {
      const group = await loadFbx(loader, SIMPLE_URLS[kind], material);
      return [kind, group] as const;
    }),
  );
  const television = await loadFbx(loader, SIMPLE_URLS.television, material, screen);
  const desk = await composeDesk(loader, material);
  return { ...Object.fromEntries(entries), television, desk } as Record<FurnitureKind, THREE.Group>;
}

async function composeDesk(loader: FBXLoader, material: THREE.Material): Promise<THREE.Group> {
  const [table, stool, phone] = await Promise.all([
    loadFbx(loader, deskUrl, material),
    loadFbx(loader, stoolUrl, material),
    loadFbx(loader, phoneUrl, material),
  ]);
  stool.position.set(DESK_STOOL_X_CM, 0, DESK_STOOL_Z_CM);
  stool.rotation.y = (DESK_STOOL_YAW_DEG * Math.PI) / 180;
  phone.position.set(DESK_PHONE.offsetCm[0], DESK_PHONE.offsetCm[1], DESK_PHONE.offsetCm[2]);
  phone.rotation.y = (DESK_PHONE.yawDeg * Math.PI) / 180;
  const letter = createDeskLetter();
  const diary = createDeskDiary();
  const group = new THREE.Group();
  group.add(table, stool, phone, letter, diary);
  return group;
}

/** Конверт + лист с каракулями. Размеры — см, как у FBX стола. */
function createDeskLetter(): THREE.Group {
  const group = new THREE.Group();
  const [ew, eh, ed] = DESK_LETTER.envelopeCm;
  const envelope = new THREE.Mesh(
    new THREE.BoxGeometry(ew, eh, ed),
    new THREE.MeshLambertMaterial({ color: 0xcbb892 }),
  );
  envelope.position.y = eh / 2;
  const flap = new THREE.Mesh(
    new THREE.BoxGeometry(ew, eh * 0.35, ed * 0.38),
    new THREE.MeshLambertMaterial({ color: 0xb9a57a }),
  );
  flap.position.set(0, eh * 0.7, ed * 0.28);

  const [pw, ph, pd] = DESK_LETTER.paperCm;
  const paper = new THREE.Mesh(
    new THREE.BoxGeometry(pw, ph, pd),
    new THREE.MeshLambertMaterial({ color: 0xf6f3ea, map: makeScribbleMap() }),
  );
  const [px, py, pz] = DESK_LETTER.paperOffsetCm;
  paper.position.set(px, py, pz);
  paper.rotation.y = (DESK_LETTER.paperYawDeg * Math.PI) / 180;

  group.add(envelope, flap, paper);
  group.position.set(DESK_LETTER.offsetCm[0], DESK_LETTER.offsetCm[1], DESK_LETTER.offsetCm[2]);
  group.rotation.y = (DESK_LETTER.yawDeg * Math.PI) / 180;
  return group;
}

/** Раскрытая книга и ручка справа. */
function createDeskDiary(): THREE.Group {
  const group = new THREE.Group();
  const pageMap = makeLinedPaperMap();
  const coverMat = new THREE.MeshLambertMaterial({ color: 0x4a3424 });
  const pageMat = new THREE.MeshLambertMaterial({ color: 0xf3ead4, map: pageMap });
  const spineMat = new THREE.MeshLambertMaterial({ color: 0x3a281c });

  const leftCover = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.35, 20.4), coverMat);
  leftCover.position.set(-7.1, 0.22, 0);
  const rightCover = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.35, 20.4), coverMat);
  rightCover.position.set(7.1, 0.22, 0);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 20.6), spineMat);
  spine.position.set(0, 0.4, 0);

  const leftPage = new THREE.Mesh(new THREE.BoxGeometry(13, 0.12, 19), pageMat);
  leftPage.position.set(-6.6, 0.55, 0);
  leftPage.rotation.z = 0.12;
  const rightPage = new THREE.Mesh(new THREE.BoxGeometry(13, 0.12, 19), pageMat);
  rightPage.position.set(6.6, 0.55, 0);
  rightPage.rotation.z = -0.12;

  const pen = createDeskPen();
  pen.position.set(18.5, 0.45, 2.5);
  pen.rotation.y = 0.35;

  group.add(leftCover, rightCover, spine, leftPage, rightPage, pen);
  group.position.set(DESK_DIARY.offsetCm[0], DESK_DIARY.offsetCm[1], DESK_DIARY.offsetCm[2]);
  group.rotation.y = (DESK_DIARY.yawDeg * Math.PI) / 180;
  return group;
}

function createDeskPen(): THREE.Group {
  const pen = new THREE.Group();
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.38, 13, 8),
    new THREE.MeshLambertMaterial({ color: 0x1c3a5c }),
  );
  barrel.rotation.z = Math.PI / 2;
  const clip = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.12, 3.2),
    new THREE.MeshLambertMaterial({ color: 0xc9b37a }),
  );
  clip.position.set(4.2, 0.45, 0);
  const nib = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 1.4, 8),
    new THREE.MeshLambertMaterial({ color: 0xb0b4ba }),
  );
  nib.rotation.z = -Math.PI / 2;
  nib.position.set(-7.1, 0, 0);
  pen.add(barrel, clip, nib);
  return pen;
}

function makeLinedPaperMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  if (g === null) {
    const empty = new THREE.CanvasTexture(canvas);
    empty.colorSpace = THREE.SRGBColorSpace;
    return empty;
  }
  g.fillStyle = '#f3ead4';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#c9d4e0';
  g.lineWidth = 1;
  for (let y = 28; y < 250; y += 16) {
    g.beginPath();
    g.moveTo(12, y);
    g.lineTo(244, y);
    g.stroke();
  }
  g.strokeStyle = '#d4b4b4';
  g.beginPath();
  g.moveTo(36, 8);
  g.lineTo(36, 248);
  g.stroke();
  g.strokeStyle = '#3a3a44';
  g.lineWidth = 1.2;
  g.lineCap = 'round';
  for (let row = 0; row < 11; row++) {
    const y = 36 + row * 16;
    g.beginPath();
    g.moveTo(44, y - 4);
    let x = 44;
    while (x < 230) {
      x += 6;
      g.lineTo(x, y - 4 + Math.sin(x * 0.15 + row) * 1.6);
    }
    g.stroke();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}

function makeScribbleMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  if (g === null) {
    const empty = new THREE.CanvasTexture(canvas);
    empty.colorSpace = THREE.SRGBColorSpace;
    return empty;
  }
  g.fillStyle = '#f6f3ea';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#2c2c34';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (let row = 0; row < 14; row++) {
    const y = 18 + row * 16;
    g.lineWidth = row % 5 === 0 ? 2.1 : 1.35;
    g.beginPath();
    g.moveTo(16, y);
    let x = 16;
    const end = 236 - (row % 3) * 18;
    while (x < end) {
      x += 5 + (row * 3 + x) % 7;
      const wobble = Math.sin(x * 0.18 + row * 1.7) * 2.8 + ((x * 13 + row * 17) % 5) - 2;
      g.lineTo(x, y + wobble);
    }
    g.stroke();
  }
  g.beginPath();
  g.lineWidth = 1.8;
  g.moveTo(28, 232);
  g.quadraticCurveTo(70, 248, 110, 228);
  g.quadraticCurveTo(130, 220, 148, 236);
  g.stroke();
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}

async function loadFbx(
  loader: FBXLoader,
  url: string,
  material: THREE.Material,
  screen?: THREE.Material,
): Promise<THREE.Group> {
  const group = await loader.loadAsync(url);
  applyAtlas(group, material, screen);
  return group;
}

/** Центр XZ из схемы, низ на полу (ковёр чуть утоплен). */
export function placeLayoutItem(object: THREE.Object3D, item: LayoutItem): void {
  object.scale.setScalar(CONFIG.arena.rugScale);
  object.rotation.y = (item.yawDeg * Math.PI) / 180;
  object.position.set(0, 0, 0);
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  object.position.x = item.x - (bounds.min.x + bounds.max.x) / 2;
  object.position.z = item.z - (bounds.min.z + bounds.max.z) / 2;
  const lift = item.kind === 'rug' ? CONFIG.arena.rugLift : 0;
  object.position.y = lift - bounds.min.y;
}

export function loadHorrorAtlas(): THREE.Texture {
  const map = new THREE.TextureLoader().load(horrorAtlasUrl);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.ClampToEdgeWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.anisotropy = 8;
  return map;
}

function applyAtlas(root: THREE.Object3D, material: THREE.Material, screen?: THREE.Material): void {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const src = Array.isArray(node.material) ? node.material : [node.material];
    if (screen === undefined) {
      node.material = material;
      return;
    }
    if (src.length > 1) {
      node.material = src.map((_, index) => (index === 0 ? material : screen));
      return;
    }
    const name = `${node.name} ${src[0]?.name ?? ''}`.toLowerCase();
    node.material = /lambert1|screen/.test(name) ? screen : material;
  });
}
