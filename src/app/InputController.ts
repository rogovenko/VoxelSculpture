/** Браузер отказывает в повторной блокировке курсора некоторое время после выхода по Esc. */
export const POINTER_LOCK_COOLDOWN_MS = 1400;

export interface MoveInput {
  forward: number;
  strafe: number;
  jump: boolean;
  crouch: boolean;
  climbDown: boolean;
}

const FORWARD_KEYS = ['KeyW', 'ArrowUp'];
const BACK_KEYS = ['KeyS', 'ArrowDown'];
const LEFT_KEYS = ['KeyA', 'ArrowLeft'];
const RIGHT_KEYS = ['KeyD', 'ArrowRight'];
const JUMP_KEYS = ['Space'];
const CROUCH_KEYS = ['KeyC'];
const CLIMB_DOWN_KEYS = ['ShiftLeft', 'ShiftRight'];
const TRACKED_KEYS = new Set([
  ...FORWARD_KEYS,
  ...BACK_KEYS,
  ...LEFT_KEYS,
  ...RIGHT_KEYS,
  ...JUMP_KEYS,
  ...CROUCH_KEYS,
  ...CLIMB_DOWN_KEYS,
]);

export interface InputCallbacks {
  onLook: (dx: number, dy: number) => void;
  onChiselStart: () => void;
  onChiselStop: () => void;
  onPullBack: (pulled: boolean) => void;
  onPause: () => void;
  onLockGained: () => void;
  onLockFailed: () => void;
}

export class InputController {
  private locked = false;
  private chiseling = false;
  private rightDown = false;
  private lockPending = false;
  private lastLockLostAt = Number.NEGATIVE_INFINITY;
  /** Esc вешает браузерный запрет ~1.4 с; программный exitLock — нет. */
  private escUnlock = false;
  private exitRequested = false;
  private readonly pressed = new Set<string>();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly cb: InputCallbacks,
  ) {
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('pointerlockerror', this.onPointerLockError);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  get movement(): MoveInput {
    let forward = 0;
    let strafe = 0;
    if (this.isDown(FORWARD_KEYS)) forward += 1;
    if (this.isDown(BACK_KEYS)) forward -= 1;
    if (this.isDown(RIGHT_KEYS)) strafe += 1;
    if (this.isDown(LEFT_KEYS)) strafe -= 1;
    return {
      forward,
      strafe,
      jump: this.isDown(JUMP_KEYS),
      crouch: this.isDown(CROUCH_KEYS),
      climbDown: this.isDown(CLIMB_DOWN_KEYS),
    };
  }

  requestLock(): void {
    this.lockPending = true;
    const request = this.canvas.requestPointerLock() as Promise<void> | void;
    if (request instanceof Promise) {
      request.catch(() => this.failLock());
    }
  }

  /** Сколько миллисекунд ещё нельзя запрашивать блокировку. */
  msUntilLockAllowed(): number {
    if (!this.escUnlock) return 0;
    const elapsed = performance.now() - this.lastLockLostAt;
    return Math.max(0, POINTER_LOCK_COOLDOWN_MS - elapsed);
  }

  get isLocked(): boolean {
    return this.locked;
  }

  get isChiseling(): boolean {
    return this.chiseling;
  }

  /** Снять lock из игры: магазин телефона, не Esc. */
  exitLock(): void {
    if (document.pointerLockElement !== this.canvas) return;
    this.exitRequested = true;
    document.exitPointerLock();
  }

  dispose(): void {
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('pointerlockerror', this.onPointerLockError);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private isDown(keys: readonly string[]): boolean {
    for (const key of keys) {
      if (this.pressed.has(key)) return true;
    }
    return false;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.locked || !TRACKED_KEYS.has(event.code)) return;
    event.preventDefault();
    this.pressed.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code);
  };

  /** Обзор во время долбёжки больше не блокируется: от первого лица это ломает управление. */
  private readonly onMouseMove = (event: MouseEvent): void => {
    if (!this.locked) return;
    this.cb.onLook(event.movementX, event.movementY);
  };

  private readonly onMouseDown = (event: MouseEvent): void => {
    if (!this.locked) return;
    if (event.button === 0) {
      this.chiseling = true;
      this.cb.onChiselStart();
    } else if (event.button === 2) {
      this.rightDown = true;
      this.cb.onPullBack(true);
    }
  };

  private readonly onMouseUp = (event: MouseEvent): void => {
    if (event.button === 0 && this.chiseling) {
      this.chiseling = false;
      this.cb.onChiselStop();
    } else if (event.button === 2 && this.rightDown) {
      this.rightDown = false;
      this.cb.onPullBack(false);
    }
  };

  private readonly onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private readonly onPointerLockChange = (): void => {
    const locked = document.pointerLockElement === this.canvas;
    const wasLocked = this.locked;
    this.locked = locked;

    if (locked) {
      this.lockPending = false;
      this.cb.onLockGained();
      return;
    }

    if (!wasLocked) return;

    this.lastLockLostAt = performance.now();
    this.escUnlock = !this.exitRequested;
    this.exitRequested = false;
    this.chiseling = false;
    this.rightDown = false;
    // иначе игрок продолжит идти на паузе с зажатой клавишей
    this.pressed.clear();
    this.cb.onChiselStop();
    this.cb.onPullBack(false);
    this.cb.onPause();
  };

  private readonly onPointerLockError = (): void => {
    this.failLock();
  };

  private failLock(): void {
    if (!this.lockPending) return;
    this.lockPending = false;
    this.cb.onLockFailed();
  }
}
