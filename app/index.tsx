import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import type { Enemy, MazeTheme, Point } from './types';

type MazeBoardProps = {
  maze: number[][];
  player: Point;
  goal: Point;
  enemies: Enemy[];
  hint: Point[];
  theme: MazeTheme;
};

function GoalBeacon({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.5, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    return () => pulse.stopAnimation();
  }, [pulse]);

  return <Animated.View style={[styles.goal, { backgroundColor: color, transform: [{ scale: pulse }] }]} />;
}

function PlayerMarker({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.25, duration: 350, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 350, useNativeDriver: true }),
      ])
    ).start();

    return () => pulse.stopAnimation();
  }, [pulse]);

  return <Animated.View style={[styles.player, { backgroundColor: color, transform: [{ scale: pulse }] }]} />;
}

function EnemyMarker({ enemy, theme }: { enemy: Enemy; theme: MazeTheme }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.2, duration: 250, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 250, useNativeDriver: true }),
      ])
    ).start();

    return () => pulse.stopAnimation();
  }, [pulse]);

  const colorMap: Record<Enemy['kind'], string> = {
    walker: theme.enemy,
    hunter: '#fb7185',
    spinner: '#fbbf24',
    phantom: '#a78bfa',
    boss: '#f43f5e',
  };

  return (
    <Animated.View
      style={[
        styles.enemy,
        {
          backgroundColor: colorMap[enemy.kind],
          transform: [{ scale: pulse }],
          borderColor: '#ffffff',
        },
      ]}
    />
  );
}

export function MazeBoard({ maze, player, goal, enemies, hint, theme }: MazeBoardProps) {
  const enemySet = useMemo(() => new Set(enemies.map((enemy) => `${enemy.x},${enemy.y}`)), [enemies]);
  const hintSet = useMemo(() => new Set(hint.map((cell) => `${cell.x},${cell.y}`)), [hint]);
  const cellSize = Math.max(10, Math.min(16, 320 / maze.length));
  const bossEnemy = enemies.find((enemy) => enemy.kind === 'boss') ?? null;

  const boardScale = useRef(new Animated.Value(0.96)).current;
  const boardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(boardScale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
      Animated.timing(boardOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [boardOpacity, boardScale]);

  const bossHpPercent = bossEnemy && bossEnemy.maxHp ? (bossEnemy.hp ?? bossEnemy.maxHp) / bossEnemy.maxHp : 0;

  return (
    <View>
      {bossEnemy ? (
        <View style={[styles.bossHud, { backgroundColor: theme.panel, borderColor: theme.primary }]}>
          <View style={styles.bossHeaderRow}>
            <Text style={[styles.bossLabel, { color: theme.fg }]}>Boss</Text>
            <Text style={[styles.bossPhase, { color: theme.accent }]}>{bossEnemy.phase ?? 'charge'}</Text>
          </View>
          <View style={[styles.bossBar, { backgroundColor: theme.surface }]}>
            <View style={[styles.bossBarFill, { width: `${Math.max(0, bossHpPercent * 100)}%`, backgroundColor: '#ef4444' }]} />
          </View>
        </View>
      ) : null}

      <Animated.View
        style={[
          styles.board,
          {
            backgroundColor: theme.panel,
            borderColor: theme.primary,
            opacity: boardOpacity,
            transform: [{ scale: boardScale }],
          },
        ]}
      >
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
                  {isGoal && <GoalBeacon color={theme.goal} />}
                  {isEnemy && <EnemyMarker enemy={enemies.find((entry) => entry.x === x && entry.y === y)!} theme={theme} />}
                  {isPlayer && <PlayerMarker color={theme.player} />}
                </View>
              );
            })}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bossHud: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  bossHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  bossLabel: {
    fontWeight: '800',
    fontSize: 12,
  },
  bossPhase: {
    fontWeight: '800',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  bossBar: {
    height: 10,
    borderRadius: 99,
    overflow: 'hidden',
  },
  bossBarFill: {
    height: '100%',
    borderRadius: 99,
  },
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
  },
  player: {
    width: 12,
    height: 12,
    borderRadius: 99,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});
