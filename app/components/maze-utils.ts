import type { BossAttackPhase, Direction, Enemy, EnemyKind, LevelConfig, Point } from './types';

export const TOTAL_LEVELS = 100;

export const LEVEL_ENVIRONMENTS = [
  'غابة الضباب','صحراء الذهب','كهوف الجليد','قلعة الظلال','مستنقع السموم','بركان اللهب','مدينة الأطلال','معبد البلور','مناجم الظلام','وادي العواصف',
  'غابة الفطر','قصر الرمال','بحيرة متجمدة','حصن العظام','أدغال مسحورة','حمم التنين','مقبرة قديمة','كهف الكريستال','أنفاق مهجورة','قمم الرعد',
  'حديقة الأشواك','صحراء الليل','ممرات الجليد','برج الساحر','مستنقع الأشباح','فوهة البركان','مدينة مغمورة','معبد الشمس','منجم الألماس','وادي الرياح',
  'غابة القمر','كثبان حمراء','قصر الصقيع','حصن الحديد','أدغال الظلال','بحيرة الحمم','سراديب الملوك','كهوف الياقوت','مصنع مهجور','جبال العاصفة',
  'غابة العمالقة','صحراء العظام','متاهة الثلج','قلعة الغراب','مستنقع السحر','قلب البركان','مدينة الأشباح','معبد القمر','مناجم الملك','وادي الصواعق',
  'غابة البلور','صحراء السراب','نهر الجليد','حصن الوحوش','أدغال الليل','جبل النار','مرفأ غارق','معبد التنين','أنفاق الذهب','عاصفة الرمال',
  'غابة الأرواح','صحراء الزمرد','كهف الشتاء','قلعة الدم','مستنقع الظلام','حمم سوداء','مدينة مفقودة','معبد النجوم','منجم اللعنة','وادي التنين',
  'غابة التيه','صحراء الأشباح','قصر الجليد','حصن الجحيم','أدغال الأفاعي','قلب الجبل','أطلال البحر','معبد الزمن','مناجم الجبابرة','قمة البرق',
  'الغابة المحرمة','بحر الرمال','متاهة الصقيع','قلعة الجحيم','مستنقع الأبدية','بركان التنين','عاصمة الظلال','معبد الأبطال','منجم الملك الأخير','وادي النهاية',
  'غابة العوالم','صحراء القيامة','مملكة الجليد','عرش الوحوش','مستنقع الخلود','جحيم النار','المدينة الأخيرة','معبد الأبدية','قلب المتاهة','عرين ملك الوحوش',
] as const;

export const SIZES = Array.from({ length: TOTAL_LEVELS }, (_, index) => Math.min(31, 9 + Math.floor(index / 6) * 2));

const DIRECTIONS = [
  { x: 0, y: -1, direction: 'up' as const },
  { x: 1, y: 0, direction: 'right' as const },
  { x: 0, y: 1, direction: 'down' as const },
  { x: -1, y: 0, direction: 'left' as const },
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

export function getLevelConfig(level: number): LevelConfig {
  const size = SIZES[Math.min(level - 1, SIZES.length - 1)];
  const enemyCount = Math.min(14, 1 + Math.floor(level / 2.5));
  const enemySpeed = Math.max(380, 1700 - level * 13);

  return {
    size,
    enemyCount,
    enemySpeed,
    hintDensity: Math.max(0.08, 0.75 - level * 0.0065),
    scoreMultiplier: 1 + level * 0.12,
    bossThreshold: Math.max(3, 9 - Math.floor(level / 12)),
  };
}

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

  // Keep the maze as a perfect maze: no extra loop openings. This gives each
  // level one clearly defined external exit and prevents accidental side exits.
  // The only opening in the outer boundary is the gate at the bottom.
  grid[n - 2][n - 2] = 0;
  grid[n - 1][n - 2] = 0;
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
  const goal: Point = { x: size - 2, y: size - 1 };
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

function findPathAvoidingCells(maze: number[][], start: Point, goal: Point, blocked: Set<string>): Point[] {
  const queue: Point[] = [start];
  const previous = new Map<string, Point | null>([[`${start.x},${start.y}`, null]]);
  const goalKey = `${goal.x},${goal.y}`;

  while (queue.length > 0 && !previous.has(goalKey)) {
    const current = queue.shift()!;
    for (const direction of DIRECTIONS) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const key = `${next.x},${next.y}`;
      if (!isWalkable(maze, next.x, next.y) || blocked.has(key) || previous.has(key)) continue;
      previous.set(key, current);
      queue.push(next);
    }
  }

  if (!previous.has(goalKey)) return [];
  const path: Point[] = [];
  let cursor: Point | null = goal;
  while (cursor) {
    path.push(cursor);
    cursor = previous.get(`${cursor.x},${cursor.y}`) ?? null;
  }
  return path.reverse();
}

function seededRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function getWalkableNeighbors(maze: number[][], point: Point) {
  return DIRECTIONS.filter(({ x, y }) => {
    const nx = point.x + x;
    const ny = point.y + y;
    return isWalkable(maze, nx, ny) && !(nx === 1 && ny === 1);
  });
}

function getDirectionFromDelta(dx: number, dy: number): Direction {
  if (dx === 1 && dy === 0) return 'right';
  if (dx === -1 && dy === 0) return 'left';
  if (dy === -1) return 'up';
  if (dy === 1) return 'down';
  return 'right';
}

function getNearestStepToward(maze: number[][], enemy: Enemy, target: Point, stepCount = 1) {
  // Use a real maze path so hunters can navigate turns and corridors without teleporting through walls.
  const queue: Point[] = [{ x: enemy.x, y: enemy.y }];
  const previous = new Map<string, Point | null>([[`${enemy.x},${enemy.y}`, null]]);
  const targetKey = `${target.x},${target.y}`;

  while (queue.length > 0 && !previous.has(targetKey)) {
    const current = queue.shift()!;
    for (const direction of DIRECTIONS) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const key = `${next.x},${next.y}`;
      if (!isWalkable(maze, next.x, next.y) || (next.x === 1 && next.y === 1) || previous.has(key)) continue;
      previous.set(key, current);
      queue.push(next);
    }
  }

  if (!previous.has(targetKey)) {
    const options = getWalkableNeighbors(maze, enemy);
    const fallback = options[0];
    return fallback ? {
      x: enemy.x + fallback.x,
      y: enemy.y + fallback.y,
      direction: fallback.direction,
      stepCount,
    } : null;
  }

  const path: Point[] = [];
  let cursor: Point | null = target;
  while (cursor) {
    path.push(cursor);
    cursor = previous.get(`${cursor.x},${cursor.y}`) ?? null;
  }
  path.reverse();
  const next = path[1];
  if (!next) return null;
  return {
    x: next.x,
    y: next.y,
    direction: getDirectionFromDelta(next.x - enemy.x, next.y - enemy.y),
    stepCount,
  };
}

export function chooseEnemyKind(level: number, index: number): EnemyKind {
  const pool: EnemyKind[] = ['walker', 'walker', 'hunter', 'spinner', 'phantom'];
  if (level >= 4) pool.push('hunter', 'hunter');
  if (level >= 8) pool.push('boss');
  if (level >= 12) pool.push('phantom', 'phantom');
  if (level >= 20) pool.push('boss');

  return pool[(index + level) % pool.length];
}

export function getBossPhase(turn: number, index: number): BossAttackPhase {
  const phases: BossAttackPhase[] = ['charge', 'pulse', 'dash', 'summon'];
  return phases[(turn + index) % phases.length];
}

export function buildLevel(level: number) {
  const config = getLevelConfig(level);
  const size = config.size;
  const maze = generateMaze(size, level * 137 + 17);
  const goal = { x: size - 2, y: size - 1 };
  const player = { x: 1, y: 1 };

  const cells: Point[] = [];
  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      if (maze[y][x] === 0 && !(x === 1 && y === 1) && !(x === goal.x && y === goal.y)) {
        cells.push({ x, y });
      }
    }
  }

  // Keep enemies away from the spawn and exit so the player always gets room to react.
  const safeEnemyCells = cells.filter((cell) =>
    Math.abs(cell.x - player.x) + Math.abs(cell.y - player.y) >= 5 &&
    Math.abs(cell.x - goal.x) + Math.abs(cell.y - goal.y) >= 3
  );
  const enemies: Enemy[] = [];
  const occupied = new Set<string>();
  for (let index = 0; index < config.enemyCount; index += 1) {
    const available = safeEnemyCells.filter((cell) => !occupied.has(`${cell.x},${cell.y}`));
    if (!available.length) break;
    const chosenIndex = Math.floor(seededRandom(level * 101 + index * 29 + 7) * available.length);
    const cell = available[chosenIndex];
    occupied.add(`${cell.x},${cell.y}`);
    const kind = chooseEnemyKind(level, index);
    const isBoss = kind === 'boss';
    enemies.push({
      ...cell,
      id: `enemy-${level}-${index}`,
      kind,
      direction: 'right',
      speed: config.enemySpeed,
      hp: isBoss ? 5 : 1,
      maxHp: isBoss ? 5 : 1,
      phase: isBoss ? 'charge' : undefined,
    });
  }

  // Guarantee a walkable route to the exit that does not pass through any enemy's starting tile.
  while (enemies.length > 0 && findPathAvoidingCells(
    maze,
    player,
    goal,
    new Set(enemies.map((enemy) => `${enemy.x},${enemy.y}`))
  ).length === 0) {
    const removed = enemies.pop();
    if (removed) occupied.delete(`${removed.x},${removed.y}`);
  }

  const pickupCells = cells.filter((cell) =>
    !occupied.has(`${cell.x},${cell.y}`) &&
    Math.abs(cell.x - player.x) + Math.abs(cell.y - player.y) >= 3 &&
    Math.abs(cell.x - goal.x) + Math.abs(cell.y - goal.y) >= 2
  );
  const gems = pickupCells.filter((_, index) => index % Math.max(2, Math.floor(pickupCells.length / 5)) === 0).slice(0, Math.min(5, 2 + Math.floor(level / 5)));
  const gemKeys = new Set(gems.map((cell) => `${cell.x},${cell.y}`));
  const shieldCell = pickupCells.find((cell) => !gemKeys.has(`${cell.x},${cell.y}`)) ?? null;

  return {
    maze,
    player,
    goal,
    enemies,
    gems,
    shieldPickup: shieldCell,
    hint: findPathAvoidingCells(maze, player, goal, new Set(enemies.map((enemy) => `${enemy.x},${enemy.y}`))),
    config,
  };
}

