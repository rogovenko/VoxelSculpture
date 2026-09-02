import * as THREE from 'three';
import { CONFIG } from '../config';
import { ChiselSystem } from '../domain/ChiselSystem';
import { CollisionWorld } from '../domain/CollisionWorld';
import { GameEvents } from '../domain/GameEvents';
import { PlayerBody } from '../domain/PlayerBody';
import { computeScore, type ScoreResult } from '../domain/ScoreSystem';
import { VoxelGrid } from '../domain/VoxelGrid';
import { EFFECT_CATALOG, EffectSystem, type EffectId } from '../domain/EffectSystem';
import { gridSizeFor, nextPlayable, playableLevel, type LevelSize } from '../domain/levels/catalog';
import {
  composeArena,
  createLevelStage,
  createRoom,
  type ArenaLayout,
  type RoomLayout,
} from '../domain/levels/arena';
import { VoxelType, type HitResult } from '../domain/types';
import { aabbRayDistance } from '../domain/Aabb';
import { interactPriority, interactTargets, spawnBesideBed, type InteractKind } from '../domain/levels/layoutToDecor';
import type { FurnitureLayout } from '../domain/levels/furnitureCatalog';
import workshopJson from '../domain/levels/layouts/workshop.json';
import { raycastVoxels } from '../domain/voxelRaycast';
import { AabbHighlight } from '../view/AabbHighlight';
import { HighlightBox } from '../view/HighlightBox';
import { PlayerCamera } from '../view/PlayerCamera';
import { SceneRoot } from '../view/SceneRoot';
import { ShardFX } from '../view/ShardFX';
import { VoxelRenderer } from '../view/VoxelRenderer';
import { createBlockout } from '../view/blockout';
import { createScaffolding } from '../view/scaffold';
import { createRoomWalls } from '../view/roomWalls';
import { createRoomDecor } from '../view/roomDecor';
import { applyModelPoster, createModelPoster } from '../view/workshopPoster';
import { createCrackAtlas } from '../view/crackAtlas';
import dioriteUrl from '../../assets/images/diorite.png';
import { Crosshair } from '../ui/Crosshair';
import { MarbleBar } from '../ui/MarbleBar';
import { WalletHud } from '../ui/WalletHud';
import { EffectHud } from '../ui/EffectHud';
import { ShopOverlay } from '../ui/ShopOverlay';
import { LetterOverlay } from '../ui/LetterOverlay';
import { briefFor } from '../ui/briefLetters';
import { diaryFor } from '../ui/diaryEntries';
import { INTERACT_HINTS, InteractHint } from '../ui/InteractHint';
import { milestoneLine, STORY_CUES } from '../ui/cues';
import { DebugMenu } from '../ui/DebugMenu';
import { StartOverlay } from '../ui/StartOverlay';
import { WinOverlay } from '../ui/WinOverlay';
import { SleepOverlay } from '../ui/SleepOverlay';
import { GameLoop } from './GameLoop';
import { InputController } from './InputController';

type GameState = 'start' | 'playing' | 'paused' | 'shop' | 'letter' | 'win' | 'sleep';

const DUST_INTERVAL_MS = 100;

export class Game {
  readonly events = new GameEvents();

