export type Point = { x: number; y: number };

export type Enemy = Point & {
  id: string;
  direction: 'up' | 'down' | 'left' | 'right';
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

export type ScreenMode = 'start' | 'playing' | 'won' | 'lost' | 'settings';

export type ProgressState = {
  unlocked: number;
  bestTimes: Record<string, number>;
  themeId: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
};
