import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

import { LevelSelector } from './components/LevelSelector';
import { MazeBoard } from './components/MazeBoard';
import { ResultScreen } from './components/ResultScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { StartScreen } from './components/StartScreen';
import {
  LEVEL_THEMES,
  TOTAL_LEVELS,
  advanceEnemies,
  buildLevel,
  isWalkable,
} from './components/maze-utils';
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
  const isMounted = useRef(true);

  const theme = useMemo(
    () => LEVEL_THEMES.find((entry) => entry.id === themeId) ?? LEVEL_THEMES[0],
    [themeId]
  );

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const load = async () => {
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
        };

        if (isMounted.current) {
          setProgress(merged);
          setThemeId(merged.themeId || DEFAULT_PROGRESS.themeId);
          setCurrentLevel(Math.min(Math.max(1, currentLevel), TOTAL_LEVELS));
        }
      } catch {
        // Ignore parse errors and continue with defaults.
      } finally {
        if (isMounted.current) {
          setHasLoaded(true);
        }
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...progress, themeId })).catch(() => undefined);
  }, [hasLoaded, progress, themeId]);

  const startLevel = (level: number, autoStart = true) => {
    const safeLevel = Math.min(Math.max(1, level), TOTAL_LEVELS);
    const levelData = buildLevel(safeLevel);
    setCurrentLevel(safeLevel);
    setMaze(levelData.maze);
    setPlayer(levelData.player);
    setGoal(levelData.goal);
    setHint(levelData.hint);
    setEnemies(levelData.enemies);
    setMoves(0);
    setSeconds(0);
    setResult(null);
    setScreen(autoStart ? 'playing' : 'start');
  };

  useEffect(() => {
    if (screen !== 'playing') {
      return;
    }

    const tick = setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);

    return () => clearInterval(tick);
  }, [screen]);

  useEffect(() => {
    if (screen !== 'playing') {
      return;
    }

    const enemyTick = setInterval(() => {
      setEnemies((prev) => advanceEnemies(maze, prev, currentLevel + moves + prev.length));
    }, 1200);

    return () => clearInterval(enemyTick);
  }, [screen, maze, currentLevel, moves]);

  useEffect(() => {
    if (screen !== 'playing') {
      return;
    }

    const collided = enemies.some((enemy) => enemy.x === player.x && enemy.y === player.y);
    if (collided) {
      finishRound('lost');
    }
  }, [enemies, player, screen]);

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
      }, 700);
    } catch {
      // Failed to play; ignore silently.
    }
  };

  const triggerHaptics = async (style: 'light' | 'medium' | 'heavy') => {
    if (!progress.vibrationEnabled) {
      return;
    }

    try {
      if (style === 'light') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (style === 'medium') {
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

      setProgress((previous) => {
        const nextUnlocked = Math.min(TOTAL_LEVELS, Math.max(previous.unlocked, currentLevel + 1));
        const existingBest = previous.bestTimes[String(currentLevel)];
        const nextBest = existingBest === undefined ? seconds : Math.min(existingBest, seconds);

        return {
          ...previous,
          unlocked: nextUnlocked,
          bestTimes: {
            ...previous.bestTimes,
            [String(currentLevel)]: nextBest,
          },
        };
      });
      return;
    }

    void playSound('lose');
    void triggerHaptics('medium');
  };

  const movePlayer = (dx: number, dy: number) => {
    if (screen !== 'playing') {
      return;
    }

    const nextX = player.x + dx;
    const nextY = player.y + dy;

    if (!isWalkable(maze, nextX, nextY)) {
      return;
    }

    const nextPlayer = { x: nextX, y: nextY };
    const touchedEnemy = enemies.some((enemy) => enemy.x === nextX && enemy.y === nextY);

    setPlayer(nextPlayer);
    setMoves((previous) => previous + 1);
    void triggerHaptics('light');
    void playSound('move');

    if (nextX === goal.x && nextY === goal.y) {
      finishRound('won');
      return;
    }

    if (touchedEnemy) {
      finishRound('lost');
    }
  };

  const themeBackground = theme.bg;

  if (screen === 'settings') {
    return (
      <SettingsScreen
        theme={theme}
        soundEnabled={progress.soundEnabled}
        vibrationEnabled={progress.vibrationEnabled}
        availableThemes={LEVEL_THEMES}
        activeThemeId={themeId}
        onToggleSound={() => setProgress((previous) => ({ ...previous, soundEnabled: !previous.soundEnabled }))}
        onToggleVibration={() => setProgress((previous) => ({ ...previous, vibrationEnabled: !previous.vibrationEnabled }))}
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
        onReplay={() => startLevel(currentLevel, true)}
        onNext={() => {
          const nextLevel = Math.min(TOTAL_LEVELS, currentLevel + 1);
          if (nextLevel === currentLevel) {
            setScreen('start');
            return;
          }
          startLevel(nextLevel, true);
        }}
        onHome={() => setScreen('start')}
      />
    );
  }

  if (screen === 'start') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeBackground }]}> 
        <StartScreen
          theme={theme}
          unlocked={progress.unlocked}
          currentLevel={currentLevel}
          onStart={() => startLevel(currentLevel, true)}
          onSettings={() => setScreen('settings')}
          onSelectLevel={(level) => {
            setCurrentLevel(level);
            if (level <= progress.unlocked) {
              startLevel(level, false);
            }
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeBackground }]}> 
      <View style={[styles.playArea, { backgroundColor: theme.bg }]}> 
        <View style={[styles.topBar, { backgroundColor: theme.panel }]}>
          <Text style={[styles.topBarTitle, { color: theme.fg }]}>المستوى {currentLevel}</Text>
          <Text style={[styles.topBarTitle, { color: theme.secondary }]}>الحركات: {moves}</Text>
          <Text style={[styles.topBarTitle, { color: theme.secondary }]}>
            {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
          </Text>
        </View>

        <MazeBoard maze={maze} player={player} goal={goal} enemies={enemies} hint={hint} theme={theme} />

        <View style={[styles.controlPanel, { backgroundColor: theme.panel }]}> 
          <View style={styles.arrowPad}>
            <Pressable onPress={() => movePlayer(0, -1)} style={[styles.arrowButton, { backgroundColor: theme.surface }]}>
              <Text style={[styles.arrowText, { color: theme.primary }]}>▲</Text>
            </Pressable>
            <View style={styles.arrowMiddleRow}>
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
            <Pressable onPress={() => startLevel(currentLevel, true)} style={[styles.actionButton, { backgroundColor: theme.surface }]}>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  playArea: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  topBar: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  controlPanel: {
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
  },
  arrowPad: {
    alignItems: 'center',
    marginBottom: 12,
  },
  arrowMiddleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  arrowButton: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 28,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '800',
  },
});