  private state: GameState = 'start';
  private resumeTimer = 0;
  private targetIndex = -1;
  private lastDustAt = Number.NEGATIVE_INFINITY;
  private firstHitTime: number | null = null;
  private marbleTotal = 0;
  /** Мрамор снят: ходить можно, статистика — со стола. */
  private finished = false;
  private pendingScore: ScoreResult | null = null;
  /** Хранится в игре, а не в системе долбёжки: та пересоздаётся на каждом рестарте. */
  private oneShot = false;
  private readonly effects = new EffectSystem();
  /** Lock снимаем сами: pause() не должен открыть паузу или победу. */
  private shopRequested = false;
  private docRequested: 'letter' | 'diary' | null = null;
  /** Стол после зачистки: статистика, не пауза по Esc. */
  private statsRequested = false;
  /** Кровать после последнего заказа: экран конца прототипа. */
  private completeRequested = false;
  /** Оплата за текущий заказ уже начислена — повторный стол не платит. */
  private orderPaid = false;
  /** Мысль, которую показать, когда снова окажемся в playing (после сна, сдачи, старта). */
  private pendingCue: string | null = null;
  /** Снятый мрамор за кампанию: пороги 1 / 10 / … не сбрасываются со сном. */
  private blocksBroken = 0;
  private nextMilestone = 0;
  /** Первый удар по оригиналу за кампанию — один раз предупреждаем. */
  private sculptWarned = false;
  private lastPayoutCents = 0;
  private lookInteract: InteractKind | null = null;
  /** Касса на всю сессию: рестарт заказа центы не сбрасывает. */
  private cents = CONFIG.money.startCents;
  private levelId = 'frog';
  /** Кровать только при переходе ко сну; иначе дверь. */
  private spawnKind: 'door' | 'bed' = 'door';
  private sleepElapsed = 0;
  private sleepSwapped = false;
  private sleepNextId = '';
  /** Старт кампании: «День 1» без смены заказа. */
  private sleepIntro = false;
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
  /** Комната живёт всю сессию: пол, стены, потолок, сквозной реквизит. */
  private readonly room: RoomLayout;
  private readonly roomBlockout: THREE.Group;
  private roomWalls: THREE.Group | null = null;
  private readonly interactTargets: ReturnType<typeof interactTargets>;
  private readonly interactHighlight: AabbHighlight;
  private readonly modelPoster: THREE.Mesh;
  private modelPosterLevel: string | null = null;
  private arena!: ArenaLayout;
  private stageBlockout: THREE.Group | null = null;
  private scaffoldView: THREE.Group | null = null;
  private scaffoldGen = 0;
  private readonly playerBody: PlayerBody;
  private readonly playerCamera: PlayerCamera;
  private readonly gridOrigin = new THREE.Vector3();
  private readonly rayOrigin = new THREE.Vector3();
  private readonly cellPoint = new THREE.Vector3();
  private readonly crosshair: Crosshair;
  private readonly marbleBar: MarbleBar;
  private readonly walletHud: WalletHud;
  private readonly effectHud: EffectHud;
  private readonly shopOverlay: ShopOverlay;
  private readonly letterOverlay: LetterOverlay;
  private readonly interactHint: InteractHint;
  private readonly startOverlay: StartOverlay;
  private readonly debugMenu: DebugMenu;
  private readonly winOverlay: WinOverlay;
  private readonly sleepOverlay: SleepOverlay;
  private readonly input: InputController;
  private readonly loop: GameLoop;

