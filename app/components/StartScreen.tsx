import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Enemy, MazeTheme, Point } from './types';

type MazeBoardProps = {
  maze: number[][];
  player: Point;
  goal: Point;
  enemies: Enemy[];
  hint: Point[];
  theme: MazeTheme;
};

export function MazeBoard({ maze, player, goal, enemies, hint, theme }: MazeBoardProps) {
  const enemySet = useMemo(() => new Set(enemies.map((enemy) => `${enemy.x},${enemy.y}`)), [enemies]);
  const hintSet = useMemo(() => new Set(hint.map((cell) => `${cell.x},${cell.y}`)), [hint]);
  const cellSize = Math.max(10, Math.min(16, 320 / maze.length));

  return (
    <View style={[styles.board, { backgroundColor: theme.panel, borderColor: theme.primary }]}>
      {maze.map((row, y) => (
        <View key={`row-${y}`} style={styles.row}>
          {row.map((cell, x) => {
            const isPlayer = player.x === x && player.y === y;
            const isGoal = goal.x === x && goal.y === y;
            const isEnemy = enemySet.has(`${x},${y}`);
            const isHint = hintSet.has(`${x},${y}`) && !isPlayer && !isGoal && !isEnemy && cell === 0;

            return (
              <View
                key={`${x}-${y}`}
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
                {isGoal && <View style={[styles.goal, { backgroundColor: theme.goal }]} />}
                {isEnemy && <View style={[styles.enemy, { backgroundColor: theme.enemy }]} />}
                {isPlayer && <View style={[styles.player, { backgroundColor: theme.player }]} />}
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
    padding: 8,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    margin: 1,
  },
  hintDot: {
    width: 5,
    height: 5,
    borderRadius: 99,
    opacity: 0.8,
  },
  goal: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  enemy: {
    width: 10,
    height: 10,
    borderRadius: 99,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  player: {
    width: 12,
    height: 12,
    borderRadius: 99,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});
