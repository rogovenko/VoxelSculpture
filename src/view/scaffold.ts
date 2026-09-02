import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import type { ArenaBox } from '../domain/levels/arena';
import scaffoldUrl from '../../assets/fbx/SM_Prop_Scaffold_01.fbx?url';

let prototype: THREE.Group | null = null;

async function loadPrototype(): Promise<THREE.Group> {
  if (prototype !== null) return prototype;
  const group = await new FBXLoader().loadAsync(scaffoldUrl);
  group.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const ladder = node.name.toLowerCase().includes('ladder');
    node.material = toLambert(node.material, ladder ? 0xd0d2d6 : null);
  });
  prototype = group;
  return group;
}

function toLambert(
  material: THREE.Material | THREE.Material[],
  colorOverride: number | null,
): THREE.Material | THREE.Material[] {
  const convert = (src: THREE.Material): THREE.MeshLambertMaterial => {
    const color =
      colorOverride !== null
        ? new THREE.Color(colorOverride)
        : 'color' in src
          ? (src.color as THREE.Color).clone()
          : new THREE.Color(0xffffff);
    const map = 'map' in src ? ((src as THREE.MeshPhongMaterial).map ?? null) : null;
    if (map !== null) map.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshLambertMaterial({ color, map });
  };
  return Array.isArray(material) ? material.map(convert) : convert(material);
}

function unionForDeck(deck: ArenaBox, ladders: readonly ArenaBox[]): ArenaBox {
  const side = ladders.filter((ladder) => ladder.minZ === deck.minZ && ladder.maxZ === deck.maxZ);
  let minX = deck.minX;
  let maxX = deck.maxX;
  let maxY = deck.maxY;
  for (const ladder of side) {
    minX = Math.min(minX, ladder.minX);
    maxX = Math.max(maxX, ladder.maxX);
    maxY = Math.max(maxY, ladder.maxY);
  }
  return { ...deck, minX, minY: 0, minZ: deck.minZ, maxX, maxY, maxZ: deck.maxZ };
}

function fitToBox(object: THREE.Object3D, box: ArenaBox): void {
  object.position.set(0, 0, 0);
  object.scale.set(1, 1, 1);
  object.updateMatrixWorld(true);
  const src = new THREE.Box3().setFromObject(object);
  const sx = (box.maxX - box.minX) / Math.max(1e-6, src.max.x - src.min.x);
  const sy = (box.maxY - box.minY) / Math.max(1e-6, src.max.y - src.min.y);
  const sz = (box.maxZ - box.minZ) / Math.max(1e-6, src.max.z - src.min.z);
  object.scale.set(sx, sy, sz);
  object.updateMatrixWorld(true);
  const scaled = new THREE.Box3().setFromObject(object);
  object.position.x += (box.minX + box.maxX) / 2 - (scaled.min.x + scaled.max.x) / 2;
  object.position.y += box.minY - scaled.min.y;
  object.position.z += (box.minZ + box.maxZ) / 2 - (scaled.min.z + scaled.max.z) / 2;
}

/** Две секции лесов на невидимых коробках настила и лестниц. */
export async function createScaffolding(
  boxes: readonly ArenaBox[],
  ladders: readonly ArenaBox[],
): Promise<THREE.Group | null> {
  const decks = boxes.filter((box) => box.kind === 'structure');
  if (decks.length === 0) return null;

  const source = await loadPrototype();
  const group = new THREE.Group();
  group.name = 'scaffolding';

  for (const deck of decks) {
    const instance = source.clone(true);
    const cz = (deck.minZ + deck.maxZ) / 2;
    instance.rotation.y = cz < 0 ? Math.PI : 0;
    fitToBox(instance, unionForDeck(deck, ladders));
    group.add(instance);
  }
  return group;
}
