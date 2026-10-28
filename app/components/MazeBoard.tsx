import React, { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

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
  maxHeight?: number;
};

export function MazeBoard({ maze, player, goal, enemies, hint, theme, gems = [], shieldPickup = null, maxHeight }: MazeBoardProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const enemySet = useMemo(() => new Set(enemies.map((enemy) => `${enemy.x},${enemy.y}`)), [enemies]);
  const hintSet = useMemo(() => new Set(hint.map((cell) => `${cell.x},${cell.y}`)), [hint]);
  const gemSet = useMemo(() => new Set(gems.map((cell) => `${cell.x},${cell.y}`)), [gems]);
  const columns = maze[0]?.length ?? 0;
  const rows = maze.length;
  const availableWidth = Math.max(100, windowWidth - 16);
  const availableHeight = Math.max(100, Math.min(maxHeight ?? windowHeight - 300, windowHeight - 120));
  // Fit the entire maze in the central play area. Larger levels use smaller cells
  // instead of overflowing under the permanently bottom-anchored controls.
  const cellSize = Math.max(7, Math.min(36, (availableWidth - 16) / Math.max(1, columns), (availableHeight - 16) / Math.max(1, rows)));

  return (
    <View style={[styles.board, { backgroundColor: theme.panel, borderColor: theme.primary, maxWidth: availableWidth, maxHeight: availableHeight }]}> 
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
                {isGoal && <View style={[styles.goalGate, { borderColor: theme.accent, backgroundColor: theme.goal }]}><Text style={[styles.goalMarker, { fontSize: Math.max(13, cellSize * 0.95) }]}>🌀</Text></View>}
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
  goalGate: { width: '100%', height: '100%', borderWidth: 2, borderRadius: 6, alignItems: 'center', justifyContent: 'center', shadowColor: '#facc15', shadowOpacity: 0.95, shadowRadius: 8, elevation: 8 },
  goalMarker: { textAlign: 'center', textAlignVertical: 'center' },
});
