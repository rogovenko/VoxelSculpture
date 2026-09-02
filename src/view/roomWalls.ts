import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { CONFIG } from '../config';
import brickUrl from '../../assets/images/decorations/Brick_Grey_Tex.png';
import horrorAtlasUrl from '../../assets/images/decorations/PolygonHorror_Texture_01_A.png';
import wallpaperUrl from '../../assets/images/decorations/WallPaper_Tex_04.png';
import doorUrl from '../../assets/fbx/SM_Bld_Base_Wall_Door_01.fbx?url';
import doorLeafUrl from '../../assets/fbx/SM_Bld_Door_06.fbx?url';
import wallUrl from '../../assets/fbx/SM_Bld_Base_Wall_01.fbx?url';
import windowUrl from '../../assets/fbx/SM_Bld_Wall_Window_04.fbx?url';

/**
 * Кольцо стен из модуля FBX. Пропорции модуля не мнём: целое число плиток,
 * масштаб один на все оси, высота подогнана под `wallTop`.
 *
 * Локальные оси модуля: X — длина, Y — высота, Z — толщина (центр в нуле).
 * Ставим так, чтобы внутренняя грань лежала на `±halfExtent`.
 */
export async function createRoomWalls(): Promise<THREE.Group> {
  const loader = new FBXLoader();
  const [fbx, door, windowFbx, doorLeaf] = await Promise.all([
    loader.loadAsync(wallUrl),
    loader.loadAsync(doorUrl),
    loader.loadAsync(windowUrl),
    loader.loadAsync(doorLeafUrl),
  ]);
  const brick = loadTiled(brickUrl);
  const wallpaper = loadTiled(wallpaperUrl);
  const materials = [
    new THREE.MeshLambertMaterial({ color: 0xffffff, map: brick }),
    new THREE.MeshLambertMaterial({ color: 0xffffff, map: brick }),
    new THREE.MeshLambertMaterial({ color: 0xffffff, map: brick }),
    new THREE.MeshLambertMaterial({ color: 0xffffff, map: brick }),
  ];
  const paperMaterials = [
    new THREE.MeshLambertMaterial({ color: 0xffffff, map: wallpaper }),
    new THREE.MeshLambertMaterial({ color: 0xffffff, map: wallpaper }),
    new THREE.MeshLambertMaterial({ color: 0xffffff, map: wallpaper }),
    new THREE.MeshLambertMaterial({ color: 0xffffff, map: wallpaper }),
  ];
  applyMaterials(fbx, materials);
  applyMaterials(door, materials);
  applyMaterials(windowFbx, materials);
  const lowerWall = fbx.clone(true);
  const lowerDoor = door.clone(true);
  applyMaterials(lowerWall, paperMaterials);
  applyMaterials(lowerDoor, paperMaterials);
  applyDoorLeafMaterial(doorLeaf, loadAtlas(horrorAtlasUrl));

  const native = new THREE.Box3().setFromObject(fbx).getSize(new THREE.Vector3());
  const doorWallSize = new THREE.Box3().setFromObject(door).getSize(new THREE.Vector3());
  const doorLeafSize = new THREE.Box3().setFromObject(doorLeaf).getSize(new THREE.Vector3());
  // Пивот полотна и панели — левый нижний угол. Сдвиг в локали панели, до scale родителя.
  const doorLeafLocal = new THREE.Vector3(
    (doorWallSize.x - doorLeafSize.x) / 2,
    0,
    0,
  );
  // AABB выше лицевой грани: ряды ставим по коробке (без нахлёста — иначе z-fight),
  // щель на внутренней стороне закрываем планкой.
  const faceH = innerFaceHeight(fbx);
  const tilesAlong = CONFIG.arena.wallTilesAlong;
  const tilesUp = CONFIG.arena.wallTilesUp;
  const scale = CONFIG.arena.wallTop / (tilesUp * native.y);
  const tileW = native.x * scale;
  const tileH = native.y * scale;
  const halfT = (native.z * scale) / 2;
  const seamH = Math.max((native.y - faceH) * scale, 0) + 0.01;

  const group = new THREE.Group();
  const a = CONFIG.arena.halfExtent;
  const start = (-tilesAlong * tileW) / 2;

  // Лицо модуля смотрит в −Z. Восток/запад были перепутаны: спина смотрела в комнату.
  const sides: { origin: THREE.Vector3; yaw: number }[] = [
    { origin: new THREE.Vector3(start, 0, a + halfT), yaw: 0 },
    { origin: new THREE.Vector3(a + halfT, 0, -start), yaw: Math.PI / 2 },
    { origin: new THREE.Vector3(-start, 0, -(a + halfT)), yaw: Math.PI },
    { origin: new THREE.Vector3(-(a + halfT), 0, start), yaw: -Math.PI / 2 },
  ];

  for (const [sideIndex, side] of sides.entries()) {
    for (let row = 0; row < tilesUp; row++) {
      for (let col = 0; col < tilesAlong; col++) {
        const useDoor =
          sideIndex === CONFIG.arena.wallDoorSide &&
          row === CONFIG.arena.wallDoorUp &&
          col === CONFIG.arena.wallDoorAlong;
        const useWindow =
          sideIndex !== CONFIG.arena.wallDoorSide &&
          row === CONFIG.arena.wallWindowUp &&
          (CONFIG.arena.wallWindowAlong as readonly number[]).includes(col);
        const source = useDoor
          ? lowerDoor
          : useWindow
            ? windowFbx
            : row === 0
              ? lowerWall
              : fbx;
        const tile = source.clone(true);
        tile.scale.setScalar(scale);
        tile.rotation.y = side.yaw;
        const local = new THREE.Vector3(col * tileW, row * tileH, 0);
        local.applyAxisAngle(new THREE.Vector3(0, 1, 0), side.yaw);
        tile.position.copy(side.origin).add(local);
        if (useDoor) {
          const leaf = doorLeaf.clone(true);
          leaf.scale.setScalar(1);
          leaf.position.copy(doorLeafLocal);
          tile.add(leaf);
        }
        group.add(tile);
      }
    }
  }

  const span = tilesAlong * tileW;
  for (let row = 1; row < tilesUp; row++) {
    const y = row * tileH;
    addSeam(group, materials[1], span, seamH, 0, y, a, 0);
    addSeam(group, materials[1], span, seamH, 0, y, -a, 0);
    addSeam(group, materials[1], span, seamH, a, y, 0, Math.PI / 2);
    addSeam(group, materials[1], span, seamH, -a, y, 0, Math.PI / 2);
  }

  return group;
}

