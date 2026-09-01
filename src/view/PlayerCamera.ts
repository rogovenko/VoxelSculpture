import * as THREE from 'three';
import { CONFIG } from '../config';

const DEG_TO_RAD = Math.PI / 180;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export class PlayerCamera {
  private yawRad: number;
  private pitchRad = 0;
  private fov: number;
  private targetFov: number;

  private readonly pitchMin = CONFIG.camera.pitchMinDeg * DEG_TO_RAD;
  private readonly pitchMax = CONFIG.camera.pitchMaxDeg * DEG_TO_RAD;
  private readonly kickOffset = new THREE.Vector3();
  private readonly tmpKick = new THREE.Vector3();

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    yawDeg: number,
  ) {
    this.yawRad = yawDeg * DEG_TO_RAD;
    this.fov = CONFIG.camera.fovWork;
    this.targetFov = this.fov;
    // YXZ: сначала рыскание вокруг вертикали, потом тангаж, иначе горизонт кренится
    this.camera.rotation.order = 'YXZ';
    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
  }

  get yaw(): number {
    return this.yawRad;
  }

  look(dxPixels: number, dyPixels: number): void {
    this.yawRad -= dxPixels * CONFIG.camera.sensitivity;
    this.pitchRad = clamp(
      this.pitchRad - dyPixels * CONFIG.camera.sensitivity,
      this.pitchMin,
      this.pitchMax,
    );
  }

  reset(yawDeg: number): void {
    this.yawRad = yawDeg * DEG_TO_RAD;
    this.pitchRad = 0;
    this.kickOffset.set(0, 0, 0);
  }

  /** ПКМ больше не отъезжает: с ног игрока отъезжать некуда, поэтому расширяется угол обзора. */
  setPulledBack(pulled: boolean): void {
    this.targetFov = pulled ? CONFIG.camera.fovPulled : CONFIG.camera.fovWork;
  }

  kick(): void {
    this.tmpKick.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
    if (this.tmpKick.lengthSq() === 0) this.tmpKick.set(0, 1, 0);
    this.tmpKick.normalize().multiplyScalar(CONFIG.camera.kickStrength);
    this.kickOffset.add(this.tmpKick);
  }

  update(dt: number, eyeX: number, eyeY: number, eyeZ: number): void {
    const k = Math.min(1, CONFIG.camera.lerpSpeed * dt);

    const nextFov = this.fov + (this.targetFov - this.fov) * k;
    if (Math.abs(nextFov - this.fov) > 1e-4) {
      this.fov = nextFov;
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }

    this.kickOffset.multiplyScalar(Math.max(0, 1 - CONFIG.camera.kickDecay * dt));

    this.camera.rotation.set(this.pitchRad, this.yawRad, 0);
    this.camera.position.set(
      eyeX + this.kickOffset.x,
      eyeY + this.kickOffset.y,
      eyeZ + this.kickOffset.z,
    );
  }

  rayOrigin(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  rayDirection(): THREE.Vector3 {
    return this.camera.getWorldDirection(new THREE.Vector3());
  }
}
