import * as THREE from 'three';
import { CONFIG } from '../config';
import { ChiselSystem } from '../domain/ChiselSystem';
import { CollisionWorld } from '../domain/CollisionWorld';
import { GameEvents } from '../domain/GameEvents';
import { PlayerBody } from '../domain/PlayerBody';
import { computeScore, type ScoreResult } from '../domain/ScoreSystem';
import { VoxelGrid } from '../domain/VoxelGrid';
import { gridSizeFor, playableLevel, type LevelSize } from '../domain/levels/catalog';
import { createArena, type ArenaLayout } from '../domain/levels/arena';
import { VoxelType, type HitResult } from '../domain/types';
import { raycastVoxels } from '../domain/voxelRaycast';
import { HighlightBox } from '../view/HighlightBox';
import { PlayerCamera } from '../view/PlayerCamera';
import { SceneRoot } from '../view/SceneRoot';
import { ShardFX } from '../view/ShardFX';
import { VoxelRenderer } from '../view/VoxelRenderer';
import { createBlockout } from '../view/blockout';
import { createCrackAtlas } from '../view/crackAtlas';
import dioriteUrl from '../../assets/images/diorite.png';
import { Crosshair } from '../ui/Crosshair';
import { DebugMenu } from '../ui/DebugMenu';
import { StartOverlay } from '../ui/StartOverlay';
import { WinOverlay } from '../ui/WinOverlay';
import { GameLoop } from './GameLoop';
import { InputController } from './InputController';

type GameState = 'start' | 'playing' | 'paused' | 'win';

const DUST_INTERVAL_MS = 100;

export class Game {
  readonly events = new GameEvents();

  private state: GameState = 'start';
  private resumeTimer = 0;
  private targetIndex = -1;
  private lastDustAt = Number.NEGATIVE_INFINITY;
  private firstHitTime: number | null = null;
  private marbleTotal = 0;
  /** Мрамор снят, но оверлей победы ждёт Esc — можно отойти и посмотреть заказ. */
  private finished = false;
  private pendingScore: ScoreResult | null = null;
  /** Хранится в игре, а не в системе долбёжки: та пересоздаётся на каждом рестарте. */
  private oneShot = false;
  private levelId = 'duck';
  /** Чтобы не пересобирать комнату на «Заново», если тип уровня не сменился. */
  private arenaSize: LevelSize | null = null;

  // всё, что принадлежит уровню, пересоздаётся на рестарте
  private grid!: VoxelGrid;
  private voxelRenderer!: VoxelRenderer;
  private highlightBox!: HighlightBox;
  private shardFX!: ShardFX;
  private chisel!: ChiselSystem;
  private collisionWorld!: CollisionWorld;

  private readonly sceneRoot: SceneRoot;
  private arena!: ArenaLayout;
  private blockout!: THREE.Group;
  private readonly playerBody: PlayerBody;
  private readonly playerCamera: PlayerCamera;
  private readonly gridOrigin = new THREE.Vector3();
  private readonly rayOrigin = new THREE.Vector3();
  private readonly cellPoint = new THREE.Vector3();
  private readonly crosshair: Crosshair;
  private readonly startOverlay: StartOverlay;
  private readonly debugMenu: DebugMenu;
  private readonly winOverlay: WinOverlay;
  private readonly input: InputController;
  private readonly loop: GameLoop;

