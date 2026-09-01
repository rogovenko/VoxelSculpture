import * as THREE from 'three';
import { CONFIG } from '../config';
import { VoxelType } from '../domain/types';
import type { VoxelGrid } from '../domain/VoxelGrid';
import { createVoxelMaterial } from './voxelMaterial';

export class VoxelRenderer {
  readonly object: THREE.Group;

  private readonly geometry: THREE.BoxGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly mesh: THREE.InstancedMesh;
  private readonly aType: THREE.InstancedBufferAttribute;
  private readonly aDamage: THREE.InstancedBufferAttribute;
  private readonly aStage: THREE.InstancedBufferAttribute;
  private readonly aPaint: THREE.InstancedBufferAttribute;
  private readonly aPainted: THREE.InstancedBufferAttribute;
  private readonly slotOfVoxel: Int32Array;
  private readonly voxelOfSlot: Int32Array;
  private readonly tmpMatrix = new THREE.Matrix4();
  private count = 0;
  private atlas: THREE.Texture | null = null;
  private marbleMap: THREE.Texture | null = null;

  constructor(grid: VoxelGrid, paint?: Uint32Array) {
    const [sx, sy, sz] = grid.size;

    let maxCount = 0;
    for (let i = 0; i < grid.type.length; i++) {
      if (grid.type[i] !== VoxelType.Air) maxCount += 1;
    }

    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.material = createVoxelMaterial();

    this.aType = new THREE.InstancedBufferAttribute(new Float32Array(maxCount), 1);
    this.aDamage = new THREE.InstancedBufferAttribute(new Float32Array(maxCount), 1);
    this.aStage = new THREE.InstancedBufferAttribute(new Float32Array(maxCount), 1);
    this.aPaint = new THREE.InstancedBufferAttribute(new Float32Array(maxCount * 3), 3);
    this.aPainted = new THREE.InstancedBufferAttribute(new Float32Array(maxCount), 1);
    this.geometry.setAttribute('aType', this.aType);
    this.geometry.setAttribute('aDamage', this.aDamage);
    this.geometry.setAttribute('aStage', this.aStage);
    this.geometry.setAttribute('aPaint', this.aPaint);
    this.geometry.setAttribute('aPainted', this.aPainted);

    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, maxCount);
    // InstancedMesh считает bounding sphere по всем слотам, включая освобождённые swap-remove
    this.mesh.frustumCulled = false;

    this.slotOfVoxel = new Int32Array(grid.type.length).fill(-1);
    this.voxelOfSlot = new Int32Array(maxCount).fill(-1);

    for (let z = 0; z < sz; z++) {
      for (let y = 0; y < sy; y++) {
        for (let x = 0; x < sx; x++) {
          const voxelIndex = grid.indexOf(x, y, z);
          const type = grid.type[voxelIndex];
          if (type === VoxelType.Air) continue;

          const slot = this.count;
          this.count += 1;
          this.tmpMatrix.makeTranslation(x + 0.5, y + 0.5, z + 0.5);
          this.mesh.setMatrixAt(slot, this.tmpMatrix);
          this.aType.array[slot] = type;
          this.aDamage.array[slot] = 0;
          this.aStage.array[slot] = -1;
          const packed = paint?.[voxelIndex] ?? 0;
          if (packed !== 0) {
            this.aPaint.setXYZ(
              slot,
              ((packed >> 16) & 0xff) / 255,
              ((packed >> 8) & 0xff) / 255,
              (packed & 0xff) / 255,
            );
            this.aPainted.array[slot] = 1;
          }
          this.slotOfVoxel[voxelIndex] = slot;
          this.voxelOfSlot[slot] = voxelIndex;
        }
      }
    }

    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.aType.needsUpdate = true;
    this.aDamage.needsUpdate = true;
    this.aStage.needsUpdate = true;
    this.aPaint.needsUpdate = true;
    this.aPainted.needsUpdate = true;

    // позицию и масштаб группы задаёт владелец: только он знает мировую раскладку арены
    this.object = new THREE.Group();
    this.object.add(this.mesh);
  }

  setCrackAtlas(texture: THREE.Texture): void {
    this.atlas = texture;
    this.material.uniforms.uCrackAtlas.value = texture;
    this.material.uniforms.uHasAtlas.value = 1;
  }

  setMarbleMap(texture: THREE.Texture): void {
    this.marbleMap = texture;
    this.material.uniforms.uMarbleMap.value = texture;
    this.material.uniforms.uHasMarbleMap.value = 1;
  }

  removeVoxel(voxelIndex: number): void {
    const slot = this.slotOfVoxel[voxelIndex];
    if (slot < 0) return;
    const last = this.count - 1;

    if (slot !== last) {
      this.mesh.getMatrixAt(last, this.tmpMatrix);
      this.mesh.setMatrixAt(slot, this.tmpMatrix);
      this.aType.array[slot] = this.aType.array[last];
      this.aDamage.array[slot] = this.aDamage.array[last];
      this.aStage.array[slot] = this.aStage.array[last];
      this.aPainted.array[slot] = this.aPainted.array[last];
      const to = slot * 3;
      const from = last * 3;
      this.aPaint.array[to] = this.aPaint.array[from];
      this.aPaint.array[to + 1] = this.aPaint.array[from + 1];
      this.aPaint.array[to + 2] = this.aPaint.array[from + 2];

      const movedVoxel = this.voxelOfSlot[last];
      this.voxelOfSlot[slot] = movedVoxel;
      this.slotOfVoxel[movedVoxel] = slot;
    }

    this.slotOfVoxel[voxelIndex] = -1;
    this.voxelOfSlot[last] = -1;
    this.count = last;
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.aType.needsUpdate = true;
    this.aDamage.needsUpdate = true;
    this.aStage.needsUpdate = true;
    this.aPaint.needsUpdate = true;
    this.aPainted.needsUpdate = true;
  }

  /**
   * После зачистки мрамора скульптура берёт цвета из `.vox`.
   * Урон не сбрасываем: добитые клетки снова получают последнюю стадию трещин
   * (во время долбёжки её снимают, чтобы клетка читалась как «убитая»).
   */
  revealPaint(grid: VoxelGrid): void {
    this.material.uniforms.uRevealPaint.value = 1;
    const stages = CONFIG.chisel.crackStages;

    for (let index = 0; index < grid.type.length; index++) {
      if (grid.type[index] !== VoxelType.Sculpture) continue;
      const slot = this.slotOfVoxel[index];
      if (slot < 0) continue;

      const maxHp = grid.maxHp[index];
      const damage = maxHp > 0 ? 1 - grid.hp[index] / maxHp : 0;
      this.aDamage.array[slot] = damage;
      if (damage <= 0) {
        this.aStage.array[slot] = -1;
      } else {
        const stage = Math.floor(damage * stages);
        this.aStage.array[slot] = stage > stages - 1 ? stages - 1 : stage;
      }
    }

    this.aDamage.needsUpdate = true;
    this.aStage.needsUpdate = true;
  }

  setDamage(voxelIndex: number, damage01: number, stage: number): void {
    const slot = this.slotOfVoxel[voxelIndex];
    if (slot < 0) return;
    this.aDamage.array[slot] = damage01;
    this.aStage.array[slot] = stage;
    this.aDamage.needsUpdate = true;
    this.aStage.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.atlas?.dispose();
    this.atlas = null;
    this.marbleMap?.dispose();
    this.marbleMap = null;
  }
}