function addSeam(
  group: THREE.Group,
  material: THREE.Material,
  width: number,
  height: number,
  x: number,
  y: number,
  z: number,
  yaw: number,
): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.04), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = yaw;
  group.add(mesh);
}

function innerFaceHeight(root: THREE.Object3D): number {
  let ymin = Infinity;
  let ymax = -Infinity;
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const pos = node.geometry.getAttribute('position');
    const nrm = node.geometry.getAttribute('normal');
    for (let i = 0; i < pos.count; i++) {
      if (nrm.getZ(i) >= -0.5) continue;
      ymin = Math.min(ymin, pos.getY(i));
      ymax = Math.max(ymax, pos.getY(i));
    }
  });
  return ymax - ymin;
}

function applyMaterials(root: THREE.Object3D, materials: THREE.Material[]): void {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    // Стекло из комплекта окна не перекрашиваем в кирпич.
    if (node.name.toLowerCase().includes('glass')) return;
    const src = Array.isArray(node.material) ? node.material : [node.material];
    if (src.some((m) => m.name.toLowerCase().includes('glass'))) return;
    node.material = materials;
  });
}

function applyDoorLeafMaterial(root: THREE.Object3D, map: THREE.Texture): void {
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff, map });
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) node.material = material;
  });
}

function loadTiled(url: string): THREE.Texture {
  const map = new THREE.TextureLoader().load(url);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;
  return map;
}

function loadAtlas(url: string): THREE.Texture {
  const map = new THREE.TextureLoader().load(url);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.ClampToEdgeWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  // UV из FBX: V=0 снизу. TextureLoader по умолчанию flipY=true — иначе
  // полотно семплит светлую штукатурку сверху атласа вместо коричневой палитры.
  map.anisotropy = 8;
  return map;
}