  constructor(canvas: HTMLCanvasElement, ui: HTMLElement) {
    this.sceneRoot = new SceneRoot(canvas);

    this.playerBody = new PlayerBody(CONFIG.player);
    this.playerCamera = new PlayerCamera(this.sceneRoot.camera, 0);

    this.crosshair = new Crosshair(ui);
    this.startOverlay = new StartOverlay(ui, {
      onSelectLevel: (id) => this.selectLevel(id),
      onContinue: () => this.beginPlay(),
    });
    this.winOverlay = new WinOverlay(ui, () => this.restartLevel());

    this.debugMenu = new DebugMenu({
      onOneShotChange: (enabled) => this.setOneShot(enabled),
      onKeepSingleVoxel: () => this.keepSingleMarbleVoxel(),
    });
    // в сборку отладка не уезжает: в проде меню паузы остаётся чистым
    if (import.meta.env.DEV) this.startOverlay.mount(this.debugMenu.element);

    this.buildLevel();

    this.input = new InputController(canvas, {
      onLook: (dx, dy) => {
        if (this.state === 'playing') this.playerCamera.look(dx, dy);
      },
      onChiselStart: () => this.chisel.begin(),
      onChiselStop: () => this.chisel.stop(),
      onPullBack: (pulled) => {
        if (this.state === 'playing') this.playerCamera.setPulledBack(pulled);
      },
      onPause: () => this.pause(),
      onLockGained: () => this.enterPlaying(),
      onLockFailed: () => this.reportLockFailure(),
    });

    this.loop = new GameLoop(CONFIG.loop.maxDt, (dt) => this.frame(dt));
  }

  start(): void {
    this.startOverlay.show('start');
    this.loop.start();
  }

  restartLevel(): void {
    this.chisel.stop();
    this.teardownLevel();
    this.buildLevel();
    this.winOverlay.hide();
    this.startOverlay.hide();
    this.beginPlay();
  }

  dispose(): void {
    this.loop.stop();
    window.clearTimeout(this.resumeTimer);
    this.input.dispose();
    this.crosshair.destroy();
    this.debugMenu.destroy();
    this.startOverlay.destroy();
    this.winOverlay.destroy();
    this.events.clear();
    this.teardownLevel();
    this.teardownArena();
    this.sceneRoot.dispose();
  }

  private frame(dt: number): void {
    if (this.state === 'playing') {
      const move = this.input.movement;
      this.playerBody.update(dt, { ...move, yaw: this.playerCamera.yaw }, this.collisionWorld);
      // камера обновляется до рейкаста: цель берётся из уже актуального взгляда
      this.playerCamera.update(dt, this.playerBody.x, this.playerBody.eyeY, this.playerBody.z);
      if (this.finished) this.highlightBox.hide();
      else this.chisel.update(dt, this.updateTarget());
      this.shardFX.update(dt);
    }
    this.sceneRoot.render();
  }

  private buildLevel(): void {
    const def = playableLevel(this.levelId);
    this.rebuildArena(def.size);
    const level = def.create(gridSizeFor(def.size));
    this.grid = VoxelGrid.fromLevelData(level, CONFIG.chisel.marbleHp, CONFIG.chisel.sculptureHp);
    this.marbleTotal = this.grid.marbleRemaining;

    // внутри группы координаты остаются целочисленными клетками, масштаб задаётся снаружи
    const [ox, oy, oz] = this.arena.glybaMin;
    this.voxelRenderer = new VoxelRenderer(this.grid, level.paint);
    this.voxelRenderer.object.scale.setScalar(this.arena.voxelSize);
    this.voxelRenderer.object.position.set(ox, oy, oz);
    this.voxelRenderer.setCrackAtlas(
      createCrackAtlas(
        CONFIG.chisel.crackStages,
        CONFIG.crackAtlas.tileSize,
        CONFIG.crackAtlas.seed,
      ),
    );
    const marble = new THREE.TextureLoader().load(dioriteUrl);
    marble.colorSpace = THREE.SRGBColorSpace;
    marble.wrapS = THREE.RepeatWrapping;
    marble.wrapT = THREE.RepeatWrapping;
    this.voxelRenderer.setMarbleMap(marble);

    this.highlightBox = new HighlightBox();
    this.voxelRenderer.object.add(this.highlightBox.object);
    this.gridOrigin.set(ox, oy, oz);
    this.sceneRoot.scene.add(this.voxelRenderer.object);

    // осколки живут в мировом пространстве, иначе масштаб группы вокселей уменьшил бы и их
    this.shardFX = new ShardFX();
    this.sceneRoot.scene.add(this.shardFX.object);

    this.chisel = new ChiselSystem(
      this.grid,
      this.events,
      CONFIG.chisel.dps,
      CONFIG.chisel.crackStages,
    );
    this.chisel.setOneShot(this.oneShot);

    this.collisionWorld = new CollisionWorld(this.grid, this.arena);
    // без респавна игрок остался бы внутри восстановленного мрамора
    const { x, y, z, yawDeg } = this.arena.spawn;
    this.playerBody.teleport(x, y, z);
    this.playerCamera.reset(yawDeg);
    this.playerCamera.update(0, x, this.playerBody.eyeY, z);

    this.targetIndex = -1;
    this.firstHitTime = null;
    this.lastDustAt = Number.NEGATIVE_INFINITY;
    this.finished = false;
    this.pendingScore = null;

    this.events.clear();
    this.bindLevelEvents();
  }