export function advanceEnemies(
  maze: number[][],
  enemies: Enemy[],
  player: Point,
  level: number,
  turn: number,
  limit = 1
): Enemy[] {
  return enemies.map((enemy, index) => {
    const baseSeed = turn + level * 13 + index * 37;
    const rng = seededRandom(baseSeed);
    const walkable = getWalkableNeighbors(maze, enemy);

    if (!walkable.length) {
      return enemy;
    }

    if (enemy.kind === 'boss') {
      const phase = getBossPhase(turn, index);
      const base: Enemy = {
        ...enemy,
        phase,
      };

      if (phase === 'charge') {
        const step = getNearestStepToward(maze, enemy, player, 2) ?? {
          x: enemy.x,
          y: enemy.y,
          direction: enemy.direction,
        };
        return {
          ...base,
          x: step.x,
          y: step.y,
          direction: step.direction,
        };
      }

      if (phase === 'pulse') {
        const candidate = walkable[Math.floor(rng * walkable.length)];
        return {
          ...base,
          x: enemy.x + (candidate?.x ?? 0),
          y: enemy.y + (candidate?.y ?? 0),
          direction: candidate?.direction ?? enemy.direction,
        };
      }

      if (phase === 'dash') {
        const step = getNearestStepToward(maze, enemy, player, 3) ?? {
          x: enemy.x,
          y: enemy.y,
          direction: enemy.direction,
        };
        return {
          ...base,
          x: step.x,
          y: step.y,
          direction: step.direction,
        };
      }

      const candidates = [] as Point[];
      for (let y = 1; y < maze.length - 1; y += 1) {
        for (let x = 1; x < maze.length - 1; x += 1) {
          if (maze[y][x] === 0 && !(x === 1 && y === 1) && (Math.abs(x - player.x) + Math.abs(y - player.y) > 2)) {
            candidates.push({ x, y });
          }
        }
      }
      const target = candidates[Math.floor(rng * candidates.length)] ?? { x: enemy.x, y: enemy.y };
      return {
        ...base,
        x: target.x,
        y: target.y,
        direction: getDirectionFromDelta(target.x - enemy.x, target.y - enemy.y),
      };
    }

    if (enemy.kind === 'phantom') {
      if (turn % 3 !== index % 3) {
        return enemy;
      }

      const candidates = [] as Point[];
      for (let y = 1; y < maze.length - 1; y += 1) {
        for (let x = 1; x < maze.length - 1; x += 1) {
          if (maze[y][x] === 0 && !(x === 1 && y === 1)) {
            candidates.push({ x, y });
          }
        }
      }

      const target = candidates[Math.floor(rng * candidates.length)] ?? { x: enemy.x, y: enemy.y };
      return {
        ...enemy,
        x: target.x,
        y: target.y,
        direction: getDirectionFromDelta(target.x - enemy.x, target.y - enemy.y),
      };
    }

    if (enemy.kind === 'hunter') {
      const step = getNearestStepToward(maze, enemy, player, limit);
      if (!step) {
        return enemy;
      }
      return {
        ...enemy,
        x: step.x,
        y: step.y,
        direction: step.direction,
      };
    }

    if (enemy.kind === 'spinner') {
      const cycle = ['right', 'down', 'left', 'up'] as const;
      const currentIndex = cycle.indexOf(enemy.direction);
      const nextIndex = (currentIndex + 1 + Math.floor(rng * 2)) % cycle.length;
      const chosen = cycle[nextIndex];
      const match = DIRECTIONS.find((dir) => dir.direction === chosen);
      if (!match) {
        return enemy;
      }

      const nx = enemy.x + match.x;
      const ny = enemy.y + match.y;
      if (!isWalkable(maze, nx, ny)) {
        return enemy;
      }

      return {
        ...enemy,
        x: nx,
        y: ny,
        direction: chosen,
      };
    }

    const nextMove = walkable[Math.floor(rng * walkable.length)];
    if (!nextMove) {
      return enemy;
    }

    return {
      ...enemy,
      x: enemy.x + nextMove.x,
      y: enemy.y + nextMove.y,
      direction: nextMove.direction,
    };
  });
}
