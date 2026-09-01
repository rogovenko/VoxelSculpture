import { aabb, type Aabb } from './Aabb';
import type { CollisionWorld } from './CollisionWorld';

export interface PlayerParams {
  width: number;
  height: number;
  eyeHeight: number;
  walkSpeed: number;
  accel: number;
  gravity: number;
  jumpSpeed: number;
  stepHeight: number;
  maxFallSpeed: number;
  climbSpeed: number;
  crouchScale: number;
}

export interface MoveIntent {
  /** -1..1 относительно направления взгляда */
  forward: number;
  /** -1..1 вправо от направления взгляда */
  strafe: number;
  /** Радианы, горизонтальное направление взгляда */
  yaw: number;
  /** Прыжок. На лестнице не работает: там подъём делает `forward`. */
  jump: boolean;
  /** Спуск по лестнице. */
  climbDown: boolean;
  /** Присед: рост в `crouchScale` раз, пока зажато. */
  crouch: boolean;
}

const GROUND_PROBE = 0.02;
const SWEEP_ITERATIONS = 12;
const EPSILON = 1e-6;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export class PlayerBody {
  /** Центр по горизонтали, ноги по вертикали. */
  x = 0;
  y = 0;
  z = 0;
  vx = 0;
  vy = 0;
  vz = 0;
  grounded = false;
  climbing = false;
  crouched = false;

  constructor(private readonly p: PlayerParams) {}

  get height(): number {
    return this.crouched ? this.p.height * this.p.crouchScale : this.p.height;
  }

  get eyeY(): number {
    const eye = this.crouched ? this.p.eyeHeight * this.p.crouchScale : this.p.eyeHeight;
    return this.y + eye;
  }

  teleport(x: number, y: number, z: number): void {
    this.x = x;
    this.y = y;
    this.z = z;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.grounded = false;
    this.climbing = false;
    this.crouched = false;
  }

  box(): Aabb {
    return this.boxAt(this.x, this.y, this.z);
  }

  update(dt: number, intent: MoveIntent, world: CollisionWorld): void {
    this.applyStance(intent, world);
    this.applyIntent(dt, intent);

    this.climbing = world.onLadder(this.box());

    if (this.climbing) {
      // Лестница отменяет гравитацию: жмёшь — едешь, не жмёшь — висишь.
      // Подъём именно на «вперёд»: то же нажатие прижимает игрока к лестнице,
      // поэтому хват не теряется, пока он лезет.
      if (intent.forward > 0) this.vy = this.p.climbSpeed;
      else if (intent.climbDown) this.vy = -this.p.climbSpeed;
      else this.vy = 0;
    } else {
      if (intent.jump && this.grounded) {
        this.vy = this.p.jumpSpeed;
        this.grounded = false;
      }
      this.vy = Math.max(this.vy - this.p.gravity * dt, -this.p.maxFallSpeed);
    }

    const wantedY = this.vy * dt;
    const movedY = this.sweep(world, 1, wantedY);
    this.y += movedY;
    if (movedY !== wantedY) this.vy = 0;

    this.moveHorizontal(world, 0, this.vx * dt);
    this.moveHorizontal(world, 2, this.vz * dt);

    this.clampToBounds(world);

    this.grounded = this.blocked(world, 1, -GROUND_PROBE);
    if (this.grounded && this.vy < 0) this.vy = 0;
  }

  private applyIntent(dt: number, intent: MoveIntent): void {
    const sin = Math.sin(intent.yaw);
    const cos = Math.cos(intent.yaw);

    let dx = -sin * intent.forward + cos * intent.strafe;
    let dz = -cos * intent.forward - sin * intent.strafe;
    const length = Math.hypot(dx, dz);
    if (length > 1) {
      dx /= length;
      dz /= length;
    }

    const k = Math.min(1, this.p.accel * dt);
    this.vx += (dx * this.p.walkSpeed - this.vx) * k;
    this.vz += (dz * this.p.walkSpeed - this.vz) * k;
  }

  /** Шаг на блок: если по горизонтали упёрлись, пробуем то же движение приподнявшись. */
  private moveHorizontal(world: CollisionWorld, axis: 0 | 2, delta: number): void {
    if (delta === 0) return;

    const flat = this.sweep(world, axis, delta);
    const stuck = Math.abs(flat) < Math.abs(delta) - EPSILON;

    if (!stuck || !this.grounded) {
      this.applyAxis(axis, flat);
      if (stuck) this.stopAxis(axis);
      return;
    }

    const savedY = this.y;
    const up = this.sweep(world, 1, this.p.stepHeight);
    this.y += up;

    const stepped = this.sweep(world, axis, delta);
    if (Math.abs(stepped) > Math.abs(flat) + 1e-4) {
      this.applyAxis(axis, stepped);
      this.y += this.sweep(world, 1, -up);
      if (Math.abs(stepped) < Math.abs(delta) - EPSILON) this.stopAxis(axis);
      return;
    }

    this.y = savedY;
    this.applyAxis(axis, flat);
    this.stopAxis(axis);
  }

  /** Бисекция вместо аналитики: одинаково работает и по вокселям, и по коробкам арены. */
  private sweep(world: CollisionWorld, axis: 0 | 1 | 2, delta: number): number {
    if (delta === 0) return 0;
    if (!this.blocked(world, axis, delta)) return delta;

    let free = 0;
    let hit = delta;
    for (let i = 0; i < SWEEP_ITERATIONS; i++) {
      const mid = (free + hit) / 2;
      if (this.blocked(world, axis, mid)) hit = mid;
      else free = mid;
    }
    return free;
  }

  private blocked(world: CollisionWorld, axis: 0 | 1 | 2, delta: number): boolean {
    return world.intersects(
      this.boxAt(
        this.x + (axis === 0 ? delta : 0),
        this.y + (axis === 1 ? delta : 0),
        this.z + (axis === 2 ? delta : 0),
      ),
    );
  }

  private clampToBounds(world: CollisionWorld): void {
    const b = world.bounds;
    const half = this.p.width / 2;

    this.x = clamp(this.x, b.minX + half, b.maxX - half);
    this.z = clamp(this.z, b.minZ + half, b.maxZ - half);

    if (this.y < b.minY) {
      this.y = b.minY;
      this.vy = 0;
    }
    if (this.y + this.height > b.maxY) {
      this.y = b.maxY - this.height;
      if (this.vy > 0) this.vy = 0;
    }
  }

  private applyAxis(axis: 0 | 2, delta: number): void {
    if (axis === 0) this.x += delta;
    else this.z += delta;
  }

  private stopAxis(axis: 0 | 2): void {
    if (axis === 0) this.vx = 0;
    else this.vz = 0;
  }

  private applyStance(intent: MoveIntent, world: CollisionWorld): void {
    if (intent.crouch) {
      this.crouched = true;
      return;
    }
    if (!this.crouched) return;
    // Не встаём, если над головой потолок: иначе игрок всплыл бы в геометрию.
    this.crouched = false;
    if (world.intersects(this.box())) this.crouched = true;
  }

  private boxAt(x: number, y: number, z: number): Aabb {
    const half = this.p.width / 2;
    return aabb(x - half, y, z - half, x + half, y + this.height, z + half);
  }
}