  private rebuildArena(size: LevelSize): void {
    if (this.arenaSize === size) return;
    this.teardownArena();
    this.arena = createArena(
      gridSizeFor(size),
      CONFIG.arena,
      CONFIG.grid.voxelSize,
      size === 'medium',
    );
    this.blockout = createBlockout(this.arena);
    this.sceneRoot.scene.add(this.blockout);
    this.arenaSize = size;
  }

  private teardownArena(): void {
    this.arenaSize = null;
    if (this.blockout === undefined) return;
    this.sceneRoot.scene.remove(this.blockout);
    this.blockout.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.geometry.dispose();
        (node.material as THREE.Material).dispose();
      }
    });
  }

  private teardownLevel(): void {
    this.sceneRoot.scene.remove(this.voxelRenderer.object);
    this.sceneRoot.scene.remove(this.shardFX.object);
    this.highlightBox.dispose();
    this.shardFX.dispose();
    this.voxelRenderer.dispose();
  }

  /** Подписки на домен: вся визуализация урона идёт через события, а не через опрос сетки. */
  private bindLevelEvents(): void {
    this.events.on('voxelDamaged', ({ hit, hpNormalized, stage }) => {
      this.markFirstHit();
      this.voxelRenderer.setDamage(hit.index, 1 - hpNormalized, stage);
    });
    this.events.on('voxelDestroyed', ({ x, y, z, face }) => {
      this.voxelRenderer.removeVoxel(this.grid.indexOf(x, y, z));
      const centre = this.cellCentre(x, y, z);
      this.shardFX.burst(centre.x, centre.y, centre.z, face);
      this.playerCamera.kick();
    });
    this.events.on('sculptureHit', ({ x, y, z }) => {
      this.markFirstHit();
      // урон по оригиналу идёт каждый кадр, пыль без троттлинга залила бы прицел
      const now = performance.now();
      if (now - this.lastDustAt < DUST_INTERVAL_MS) return;
      this.lastDustAt = now;
      const centre = this.cellCentre(x, y, z);
      this.shardFX.dust(centre.x, centre.y, centre.z);
    });
    this.events.on('levelCompleted', () => this.completeLevel());
  }

  /** §15.2 GDD: время сессии считается с первого удара, а не с загрузки сцены. */
  private markFirstHit(): void {
    if (this.firstHitTime === null) this.firstHitTime = performance.now();
  }

  private completeLevel(): void {
    if (this.finished || this.state === 'win') return;
    this.finished = true;
    this.voxelRenderer.revealPaint(this.grid);
    this.chisel.stop();
    const seconds = this.firstHitTime === null ? 0 : (performance.now() - this.firstHitTime) / 1000;
    this.pendingScore = computeScore(this.grid, this.marbleTotal, seconds);
  }

  private showWin(score: ScoreResult): void {
    this.state = 'win';
    this.chisel.stop();
    this.crosshair.hide();
    this.highlightBox.hide();
    this.winOverlay.show(score);
  }

  private cellCentre(x: number, y: number, z: number): THREE.Vector3 {
    const s = this.arena.voxelSize;
    return this.cellPoint.set(
      this.gridOrigin.x + (x + 0.5) * s,
      this.gridOrigin.y + (y + 0.5) * s,
      this.gridOrigin.z + (z + 0.5) * s,
    );
  }

  private updateTarget(): HitResult | null {
    // рейкаст живёт в клетках сетки: направление масштаб не меняет, а вот точка и длина — да
    const s = this.arena.voxelSize;
    const origin = this.rayOrigin
      .copy(this.playerCamera.rayOrigin())
      .sub(this.gridOrigin)
      .divideScalar(s);
    const dir = this.playerCamera.rayDirection();
    const hit = raycastVoxels(
      this.grid,
      origin.x,
      origin.y,
      origin.z,
      dir.x,
      dir.y,
      dir.z,
      CONFIG.chisel.reach / s,
    );

    if (hit) this.highlightBox.showAt(hit.x, hit.y, hit.z);
    else this.highlightBox.hide();

    const index = hit ? hit.index : -1;
    if (index !== this.targetIndex) {
      this.targetIndex = index;
      this.events.emit('targetChanged', { hit });
    }

    return hit;
  }

  private setOneShot(enabled: boolean): void {
    this.oneShot = enabled;
    this.chisel.setOneShot(enabled);
  }

  /**
   * Отладка: оставляет один мраморный воксель — ближайший к игроку, чтобы до победного
   * экрана оставалось одно касание. Клетки снимаются напрямую, без событий домена:
   * несколько тысяч всплесков осколков и отдач камеры положили бы кадр.
   */
  private keepSingleMarbleVoxel(): void {
    if (this.grid.marbleRemaining <= 1) return;
    const keep = this.nearestMarbleIndex();

    for (let index = 0; index < this.grid.type.length; index++) {
      if (index === keep || this.grid.type[index] !== VoxelType.Marble) continue;
      this.grid.removeAt(index);
      this.voxelRenderer.removeVoxel(index);
    }

    this.targetIndex = -1;
  }

  private nearestMarbleIndex(): number {
    const eyeX = this.playerBody.x;
    const eyeY = this.playerBody.eyeY;
    const eyeZ = this.playerBody.z;
    let best = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < this.grid.type.length; index++) {
      if (this.grid.type[index] !== VoxelType.Marble) continue;
      const [x, y, z] = this.grid.coordsOf(index);
      const centre = this.cellCentre(x, y, z);
      const distance = (centre.x - eyeX) ** 2 + (centre.y - eyeY) ** 2 + (centre.z - eyeZ) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    }

    return best;
  }

  private selectLevel(id: string): void {
    if (this.levelId !== id) {
      this.levelId = id;
      this.teardownLevel();
      this.buildLevel();
    }
    this.beginPlay();
  }

  private beginPlay(): void {
    this.input.requestLock();
  }

  /** Переход в игру только после подтверждённой блокировки курсора. */
  private enterPlaying(): void {
    this.state = 'playing';
    this.startOverlay.hide();
    this.winOverlay.hide();
    this.debugMenu.hide();
    this.crosshair.show();
  }

  private reportLockFailure(): void {
    this.crosshair.hide();
    this.startOverlay.show('resume', 'Браузер придержал курсор. Нажми ещё раз.');
    this.debugMenu.show();
    this.armResumeButton();
  }

  private pause(): void {
    if (this.state !== 'playing') return;
    if (this.pendingScore !== null) {
      this.showWin(this.pendingScore);
      return;
    }
    this.state = 'paused';
    this.chisel.stop();
    this.crosshair.hide();
    this.startOverlay.show('resume');
    this.debugMenu.show();
    this.armResumeButton();
  }

  private armResumeButton(): void {
    const wait = this.input.msUntilLockAllowed();
    if (wait === 0) return;
    this.startOverlay.setEnabled(false);
    window.clearTimeout(this.resumeTimer);
    this.resumeTimer = window.setTimeout(() => this.startOverlay.setEnabled(true), wait);
  }
}