  constructor(canvas: HTMLCanvasElement, ui: HTMLElement) {
    this.sceneRoot = new SceneRoot(canvas);

    this.playerBody = new PlayerBody(CONFIG.player);
    this.playerCamera = new PlayerCamera(this.sceneRoot.camera, 0);

    this.crosshair = new Crosshair(ui);
    this.marbleBar = new MarbleBar(ui);
    this.walletHud = new WalletHud(ui);
    this.walletHud.set(this.cents);
    this.effectHud = new EffectHud(ui);
    this.shopOverlay = new ShopOverlay(ui, {
      onBuy: (id) => this.buyEffect(id),
      onClose: () => this.closeShop(),
    });
    this.letterOverlay = new LetterOverlay(ui, {
      onClose: () => this.closeLetter(),
    });
    this.interactHint = new InteractHint(ui);
    this.startOverlay = new StartOverlay(ui, {
      onContinue: () => {
        if (this.state === 'start') this.beginDayIntro();
        else this.beginPlay();
      },
    });
    this.winOverlay = new WinOverlay(ui, {
      onContinue: () => this.beginPlay(),
      onRestart: () => this.restartCampaign(),
    });
    this.sleepOverlay = new SleepOverlay(ui);

    this.debugMenu = new DebugMenu({
      onOneShotChange: (enabled) => this.setOneShot(enabled),
      onKeepSingleVoxel: () => this.keepSingleMarbleVoxel(),
      onSelectLevel: (id) => this.debugPlayLevel(id),
    });
    // в сборку отладка не уезжает: в проде меню паузы остаётся чистым
    if (import.meta.env.DEV) this.startOverlay.mount(this.debugMenu.element);

    this.room = createRoom(CONFIG.arena);
    this.roomBlockout = createBlockout(this.room.boxes);
    this.sceneRoot.scene.add(this.roomBlockout);
    void createRoomWalls().then((walls) => {
      this.roomWalls = walls;
      this.sceneRoot.scene.add(walls);
    });
    void createRoomDecor().then((decor) => {
      this.sceneRoot.scene.add(decor);
    });
    this.modelPoster = createModelPoster(this.levelId);
    this.modelPosterLevel = this.levelId;
    this.sceneRoot.scene.add(this.modelPoster);
    this.interactTargets = interactTargets(workshopJson as FurnitureLayout);
    this.interactHighlight = new AabbHighlight();
    this.sceneRoot.scene.add(this.interactHighlight.object);

    this.buildLevel();

    this.input = new InputController(canvas, {
      onLook: (dx, dy) => {
        if (this.state === 'playing') this.playerCamera.look(dx, dy);
      },
      onChiselStart: () => {
        if (this.state !== 'playing') return;
        if (this.tryInteract()) return;
        this.chisel.begin();
      },
      onChiselStop: () => this.chisel.stop(),
      onPullBack: (pulled) => {
        if (this.state === 'playing') this.playerCamera.setPulledBack(pulled);
      },
      onPause: () => this.pause(),
      onLockGained: () => {
        if (this.state === 'sleep') return;
        this.enterPlaying();
      },
      onLockFailed: () => this.reportLockFailure(),
    });

    this.loop = new GameLoop(CONFIG.loop.maxDt, (dt) => this.frame(dt));
  }

  start(): void {
    this.startOverlay.show('start');
    this.loop.start();
  }

  /** Новая сессия: лягушка, стартовая касса, титульный экран. */
  private restartCampaign(): void {
    this.chisel.stop();
    this.cents = CONFIG.money.startCents;
    this.walletHud.set(this.cents);
    this.levelId = 'frog';
    this.spawnKind = 'door';
    this.blocksBroken = 0;
    this.nextMilestone = 0;
    this.sculptWarned = false;
    this.pendingCue = null;
    this.teardownLevel();
    this.buildLevel();
    this.winOverlay.hide();
    this.sleepOverlay.hide();
    this.shopOverlay.hide();
    this.letterOverlay.hide();
    this.crosshair.hide();
    this.marbleBar.hide();
    this.walletHud.hide();
    this.effectHud.hide();
    this.interactHint.hide();
    this.debugMenu.hide();
    this.state = 'start';
    this.startOverlay.show('start');
  }

  dispose(): void {
    this.loop.stop();
    window.clearTimeout(this.resumeTimer);
    this.input.dispose();
    this.crosshair.destroy();
    this.marbleBar.destroy();
    this.walletHud.destroy();
    this.effectHud.destroy();
    this.shopOverlay.destroy();
    this.letterOverlay.destroy();
    this.interactHint.destroy();
    this.debugMenu.destroy();
    this.startOverlay.destroy();
    this.winOverlay.destroy();
    this.sleepOverlay.destroy();
    this.events.clear();
    this.teardownLevel();
    this.teardownStage();
    this.teardownRoom();
    this.sceneRoot.dispose();
  }

