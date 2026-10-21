export type Point = { x: number; y: number };

export type Direction = 'up' | 'down' | 'left' | 'right';

export type EnemyKind = 'walker' | 'hunter' | 'spinner' | 'phantom' | 'boss';

export type BossAttackPhase = 'charge' | 'pulse' | 'dash' | 'summon';

export type Enemy = Point & {
  id: string;
  kind: EnemyKind;
  direction: Direction;
  speed: number;
  hp?: number;
  maxHp?: number;
  phase?: BossAttackPhase;
};

export type MazeTheme = {
  id: string;
  name: string;
  bg: string;
  panel: string;
  surface: string;
  fg: string;
  primary: string;
  accent: string;
  wall: string;
  floor: string;
  goal: string;
  player: string;
  enemy: string;
  secondary: string;
};

export type ScreenMode = 'start' | 'playing' | 'won' | 'lost' | 'settings' | 'shop';

export type ProgressState = {
  unlocked: number;
  bestTimes: Record<string, number>;
  themeId: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  score: number;
  coins?: number;
  swords?: number;
  bombs?: number;
};

export type LevelConfig = {
  size: number;
  enemyCount: number;
  enemySpeed: number;
  hintDensity: number;
  scoreMultiplier: number;
  bossThreshold: number;
};
