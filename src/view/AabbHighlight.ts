import * as THREE from 'three';
import { CONFIG } from '../config';
import type { Aabb } from '../domain/Aabb';

/** Каркас AABB в мире — выбранный реквизит, не клетка глыбы. */
export class AabbHighlight {
  readonly object: THREE.LineSegments;
  private readonly geometry: THREE.EdgesGeometry;
  private readonly material: THREE.LineBasicMaterial;

  constructor() {
    const box = new THREE.BoxGeometry(1, 1, 1);
    this.geometry = new THREE.EdgesGeometry(box);
    box.dispose();
    this.material = new THREE.LineBasicMaterial({ color: CONFIG.colors.interact });
    this.object = new THREE.LineSegments(this.geometry, this.material);
    this.object.visible = false;
  }

  show(box: Aabb): void {
    this.object.position.set(
      (box.minX + box.maxX) / 2,
      (box.minY + box.maxY) / 2,
      (box.minZ + box.maxZ) / 2,
    );
    this.object.scale.set(
      (box.maxX - box.minX) * 1.012,
      (box.maxY - box.minY) * 1.012,
      (box.maxZ - box.minZ) * 1.012,
    );
    this.object.visible = true;
  }

  hide(): void {
    this.object.visible = false;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
