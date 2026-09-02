import * as THREE from 'three';
import type { FurnitureLayout } from '../domain/levels/furnitureCatalog';
import workshopJson from '../domain/levels/layouts/workshop.json';
import { loadFurniturePrototypes, placeLayoutItem } from './furnitureKit';
import { createWorkshopPosters } from './workshopPoster';

/**
 * Реквизит комнаты по схеме JSON. Коллизия — `layoutToDecor`, не этот меш.
 */
export async function createRoomDecor(
  layout: FurnitureLayout = workshopJson as FurnitureLayout,
): Promise<THREE.Group> {
  const prototypes = await loadFurniturePrototypes();
  const group = new THREE.Group();
  for (const item of layout.items) {
    const mesh = prototypes[item.kind].clone(true);
    placeLayoutItem(mesh, item);
    group.add(mesh);
  }
  group.add(createWorkshopPosters());
  return group;
}
