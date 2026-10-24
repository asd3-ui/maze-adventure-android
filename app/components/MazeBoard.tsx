import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

import type { Enemy, MazeTheme, Point } from './types';

type MazeBoardProps = {
  maze: number[][];
  player: Point;
  goal: Point;
  enemies: Enemy[];
  hint: Point[];
  theme: MazeTheme;
  gems?: Point[];
  shieldPickup?: Point | null;
};

export function MazeBoard({ maze, player, goal, enemies, hint, theme, gems = [], shieldPickup = null }: MazeBoardProps) {
  const enemySet = useMemo(() => new Set(enemies.map((enemy) => `${enemy.x},${enemy.y}`)), [enemies]);
  const hintSet = useMemo(() => new Set(hint.map((cell) => `${cell.x},${cell.y}`)), [hint]);
  const gemSet = useMemo(() => new Set(gems.map((cell) => `${cell.x},${cell.y}`)), [gems]);
  const boardWidth = Math.max(maze[0]?.length ?? 0, maze.length);
  const availableWidth = Dimensions.get('window').width - 16;
  const cellSize = Math.max(16, Math.min(32, (availableWidth - 12) / boardWidth));

  return (
    <View style={[styles.board, { backgroundColor: theme.panel, borderColor: theme.primary, maxWidth: availableWidth }]}> 
      {maze.map((row, y) => (
        <View key={`row-${y}`} style={styles.row}>
          {row.map((cell, x) => {
            const key = `${x},${y}`;
            const isPlayer = player.x === x && player.y === y;
            const isGoal = goal.x === x && goal.y === y;
            const isEnemy = enemySet.has(key);
            const isHint = hintSet.has(key) && !isPlayer && !isGoal && !isEnemy && cell === 0;
            const isGem = gemSet.has(key) && !isPlayer && !isEnemy;
            const isShield = shieldPickup?.x === x && shieldPickup?.y === y && !isPlayer && !isEnemy;

            return (
              <View
                key={key}
                style={[
                  styles.cell,
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: cell === 1 ? theme.wall : theme.floor,
                    borderColor: theme.secondary,
                  },
                ]}
              >
                {isHint && <View style={[styles.hintDot, { backgroundColor: theme.accent }]} />}
                {isGem && <Text style={[styles.pickup, { fontSize: Math.max(8, cellSize * 0.75) }]}>💎</Text>}
                {isShield && <Text style={[styles.pickup, { fontSize: Math.max(8, cellSize * 0.75) }]}>🛡️</Text>}
                {isGoal && <Text style={[styles.marker, { fontSize: Math.max(9, cellSize * 0.8) }]}>🚪</Text>}
                {isEnemy && <Text style={[styles.marker, { fontSize: Math.max(9, cellSize * 0.8) }]}>{enemies.find((enemy) => enemy.x === x && enemy.y === y)?.kind === 'boss' ? '👹' : '👾'}</Text>}
                {isPlayer && <Text style={[styles.marker, { fontSize: Math.max(9, cellSize * 0.8) }]}>🧙</Text>}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    borderRadius: 18,
    borderWidth: 2,
    padding: 4,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  row: { flexDirection: 'row', direction: 'ltr' },
  cell: {
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    margin: 0,
  },
  hintDot: { width: 5, height: 5, borderRadius: 99, opacity: 0.8 },
  pickup: { textAlign: 'center' },
  marker: { textAlign: 'center', lineHeight: 15 },
});
