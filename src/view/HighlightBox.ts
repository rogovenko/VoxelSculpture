import * as THREE from 'three';

export class HighlightBox {
  readonly object: THREE.LineSegments;

  private readonly geometry: THREE.EdgesGeometry;
  private readonly material: THREE.LineBasicMaterial;

  constructor() {
    const box = new THREE.BoxGeometry(1, 1, 1);
    this.geometry = new THREE.EdgesGeometry(box);
    box.dispose();

    this.material = new THREE.LineBasicMaterial({ color: 0x000000 });
    this.material.polygonOffset = true;
    this.material.polygonOffsetFactor = -1;

    this.object = new THREE.LineSegments(this.geometry, this.material);
    // рамка чуть больше вокселя, иначе рёбра сливаются с гранями
    this.object.scale.setScalar(1.002);
    this.object.visible = false;
  }

  showAt(x: number, y: number, z: number): void {
    this.object.position.set(x + 0.5, y + 0.5, z + 0.5);
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