  private frame(dt: number): void {
    if (this.state === 'playing') {
      const move = this.input.movement;
      this.playerBody.update(dt, { ...move, yaw: this.playerCamera.yaw }, this.collisionWorld);
      // камера обновляется до рейкаста: цель берётся из уже актуального взгляда
      this.playerCamera.update(dt, this.playerBody.x, this.playerBody.eyeY, this.playerBody.z);
      this.effects.update(dt);
      this.syncChiselEffects();
      this.effectHud.sync(this.effects.snapshot());
      if (this.finished) this.highlightBox.hide();
      else this.chisel.update(dt, this.updateTarget());
      this.updateInteractHighlight();
      this.shardFX.update(dt);
    } else if (this.state === 'sleep') {
      this.tickSleep(dt);
    } else {
      this.interactHighlight.hide();
      this.interactHint.setLook(null);
    }
    this.sceneRoot.render();
  }

  private buildLevel(): void {
    const def = playableLevel(this.levelId);
    this.syncModelPoster();
    this.rebuildStage(def.size);
    const level = def.create(gridSizeFor(def.size));
    this.grid = VoxelGrid.fromLevelData(level, CONFIG.chisel.marbleHp, CONFIG.chisel.sculptureHp);
    this.marbleTotal = this.grid.marbleRemaining;
    this.marbleBar.set(this.marbleTotal, this.grid.marbleRemaining);

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
    this.syncChiselEffects();

    this.collisionWorld = new CollisionWorld(this.grid, this.arena);
    // без респавна игрок остался бы внутри восстановленного мрамора
    const layout = workshopJson as FurnitureLayout;
    const bedSpawn =
      this.spawnKind === 'bed'
        ? spawnBesideBed(layout, CONFIG.player.width, CONFIG.arena.bedSpawnGap)
        : null;
    this.spawnKind = 'door';
    if (bedSpawn !== null) {
      this.playerBody.teleport(bedSpawn.x, bedSpawn.y, bedSpawn.z);
      this.playerCamera.clearKick();
      this.playerCamera.update(0, bedSpawn.x, this.playerBody.eyeY, bedSpawn.z);
    } else {
      const { x, y, z, yawDeg } = this.arena.spawn;
      this.playerBody.teleport(x, y, z);
      this.playerCamera.reset(yawDeg);
      this.playerCamera.update(0, x, this.playerBody.eyeY, z);
    }

    this.targetIndex = -1;
    this.firstHitTime = null;
    this.lastDustAt = Number.NEGATIVE_INFINITY;
    this.finished = false;
    this.pendingScore = null;
    this.orderPaid = false;
    this.lastPayoutCents = 0;

    this.events.clear();
    this.bindLevelEvents();

    this.effects.clear();
    this.effectHud.sync([]);
  }

  private rebuildStage(size: LevelSize): void {
    if (this.arenaSize === size) return;
    this.teardownStage();
    const stage = createLevelStage(gridSizeFor(size), CONFIG.arena, CONFIG.grid.voxelSize, {
      scaffolding: size === 'medium',
      table: size === 'little',
    });
    this.arena = composeArena(this.room, stage);
    this.stageBlockout = createBlockout(stage.boxes, stage.ladders);
    this.sceneRoot.scene.add(this.stageBlockout);
    this.arenaSize = size;
    const gen = ++this.scaffoldGen;
    void createScaffolding(stage.boxes, stage.ladders).then((view) => {
      if (gen !== this.scaffoldGen || view === null) return;
      this.teardownScaffold();
      this.scaffoldView = view;
      this.sceneRoot.scene.add(view);
    });
  }

  private teardownScaffold(): void {
    if (this.scaffoldView === null) return;
    this.sceneRoot.scene.remove(this.scaffoldView);
    this.scaffoldView = null;
  }

  private teardownStage(): void {
    this.arenaSize = null;
    this.scaffoldGen += 1;
    this.teardownScaffold();
    if (this.stageBlockout === null) return;
    this.sceneRoot.scene.remove(this.stageBlockout);
    disposeGroup(this.stageBlockout);
    this.stageBlockout = null;
  }

