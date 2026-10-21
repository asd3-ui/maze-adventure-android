import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LevelSelector } from './components/LevelSelector';
import { MazeBoard } from './components/MazeBoard';
import { ResultScreen } from './components/ResultScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { StartScreen } from './components/StartScreen';
import { LEVEL_THEMES, TOTAL_LEVELS, advanceEnemies, buildLevel, isWalkable } from './components/maze-utils';
import type { Enemy, Point, ProgressState, ScreenMode } from './components/types';

const STORAGE_KEY = 'maze-adventure-progress-v1';
const SOUND_LIBRARY = {
  move: require('../assets/audio/move.wav'),
  win: require('../assets/audio/win.wav'),
  lose: require('../assets/audio/lose.wav'),
} as const;

const DEFAULT_PROGRESS: ProgressState = {
  unlocked: 1,
  bestTimes: {},
  themeId: LEVEL_THEMES[0].id,
  soundEnabled: true,
  vibrationEnabled: true,
  score: 0,
};

export default function App() {
  const [screen, setScreen] = useState<ScreenMode>('start');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [themeId, setThemeId] = useState(DEFAULT_PROGRESS.themeId);
  const [progress, setProgress] = useState<ProgressState>(DEFAULT_PROGRESS);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [maze, setMaze] = useState<number[][]>([]);
  const [player, setPlayer] = useState<Point>({ x: 1, y: 1 });
  const [goal, setGoal] = useState<Point>({ x: 1, y: 1 });
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [hint, setHint] = useState<Point[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [result, setResult] = useState<'won' | 'lost' | null>(null);
  const [score, setScore] = useState(0);

  const theme = useMemo(
    () => LEVEL_THEMES.find((entry) => entry.id === themeId) ?? LEVEL_THEMES[0],
    [themeId]
  );

  const bossEnemy = enemies.find((enemy) => enemy.kind === 'boss') ?? null;
  const screenSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(screenSlide, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [screen, screenSlide]);

  useEffect(() => {
    const loadSavedProgress = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setHasLoaded(true);
          return;
        }

        const parsed = JSON.parse(raw) as Partial<ProgressState>;
        const merged: ProgressState = {
          ...DEFAULT_PROGRESS,
          ...parsed,
          bestTimes: parsed.bestTimes ?? {},
          score: parsed.score ?? 0,
        };

        setProgress(merged);
        setThemeId(merged.themeId || DEFAULT_PROGRESS.themeId);
      } catch {
        // Ignore load errors and continue with defaults.
      } finally {
        setHasLoaded(true);
      }
    };

    loadSavedProgress();
  }, []);

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...progress, themeId })).catch(() => undefined);
  }, [hasLoaded, progress, themeId]);

  const startLevel = (level: number) => {
    const safeLevel = Math.max(1, Math.min(level, TOTAL_LEVELS));
    const levelData = buildLevel(safeLevel);
    setCurrentLevel(safeLevel);
    setMaze(levelData.maze);
    setPlayer(levelData.player);
    setGoal(levelData.goal);
    setMoves(0);
    setSeconds(0);
    setHint(levelData.hint);
    setEnemies(levelData.enemies);
    setResult(null);
    setScreen('playing');
    setScore(0);
  };

  const playSound = async (type: keyof typeof SOUND_LIBRARY) => {
    if (!progress.soundEnabled) {
      return;
    }

    try {
      const sound = new Audio.Sound();
      await sound.loadAsync(SOUND_LIBRARY[type]);
      await sound.playAsync();
      setTimeout(() => {
        sound.unloadAsync().catch(() => undefined);
      }, 800);
    } catch {
      // Ignore audio failures; app remains playable.
    }
  };

  const triggerHaptics = async (mode: 'light' | 'medium' | 'heavy') => {
    if (!progress.vibrationEnabled) {
      return;
    }

    try {
      if (mode === 'light') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (mode === 'medium') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    } catch {
      // Ignore haptic failures.
    }
  };

  const finishRound = (outcome: 'won' | 'lost') => {
    setResult(outcome);
    setScreen(outcome);

    if (outcome === 'won') {
      void playSound('win');
      void triggerHaptics('heavy');

      const earned = Math.max(150, Math.round((1000 - seconds * 12 - moves * 8 + currentLevel * 180) * 1.4));
      setScore((previous) => previous + earned);
      setProgress((previous) => {
        const updatedUnlocked = Math.min(TOTAL_LEVELS, Math.max(previous.unlocked, currentLevel + 1));
        const existingBest = previous.bestTimes[String(currentLevel)];
        const nextBest = existingBest === undefined ? seconds : Math.min(existingBest, seconds);

        return {
          ...previous,
          unlocked: updatedUnlocked,
          bestTimes: {
            ...previous.bestTimes,
            [String(currentLevel)]: nextBest,
          },
          score: previous.score + earned,
        };
      });
      return;
    }

    void playSound('lose');
    void triggerHaptics('medium');
  };

  const movePlayer = (dx: number, dy: number) => {
    if (screen !== 'playing' || !maze.length) {
      return;
    }

    const nextX = player.x + dx;
    const nextY = player.y + dy;

    if (!isWalkable(maze, nextX, nextY)) {
      return;
    }

    const nextPlayer = { x: nextX, y: nextY };
    const hitEnemy = enemies.some((enemy) => enemy.x === nextX && enemy.y === nextY);

    setPlayer(nextPlayer);
    setMoves((value) => value + 1);
    setHint([]);
    void playSound('move');
    void triggerHaptics('light');

    if (nextX === goal.x && nextY === goal.y) {
      finishRound('won');
      return;
    }

    if (hitEnemy) {
      finishRound('lost');
    }
  };

  useEffect(() => {
    if (screen !== 'playing') {
      return;
    }

    const timer = setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [screen]);

  useEffect(() => {
    if (screen !== 'playing' || maze.length === 0) {
      return;
    }

    const timer = setInterval(() => {
      setEnemies((previous) => advanceEnemies(maze, previous, player, currentLevel, moves + seconds + previous.length));
    }, 950);

    return () => clearInterval(timer);
  }, [screen, maze, player, currentLevel, moves, seconds]);

  useEffect(() => {
    if (screen !== 'playing') {
      return;
    }

    const collided = enemies.some((enemy) => enemy.x === player.x && enemy.y === player.y);
    if (collided) {
      finishRound('lost');
    }
  }, [screen, enemies, player]);

  if (screen === 'settings') {
    return (
      <SettingsScreen
        theme={theme}
        soundEnabled={progress.soundEnabled}
        vibrationEnabled={progress.vibrationEnabled}
        availableThemes={LEVEL_THEMES}
        activeThemeId={themeId}
        onToggleSound={() => {
          setProgress((previous) => ({ ...previous, soundEnabled: !previous.soundEnabled }));
        }}
        onToggleVibration={() => {
          setProgress((previous) => ({ ...previous, vibrationEnabled: !previous.vibrationEnabled }));
        }}
        onSelectTheme={(value) => {
          setThemeId(value);
          setProgress((previous) => ({ ...previous, themeId: value }));
        }}
        onBack={() => setScreen('start')}
      />
    );
  }

  if (screen === 'won' || screen === 'lost') {
    return (
      <ResultScreen
        theme={theme}
        result={result ?? 'won'}
        currentLevel={currentLevel}
        totalLevels={TOTAL_LEVELS}
        moves={moves}
        seconds={seconds}
        onReplay={() => startLevel(currentLevel)}
        onNext={() => {
          const nextLevel = Math.min(TOTAL_LEVELS, currentLevel + 1);
          startLevel(nextLevel);
        }}
        onHome={() => setScreen('start')}
      />
    );
  }

  if (screen === 'start') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
        <Animated.View
          style={[
            styles.startScreen,
            {
              opacity: screenSlide,
              transform: [{ translateY: screenSlide.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            },
          ]}
        >
          <StartScreen
            theme={theme}
            unlocked={progress.unlocked}
            currentLevel={currentLevel}
            onStart={() => startLevel(currentLevel)}
            onSettings={() => setScreen('settings')}
            onSelectLevel={(level) => {
              if (level <= progress.unlocked) {
                setCurrentLevel(level);
                startLevel(level);
              }
            }}
          />
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <Animated.View
        style={[
          styles.playArea,
          {
            opacity: screenSlide,
            transform: [{ translateY: screenSlide.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          },
        ]}
      >
        <View style={[styles.topBar, { backgroundColor: theme.panel }]}>
          <Text style={[styles.topBarText, { color: theme.fg }]}>المستوى {currentLevel}</Text>
          <Text style={[styles.topBarText, { color: theme.secondary }]}>الحركات: {moves}</Text>
          <Text style={[styles.topBarText, { color: theme.secondary }]}>
            {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
          </Text>
          <Text style={[styles.topBarText, { color: theme.accent }]}>Score {score}</Text>
        </View>

        {bossEnemy ? (
          <View style={[styles.bossStatus, { backgroundColor: theme.panel, borderColor: theme.primary }]}>
            <Text style={[styles.bossText, { color: theme.fg }]}>Boss</Text>
            <Text style={[styles.bossPhase, { color: theme.accent }]}>{bossEnemy.phase ?? 'charge'}</Text>
            <View style={[styles.bossBar, { backgroundColor: theme.surface }]}>
              <View
                style={[
                  styles.bossBarFill,
                  {
                    width: `${((bossEnemy.hp ?? bossEnemy.maxHp ?? 1) / (bossEnemy.maxHp ?? 1)) * 100}%`,
                    backgroundColor: '#ef4444',
                  },
                ]}
              />
            </View>
          </View>
        ) : null}

        <MazeBoard maze={maze} player={player} goal={goal} enemies={enemies} hint={hint} theme={theme} />

        <View style={[styles.controls, { backgroundColor: theme.panel }]}>
          <View style={styles.arrowPad}>
            <Pressable onPress={() => movePlayer(0, -1)} style={[styles.arrowButton, { backgroundColor: theme.surface }]}>
              <Text style={[styles.arrowText, { color: theme.primary }]}>▲</Text>
            </Pressable>
            <View style={styles.middleRow}>
              <Pressable onPress={() => movePlayer(-1, 0)} style={[styles.arrowButton, { backgroundColor: theme.surface }]}>
                <Text style={[styles.arrowText, { color: theme.primary }]}>◀</Text>
              </Pressable>
              <Pressable onPress={() => movePlayer(0, 1)} style={[styles.arrowButton, { backgroundColor: theme.surface }]}>
                <Text style={[styles.arrowText, { color: theme.primary }]}>▼</Text>
              </Pressable>
              <Pressable onPress={() => movePlayer(1, 0)} style={[styles.arrowButton, { backgroundColor: theme.surface }]}>
                <Text style={[styles.arrowText, { color: theme.primary }]}>▶</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable onPress={() => startLevel(currentLevel)} style={[styles.actionButton, { backgroundColor: theme.surface }]}>
              <Text style={[styles.actionText, { color: theme.fg }]}>إعادة</Text>
            </Pressable>
            <Pressable onPress={() => setScreen('start')} style={[styles.actionButton, { backgroundColor: theme.surface }]}>
              <Text style={[styles.actionText, { color: theme.fg }]}>الرئيسية</Text>
            </Pressable>
            <Pressable onPress={() => setScreen('settings')} style={[styles.actionButton, { backgroundColor: theme.surface }]}>
              <Text style={[styles.actionText, { color: theme.fg }]}>الإعدادات</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  startScreen: {
    flex: 1,
  },
  playArea: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  topBar: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  topBarText: {
    fontSize: 13,
    fontWeight: '800',
  },
  bossStatus: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  bossText: {
    fontSize: 12,
    fontWeight: '800',
  },
  bossPhase: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  bossBar: {
    height: 10,
    marginTop: 8,
    borderRadius: 99,
    overflow: 'hidden',
  },
  bossBarFill: {
    height: '100%',
    borderRadius: 99,
  },
  controls: {
    borderRadius: 18,
    marginTop: 16,
    padding: 16,
  },
  arrowPad: {
    alignItems: 'center',
  },
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  arrowButton: {
    width: 58,
    height: 58,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  arrowText: {
    fontSize: 26,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
