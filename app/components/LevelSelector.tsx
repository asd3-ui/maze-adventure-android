import type { Enemy, Point } from './types';

export const TOTAL_LEVELS = 25;

export const SIZES = [
  9, 9, 11, 11, 13, 13, 15, 15, 17, 17, 17, 19, 19, 19, 21, 21, 21, 23, 23, 23, 25, 25, 25, 25, 25,
];

export const LEVEL_THEMES = [
  {
    id: 'midnight',
    name: 'Midnight',
    bg: '#0d1426',
    panel: '#17223a',
    surface: '#1d2a42',
    fg: '#f4f7ff',
    primary: '#7dd3fc',
    accent: '#5ce1c0',
    wall: '#243451',
    floor: '#0f1c2f',
    goal: '#32d299',
    player: '#7dd3fc',
    enemy: '#f87171',
    secondary: '#90a8d8',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    bg: '#fff3df',
    panel: '#fffaf2',
    surface: '#ffe9c6',
    fg: '#31251d',
    primary: '#f59e0b',
    accent: '#fb7185',
    wall: '#f5d39d',
    floor: '#fff7eb',
    goal: '#ef4444',
    player: '#f59e0b',
    enemy: '#ea580c',
    secondary: '#8f6b4f',
  },
  {
    id: 'forest',
    name: 'Forest',
    bg: '#f1fdf0',
    panel: '#f7fff6',
    surface: '#dff9de',
    fg: '#163827',
    primary: '#22c55e',
    accent: '#10b981',
    wall: '#c7e7c6',
    floor: '#effdf2',
    goal: '#15803d',
    player: '#22c55e',
    enemy: '#dc2626',
    secondary: '#3a6a4d',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    bg: '#091d1f',
    panel: '#0d2a2f',
    surface: '#11383d',
    fg: '#e6fffb',
    primary: '#67e8f9',
    accent: '#a78bfa',
    wall: '#1a4445',
    floor: '#0a1c20',
    goal: '#34d399',
    player: '#67e8f9',
    enemy: '#f87171',
    secondary: '#9fcfc8',
  },
] as const;

export type MazeTheme = (typeof LEVEL_THEMES)[number];

export function generateMaze(n: number, seed: number): number[][] {
  const grid = Array.from({ length: n }, () => Array(n).fill(1));
  let s = seed;
  const random = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  const stack: Point[] = [{ x: 1, y: 1 }];
  grid[1][1] = 0;

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const options: Point[] = [];

    for (const [dx, dy] of [[0, -2], [2, 0], [0, 2], [-2, 0]]) {
      const x = current.x + dx;
      const y = current.y + dy;
      if (x > 0 && y > 0 && x < n - 1 && y < n - 1 && grid[y][x] === 1) {
        options.push({ x, y });
      }
    }

    if (options.length === 0) {
      stack.pop();
      continue;
    }

    const next = options[Math.floor(random() * options.length)];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    grid[midY][midX] = 0;
    grid[next.y][next.x] = 0;
    stack.push(next);
  }

  grid[n - 2][n - 2] = 0;
  return grid;
}

export function isWalkable(maze: number[][], x: number, y: number) {
  if (y < 0 || x < 0 || y >= maze.length || x >= maze.length) {
    return false;
  }
  return maze[y][x] === 0;
}

export function findShortestPath(maze: number[][]): Point[] {
  const size = maze.length;
  const start: Point = { x: 1, y: 1 };
  const goal: Point = { x: size - 2, y: size - 2 };
  const queue: Point[] = [start];
  const prev = new Map<string, Point | null>([[`${start.x},${start.y}`, null]]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.x === goal.x && current.y === goal.y) {
      break;
    }

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const key = `${nx},${ny}`;
      if (nx >= 0 && ny >= 0 && nx < size && ny < size && maze[ny][nx] === 0 && !prev.has(key)) {
        prev.set(key, current);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  const path: Point[] = [];
  let cursor: Point | null = goal;
  while (cursor) {
    path.push(cursor);
    cursor = prev.get(`${cursor.x},${cursor.y}`) ?? null;
  }

  return path.reverse();
}

export function buildLevel(level: number) {
  const size = SIZES[Math.min(level - 1, TOTAL_LEVELS - 1)];
  const maze = generateMaze(size, level * 137 + 17);
  const goal = { x: size - 2, y: size - 2 };
  const player = { x: 1, y: 1 };
  const enemies: Enemy[] = [];

  const cells: Point[] = [];
  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      if (maze[y][x] === 0 && !(x === 1 && y === 1) && !(x === goal.x && y === goal.y)) {
        cells.push({ x, y });
      }
    }
  }

  const enemyCount = Math.min(3, Math.max(1, Math.floor(level / 6)) + 1);
  for (let index = 0; index < enemyCount; index += 1) {
    const cell = cells[(index * 9 + level) % Math.max(cells.length, 1)] ?? { x: 2, y: 2 };
    enemies.push({ ...cell, id: `enemy-${level}-${index}`, direction: 'right' });
  }

  return {
    maze,
    player,
    goal,
    enemies,
    hint: findShortestPath(maze),
  };
}

export function advanceEnemies(maze: number[][], enemies: Enemy[], seed: number): Enemy[] {
  const dirs = [
    { dx: 0, dy: -1, direction: 'up' as const },
    { dx: 1, dy: 0, direction: 'right' as const },
    { dx: 0, dy: 1, direction: 'down' as const },
    { dx: -1, dy: 0, direction: 'left' as const },
  ];

  return enemies.map((enemy, index) => {
    const candidates = dirs.filter((dir) => {
      const nx = enemy.x + dir.dx;
      const ny = enemy.y + dir.dy;
      return isWalkable(maze, nx, ny) && !(nx === 1 && ny === 1);
    });

    if (candidates.length === 0) {
      return enemy;
    }

    const direction = candidates[(seed + index) % candidates.length];
    return {
      ...enemy,
      x: enemy.x + direction.dx,
      y: enemy.y + direction.dy,
      direction: direction.direction,
    };
  });
}