  private teardownRoom(): void {
    this.sceneRoot.scene.remove(this.roomBlockout);
    disposeGroup(this.roomBlockout);
    this.sceneRoot.scene.remove(this.interactHighlight.object);
    this.interactHighlight.dispose();
    this.sceneRoot.scene.remove(this.modelPoster);
    const posterMap = (this.modelPoster.material as THREE.MeshLambertMaterial).map;
    posterMap?.dispose();
    this.modelPoster.geometry.dispose();
    (this.modelPoster.material as THREE.Material).dispose();
    if (this.roomWalls !== null) {
      this.sceneRoot.scene.remove(this.roomWalls);
      disposeGroup(this.roomWalls);
      this.roomWalls = null;
    }
  }

  private syncModelPoster(): void {
    if (this.modelPosterLevel === this.levelId) return;
    applyModelPoster(this.modelPoster, this.levelId);
    this.modelPosterLevel = this.levelId;
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
      this.marbleBar.set(this.marbleTotal, this.grid.marbleRemaining);
      this.cents += CONFIG.money.centsPerBlock;
      this.walletHud.add(CONFIG.money.centsPerBlock);
      this.noteBrokenBlock();
    });
    this.events.on('sculptureHit', ({ x, y, z }) => {
      this.markFirstHit();
      if (!this.sculptWarned) {
        this.sculptWarned = true;
        this.interactHint.cue(STORY_CUES.hitSculpture);
      }
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

  private noteBrokenBlock(): void {
    this.blocksBroken += 1;
    const marks = CONFIG.cues.milestones;
    while (this.nextMilestone < marks.length && this.blocksBroken >= marks[this.nextMilestone]) {
      const count = marks[this.nextMilestone];
      this.nextMilestone += 1;
      const line = milestoneLine(count);
      if (line !== null) this.interactHint.cue(line, CONFIG.cues.thoughtMs);
    }
  }

  private flushCue(): void {
    if (this.pendingCue === null) return;
    const text = this.pendingCue;
    this.pendingCue = null;
    this.interactHint.cue(text);
  }

  private completeLevel(): void {
    if (this.finished || this.state === 'win') return;
    this.finished = true;
    this.voxelRenderer.revealPaint(this.grid);
    this.chisel.stop();
    const seconds = this.firstHitTime === null ? 0 : (performance.now() - this.firstHitTime) / 1000;
    this.pendingScore = computeScore(this.grid, this.marbleTotal, seconds);
    this.marbleBar.set(this.marbleTotal, 0);
    this.interactHint.cue(STORY_CUES.submitOrder);
  }

  private showWin(score: ScoreResult): void {
    this.enterWinHud();
    this.winOverlay.show(score, this.lastPayoutCents);
    this.armWinButtons();
  }

  private showComplete(): void {
    this.enterWinHud();
    this.winOverlay.showComplete();
    this.armWinButtons();
  }

  private enterWinHud(): void {
    this.state = 'win';
    this.chisel.stop();
    this.crosshair.hide();
    this.marbleBar.hide();
    this.walletHud.hide();
    this.effectHud.hide();
    this.shopOverlay.hide();
    this.letterOverlay.hide();
    this.interactHint.hide();
    this.highlightBox.hide();
    this.interactHighlight.hide();
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

  private updateInteractHighlight(): void {
    const origin = this.playerCamera.rayOrigin();
    const dir = this.playerCamera.rayDirection();
    let best: (typeof this.interactTargets)[number] | null = null;
    let bestDist: number = CONFIG.interact.reach;
    let bestPri = -1;
    for (const target of this.interactTargets) {
      const hit = aabbRayDistance(
        target.box,
        origin.x,
        origin.y,
        origin.z,
        dir.x,
        dir.y,
        dir.z,
        CONFIG.interact.reach,
      );
      if (hit === null) continue;
      const pri = interactPriority(target.kind);
      if (pri < bestPri) continue;
      if (pri === bestPri && hit >= bestDist) continue;
      best = target;
      bestDist = hit;
      bestPri = pri;
    }
    this.lookInteract = best?.kind ?? null;
    const promptKind = this.lookInteract === 'desk' && this.orderPaid ? null : this.lookInteract;
    this.interactHint.setLook(promptKind);
    if (best === null) this.interactHighlight.hide();
    else this.interactHighlight.show(best.box);
  }

  /** Телефон — магазин, стол — сдать или мысль, кровать после сдачи — следующий заказ. */
  private tryInteract(): boolean {
    if (this.state !== 'playing' || this.lookInteract === null) return false;
    if (this.lookInteract === 'phone') {
      this.shopRequested = true;
      this.chisel.stop();
      this.input.exitLock();
      return true;
    }
    if (this.lookInteract === 'letter') {
      this.openDocument('letter');
      return true;
    }
    if (this.lookInteract === 'diary') {
      this.openDocument('diary');
      return true;
    }
    if (this.lookInteract === 'desk' && this.finished && this.pendingScore !== null && !this.orderPaid) {
      this.submitOrder();
      return true;
    }
    if (this.lookInteract === 'desk' && this.orderPaid) {
      this.interactHint.think('Работа уже сдана.');
      return true;
    }
    if (this.lookInteract === 'bed' && this.orderPaid) {
      this.sleepAfterOrder();
      return true;
    }
    const thought = INTERACT_HINTS[this.lookInteract].thought;
    if (thought === null) return false;
    this.interactHint.think(thought);
    return true;
  }

  private openDocument(kind: 'letter' | 'diary'): void {
    this.docRequested = kind;
    this.chisel.stop();
    this.input.exitLock();
  }

  private submitOrder(): void {
    if (this.orderPaid) return;
    this.orderPaid = true;
    this.lastPayoutCents = payoutCents(this.levelId);
    this.cents += this.lastPayoutCents;
    this.walletHud.set(this.cents);
    this.marbleBar.markSubmitted();
    this.statsRequested = true;
    this.pendingCue = STORY_CUES.goSleep;
    this.chisel.stop();
    this.input.exitLock();
  }

  /** Следующий заказ с кровати; после последнего — экран конца прототипа. */
  private sleepAfterOrder(): void {
    this.chisel.stop();
    const next = nextPlayable(this.levelId);
    if (next === null) {
      this.completeRequested = true;
      this.input.exitLock();
      return;
    }
    this.state = 'sleep';
    this.sleepIntro = false;
    this.sleepNextId = next.id;
    this.sleepElapsed = 0;
    this.sleepSwapped = false;
    this.crosshair.hide();
    this.marbleBar.hide();
    this.walletHud.hide();
    this.effectHud.hide();
    this.interactHint.hide();
    this.interactHighlight.hide();
    this.highlightBox.hide();
    this.sleepOverlay.setDay(next.number);
    this.sleepOverlay.setCaption(false);
    this.sleepOverlay.setFade(0);
    this.sleepOverlay.show();
  }

  private tickSleep(dt: number): void {
    this.playerCamera.update(dt, this.playerBody.x, this.playerBody.eyeY, this.playerBody.z);
    this.sleepElapsed += dt;
    const fadeOut = CONFIG.sleep.fadeOut;
    const hold = CONFIG.sleep.hold;
    const fadeIn = CONFIG.sleep.fadeIn;
    const holdEnd = fadeOut + hold;
    const total = holdEnd + fadeIn;

    if (this.sleepElapsed < fadeOut) {
      this.sleepOverlay.setFade(this.sleepElapsed / fadeOut);
      this.sleepOverlay.setCaption(false);
      return;
    }
    if (this.sleepElapsed < holdEnd) {
      this.sleepOverlay.setFade(1);
      this.sleepOverlay.setCaption(true);
      if (!this.sleepSwapped && !this.sleepIntro) {
        this.sleepSwapped = true;
        this.spawnKind = 'bed';
        this.levelId = this.sleepNextId;
        this.teardownLevel();
        this.buildLevel();
      }
      return;
    }
    if (this.sleepElapsed < total) {
      this.sleepOverlay.setCaption(false);
      this.sleepOverlay.setFade(1 - (this.sleepElapsed - holdEnd) / fadeIn);
      return;
    }
    this.finishSleep();
  }

  private finishSleep(): void {
    const intro = this.sleepIntro;
    this.sleepIntro = false;
    this.sleepOverlay.hide();
    this.pendingCue = intro ? STORY_CUES.readBrief : STORY_CUES.newDay;
    this.enterPlaying();
    if (!this.input.isLocked) this.beginPlay();
  }

  /** «Начать»: чёрный экран, «День 1», прояснение в мастерскую. Lock с того же клика. */
  private beginDayIntro(): void {
    this.state = 'sleep';
    this.sleepIntro = true;
    this.sleepElapsed = CONFIG.sleep.fadeOut;
    this.sleepSwapped = false;
    this.startOverlay.hide();
    this.debugMenu.hide();
    this.crosshair.hide();
    this.marbleBar.hide();
    this.walletHud.hide();
    this.effectHud.hide();
    this.interactHint.hide();
    this.sleepOverlay.setDay(playableLevel(this.levelId).number);
    this.sleepOverlay.setFade(1);
    this.sleepOverlay.setCaption(true);
    this.sleepOverlay.show();
    this.input.requestLock();
  }

  private buyEffect(id: EffectId): void {
    const item = CONFIG.effects.shop.find((entry) => entry.id === id);
    if (item === undefined) return;
    if (this.effects.has(id)) {
      this.shopOverlay.setRefuse(EFFECT_CATALOG[id].refuse);
      return;
    }
    if (this.cents < item.cents) return;
    this.cents -= item.cents;
    this.walletHud.set(this.cents);
    this.effects.grant(id, item.duration);
    this.syncChiselEffects();
    this.effectHud.sync(this.effects.snapshot());
    this.shopOverlay.setRefuse('');
    this.shopOverlay.sync(this.cents, this.activeEffectIds());
  }

  private closeShop(): void {
    if (this.state !== 'shop') return;
    if (this.input.msUntilLockAllowed() > 0) return;
    this.shopOverlay.hide();
    this.beginPlay();
  }

  private closeLetter(): void {
    if (this.state !== 'letter') return;
    if (this.input.msUntilLockAllowed() > 0) return;
    this.letterOverlay.hide();
    this.beginPlay();
  }

  private activeEffectIds(): Set<EffectId> {
    return new Set(this.effects.snapshot().map((effect) => effect.id));
  }

  private setOneShot(enabled: boolean): void {
    this.oneShot = enabled;
    this.syncChiselEffects();
  }

  private syncChiselEffects(): void {
    this.chisel.setOneShot(this.oneShot || this.effects.has('oneshot'));
    this.chisel.setDpsScale(this.effects.has('haste') ? CONFIG.effects.hasteMultiplier : 1);
    this.chisel.setProtectSculpture(this.effects.has('care'));
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
    this.marbleBar.set(this.marbleTotal, this.grid.marbleRemaining);
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

  /** С паузы в DEV: сразу этот заказ, спавн у двери, без сна. Касса не сбрасывается. */
  private debugPlayLevel(id: string): void {
    this.chisel.stop();
    this.spawnKind = 'door';
    this.levelId = id;
    this.teardownLevel();
    this.buildLevel();
    this.winOverlay.hide();
    this.startOverlay.hide();
    this.debugMenu.hide();
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
    this.sleepOverlay.hide();
    this.debugMenu.hide();
    this.shopOverlay.hide();
    this.letterOverlay.hide();
    this.crosshair.show();
    this.marbleBar.show();
    this.walletHud.show();
    this.effectHud.sync(this.effects.snapshot());
    this.effectHud.show();
    this.flushCue();
  }

  private reportLockFailure(): void {
    if (this.state === 'sleep') return;
    this.crosshair.hide();
    this.marbleBar.hide();
    this.walletHud.hide();
    this.effectHud.hide();
    this.shopOverlay.hide();
    this.letterOverlay.hide();
    this.interactHint.hide();
    this.winOverlay.hide();
    this.startOverlay.show('resume', 'Браузер придержал курсор. Нажми ещё раз.');
    this.debugMenu.show();
    this.armResumeButton();
  }

  private pause(): void {
    if (this.shopRequested) {
      this.shopRequested = false;
      this.enterShop();
      return;
    }
    if (this.docRequested !== null) {
      const kind = this.docRequested;
      this.docRequested = null;
      this.enterDocument(kind);
      return;
    }
    if (this.statsRequested) {
      this.statsRequested = false;
      if (this.pendingScore !== null) this.showWin(this.pendingScore);
      return;
    }
    if (this.completeRequested) {
      this.completeRequested = false;
      this.showComplete();
      return;
    }
    if (this.state === 'shop' || this.state === 'letter') return;
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.chisel.stop();
    this.crosshair.hide();
    this.marbleBar.hide();
    this.walletHud.hide();
    this.effectHud.hide();
    this.interactHint.hide();
    this.startOverlay.show('resume');
    this.debugMenu.show();
    this.armResumeButton();
  }

  private enterShop(): void {
    this.state = 'shop';
    this.chisel.stop();
    this.crosshair.hide();
    this.marbleBar.hide();
    this.interactHint.hide();
    this.walletHud.show();
    this.effectHud.sync(this.effects.snapshot());
    this.effectHud.show();
    this.letterOverlay.hide();
    this.shopOverlay.show(this.cents, this.activeEffectIds());
    this.armShopClose();
  }

  private enterDocument(kind: 'letter' | 'diary'): void {
    this.state = 'letter';
    this.chisel.stop();
    this.crosshair.hide();
    this.marbleBar.hide();
    this.walletHud.hide();
    this.effectHud.hide();
    this.interactHint.hide();
    this.shopOverlay.hide();
    if (kind === 'diary') {
      this.letterOverlay.show('diary', 'Дневник', diaryFor(this.levelId).paragraphs);
    } else {
      this.letterOverlay.show('letter', 'Техническое задание', briefFor(this.levelId).paragraphs);
    }
    this.armLetterClose();
  }

  private armShopClose(): void {
    const wait = this.input.msUntilLockAllowed();
    if (wait === 0) {
      this.shopOverlay.setCloseEnabled(true);
      return;
    }
    this.shopOverlay.setCloseEnabled(false);
    window.clearTimeout(this.resumeTimer);
    this.resumeTimer = window.setTimeout(() => this.shopOverlay.setCloseEnabled(true), wait);
  }

  private armLetterClose(): void {
    const wait = this.input.msUntilLockAllowed();
    if (wait === 0) {
      this.letterOverlay.setCloseEnabled(true);
      return;
    }
    this.letterOverlay.setCloseEnabled(false);
    window.clearTimeout(this.resumeTimer);
    this.resumeTimer = window.setTimeout(() => this.letterOverlay.setCloseEnabled(true), wait);
  }

  private armResumeButton(): void {
    const wait = this.input.msUntilLockAllowed();
    if (wait === 0) return;
    this.startOverlay.setEnabled(false);
    window.clearTimeout(this.resumeTimer);
    this.resumeTimer = window.setTimeout(() => this.startOverlay.setEnabled(true), wait);
  }

  private armWinButtons(): void {
    const wait = this.input.msUntilLockAllowed();
    if (wait === 0) return;
    this.winOverlay.setEnabled(false);
    window.clearTimeout(this.resumeTimer);
    this.resumeTimer = window.setTimeout(() => this.winOverlay.setEnabled(true), wait);
  }
}

function payoutCents(levelId: string): number {
  const table = CONFIG.money.payouts as Record<string, number>;
  return table[levelId] ?? 0;
}

function disposeGroup(group: THREE.Group): void {
  group.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.geometry.dispose();
      (node.material as THREE.Material).dispose();
    }
  });
}
