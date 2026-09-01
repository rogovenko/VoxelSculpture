import type { GameEvents } from './GameEvents';
import { VoxelType, type HitResult } from './types';
import type { VoxelGrid } from './VoxelGrid';

/**
 * Урон необратим: отпустил ЛКМ — трещины и остаток HP остаются на месте.
 * Мрамор больше не «залечивается» при смене цели, как это было в майнкрафтовой схеме.
 */
export class ChiselSystem {
  private holding = false;
  private oneShot = false;
  private readonly ruined: Uint8Array;

  constructor(
    private readonly grid: VoxelGrid,
    private readonly events: GameEvents,
    private readonly dps: number,
    private readonly crackStages: number,
  ) {
    this.ruined = new Uint8Array(grid.type.length);
  }

  get active(): boolean {
    return this.holding;
  }

  /**
   * Отладочный режим: мрамор рассыпается от первого же касания.
   * Оригинал сознательно оставлен с обычной прочностью — иначе случайный кадр по кресту
   * портил бы ровно ту оценку, ради которой уровень и прогоняют быстро.
   */
  setOneShot(enabled: boolean): void {
    this.oneShot = enabled;
  }

  begin(): void {
    this.holding = true;
  }

  stop(): void {
    this.holding = false;
  }

  update(dt: number, hit: HitResult | null): void {
    if (!this.holding || hit === null) return;

    const index = hit.index;
    const type = this.grid.type[index];
    if (type === VoxelType.Air) return;
    if (type === VoxelType.Sculpture && this.ruined[index] === 1) return;

    const maxHp = this.grid.maxHp[index];
    const instant = this.oneShot && type === VoxelType.Marble;
    this.grid.hp[index] -= instant ? maxHp : this.dps * dt;

    if (this.grid.hp[index] > 0) {
      const hpNormalized = this.grid.hp[index] / maxHp;
      if (type === VoxelType.Sculpture) {
        this.events.emit('sculptureHit', { x: hit.x, y: hit.y, z: hit.z, hpNormalized });
      }
      this.events.emit('voxelDamaged', { hit, hpNormalized, stage: this.stageFor(hpNormalized) });
      return;
    }

    if (type === VoxelType.Marble) {
      this.grid.removeAt(index);
      this.events.emit('voxelDestroyed', { x: hit.x, y: hit.y, z: hit.z, face: hit.face });
      if (this.grid.marbleRemaining === 0) {
        this.events.emit('levelCompleted', {});
      }
      return;
    }

    this.grid.hp[index] = 0;
    this.ruined[index] = 1;
    this.events.emit('sculptureHit', { x: hit.x, y: hit.y, z: hit.z, hpNormalized: 0 });
    this.events.emit('voxelDamaged', { hit, hpNormalized: 0, stage: -1 });
    this.events.emit('sculptureRuined', { x: hit.x, y: hit.y, z: hit.z });
  }

  reset(): void {
    this.holding = false;
    this.ruined.fill(0);
  }

  /** -1 означает «трещин нет». */
  private stageFor(hpNormalized: number): number {
    if (hpNormalized >= 1) return -1;
    const stage = Math.floor((1 - hpNormalized) * this.crackStages);
    if (stage < 0) return 0;
    return stage > this.crackStages - 1 ? this.crackStages - 1 : stage;
  }
}
