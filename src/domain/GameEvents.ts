import type { Face, HitResult } from './types';

export interface GameEventMap {
  targetChanged: { hit: HitResult | null };
  voxelDamaged: { hit: HitResult; hpNormalized: number; stage: number };
  voxelDestroyed: { x: number; y: number; z: number; face: Face };
  sculptureHit: { x: number; y: number; z: number; hpNormalized: number };
  sculptureRuined: { x: number; y: number; z: number };
  levelCompleted: Record<string, never>;
}

type Listener<K extends keyof GameEventMap> = (payload: GameEventMap[K]) => void;

export class GameEvents {
  private readonly listeners = new Map<keyof GameEventMap, Set<Listener<keyof GameEventMap>>>();

  on<K extends keyof GameEventMap>(key: K, fn: Listener<K>): () => void {
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(fn as Listener<keyof GameEventMap>);
    return () => {
      set.delete(fn as Listener<keyof GameEventMap>);
    };
  }

  emit<K extends keyof GameEventMap>(key: K, payload: GameEventMap[K]): void {
    const set = this.listeners.get(key);
    if (!set) return;
    for (const fn of set) {
      (fn as Listener<K>)(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
