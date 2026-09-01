import * as THREE from 'three';
import { CONFIG } from '../config';
import type { Face } from '../domain/types';

const FACE_NORMALS: Record<Face, readonly [number, number, number]> = {
  px: [1, 0, 0],
  nx: [-1, 0, 0],
  py: [0, 1, 0],
  ny: [0, -1, 0],
  pz: [0, 0, 1],
  nz: [0, 0, -1],
};

const BURST_SPREAD = 0.55;
const BURST_LIFT = 0.35;
const DUST_SCALE = 0.5;
// Разлёт точек спавна привязан к клетке, иначе осколки рождаются заметно снаружи неё.
// Скорость и время жизни, наоборот, мировые: мелкая крошка разлетается так же далеко.
const BURST_JITTER = 0.4 * CONFIG.grid.voxelSize;
const DUST_JITTER = 0.6 * CONFIG.grid.voxelSize;

export class ShardFX {
  readonly object: THREE.Object3D;

  private readonly geometry: THREE.BoxGeometry;
  private readonly material: THREE.MeshLambertMaterial;
  private readonly mesh: THREE.InstancedMesh;
  private readonly pos: Float32Array;
  private readonly vel: Float32Array;
  private readonly life: Float32Array;
  private readonly lifeTotal: Float32Array;
  private readonly scale: Float32Array;
  private readonly active: Uint8Array;
  private cursor = 0;

  private readonly tmpMatrix = new THREE.Matrix4();
  private readonly tmpPos = new THREE.Vector3();
  private readonly tmpQuat = new THREE.Quaternion();
  private readonly tmpScale = new THREE.Vector3();

  constructor() {
    const pool = CONFIG.shards.poolSize;
    const size = CONFIG.shards.size;

    this.geometry = new THREE.BoxGeometry(size, size, size);
    this.material = new THREE.MeshLambertMaterial({
      color: CONFIG.colors.shard,
      emissive: CONFIG.colors.shard,
      emissiveIntensity: 0.28,
    });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, pool);
    // все слоты живут в пуле постоянно, свободные просто схлопнуты в нулевую матрицу
    this.mesh.frustumCulled = false;
    this.mesh.count = pool;

    this.pos = new Float32Array(pool * 3);
    this.vel = new Float32Array(pool * 3);
    this.life = new Float32Array(pool);
    this.lifeTotal = new Float32Array(pool);
    this.scale = new Float32Array(pool);
    this.active = new Uint8Array(pool);

    this.tmpMatrix.makeScale(0, 0, 0);
    for (let slot = 0; slot < pool; slot++) {
      this.mesh.setMatrixAt(slot, this.tmpMatrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;

    this.object = this.mesh;
  }

  /** Координаты — центр разбитой клетки в мировом пространстве. */
  burst(cx: number, cy: number, cz: number, face: Face): void {
    const normal = FACE_NORMALS[face];
    const { perBreak, speedMin, speedMax, lifeMin, lifeMax } = CONFIG.shards;

    for (let i = 0; i < perBreak; i++) {
      let dx = normal[0] + (Math.random() - 0.5) * BURST_SPREAD * 2;
      let dy = normal[1] + (Math.random() - 0.5) * BURST_SPREAD * 2 + BURST_LIFT;
      let dz = normal[2] + (Math.random() - 0.5) * BURST_SPREAD * 2;

      const length = Math.hypot(dx, dy, dz) || 1;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      dx = (dx / length) * speed;
      dy = (dy / length) * speed;
      dz = (dz / length) * speed;

      this.spawn(
        cx + (Math.random() - 0.5) * BURST_JITTER,
        cy + (Math.random() - 0.5) * BURST_JITTER,
        cz + (Math.random() - 0.5) * BURST_JITTER,
        dx,
        dy,
        dz,
        lifeMin + Math.random() * (lifeMax - lifeMin),
        1,
      );
    }
  }

  /** Координаты — центр задетой клетки в мировом пространстве. */
  dust(cx: number, cy: number, cz: number): void {
    const { dustPerHit, lifeMin } = CONFIG.shards;

    for (let i = 0; i < dustPerHit; i++) {
      this.spawn(
        cx + (Math.random() - 0.5) * DUST_JITTER,
        cy + (Math.random() - 0.5) * DUST_JITTER,
        cz + (Math.random() - 0.5) * DUST_JITTER,
        (Math.random() - 0.5) * 0.6,
        Math.random() * 0.5,
        (Math.random() - 0.5) * 0.6,
        lifeMin * 0.6,
        DUST_SCALE,
      );
    }
  }

  update(dt: number): void {
    const pool = CONFIG.shards.poolSize;
    const gravity = CONFIG.shards.gravity;
    let dirty = false;

    for (let slot = 0; slot < pool; slot++) {
      if (this.active[slot] === 0) continue;
      dirty = true;

      const p = slot * 3;
      this.vel[p + 1] -= gravity * dt;
      this.pos[p] += this.vel[p] * dt;
      this.pos[p + 1] += this.vel[p + 1] * dt;
      this.pos[p + 2] += this.vel[p + 2] * dt;
      this.life[slot] -= dt;

      if (this.life[slot] <= 0) {
        this.active[slot] = 0;
        this.tmpMatrix.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(slot, this.tmpMatrix);
        continue;
      }

      const s = this.scale[slot] * (this.life[slot] / this.lifeTotal[slot]);
      this.tmpPos.set(this.pos[p], this.pos[p + 1], this.pos[p + 2]);
      this.tmpScale.set(s, s, s);
      this.tmpMatrix.compose(this.tmpPos, this.tmpQuat, this.tmpScale);
      this.mesh.setMatrixAt(slot, this.tmpMatrix);
    }

    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  private spawn(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    life: number,
    scale: number,
  ): void {
    const slot = this.claimSlot();
    const p = slot * 3;

    this.pos[p] = x;
    this.pos[p + 1] = y;
    this.pos[p + 2] = z;
    this.vel[p] = vx;
    this.vel[p + 1] = vy;
    this.vel[p + 2] = vz;
    this.life[slot] = life;
    this.lifeTotal[slot] = life;
    this.scale[slot] = scale;
    this.active[slot] = 1;
  }

  /** Кольцевой счётчик: свободный слот рядом с курсором, иначе перезаписываем самый старый. */
  private claimSlot(): number {
    const pool = CONFIG.shards.poolSize;

    for (let i = 0; i < pool; i++) {
      const slot = (this.cursor + i) % pool;
      if (this.active[slot] === 0) {
        this.cursor = (slot + 1) % pool;
        return slot;
      }
    }

    const slot = this.cursor;
    this.cursor = (slot + 1) % pool;
    return slot;
  }
}
