import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LevelSelector } from './components/LevelSelector';
import { MazeBoard } from './components/MazeBoard';
import { ResultScreen } from './components/ResultScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { StartScreen } from './components/StartScreen';
import { LEVEL_ENVIRONMENTS, LEVEL_THEMES, TOTAL_LEVELS, advanceEnemies, buildLevel, isWalkable } from './components/maze-utils';
import type { Enemy, Point, ProgressState, ScreenMode } from './components/types';

const STORAGE_KEY = 'maze-adventure-progress-v1';
const DEFAULT_PROGRESS: ProgressState = {
  unlocked: 1,
  bestTimes: {},
  themeId: LEVEL_THEMES[0].id,
  soundEnabled: true,
  vibrationEnabled: true,
  score: 0,
  coins: 0,
  swords: 0,
  bombs: 0,
};

export default function App() {
  const [screen, setScreen] = useState<ScreenMode>('start');
  const [shopReturnScreen, setShopReturnScreen] = useState<ScreenMode>('start');
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
  const [gems, setGems] = useState<Point[]>([]);
  const [shieldPickup, setShieldPickup] = useState<Point | null>(null);
  const [shieldCharges, setShieldCharges] = useState(0);
  const [result, setResult] = useState<'won' | 'lost' | null>(null);
  const [score, setScore] = useState(0);

  const theme = useMemo(() => {
    const selected = LEVEL_THEMES.find((entry) => entry.id === themeId) ?? LEVEL_THEMES[0];
    if (screen === 'start' || screen === 'settings' || screen === 'shop') return selected;
    const biome = LEVEL_THEMES[(currentLevel - 1) % LEVEL_THEMES.length];
    return { ...biome, id: selected.id, name: LEVEL_ENVIRONMENTS[(currentLevel - 1) % LEVEL_ENVIRONMENTS.length] };
  }, [themeId, currentLevel, screen]);

  const bossEnemy = enemies.find((enemy) => enemy.kind === 'boss') ?? null;
  const screenSlide = useRef(new Animated.Value(0)).current;
  // Keep the chase timer stable while reading the latest player position on every tick.
  // Including seconds/moves/player in the timer dependencies used to restart it before it fired.
  const playerRef = useRef(player);
  const turnRef = useRef(0);
  playerRef.current = player;
  turnRef.current = moves + seconds;

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
          coins: parsed.coins ?? 0,
          swords: parsed.swords ?? 0,
          bombs: parsed.bombs ?? 0,
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
    setGems(levelData.gems);
    setShieldPickup(levelData.shieldPickup);
    setShieldCharges(0);
    setResult(null);
    setScreen('playing');
    setScore(0);
  };

  const buyItem = (item: 'sword' | 'bomb') => {
    const cost = item === 'sword' ? 80 : 130;
    if ((progress.coins ?? 0) < cost) {
      void triggerHaptics('light');
      return;
    }
    setProgress((previous) => ({
      ...previous,
      coins: (previous.coins ?? 0) - cost,
      swords: (previous.swords ?? 0) + (item === 'sword' ? 1 : 0),
      bombs: (previous.bombs ?? 0) + (item === 'bomb' ? 1 : 0),
    }));
    void triggerHaptics('medium');
  };

  const useSword = () => {
    if (screen !== 'playing' || (progress.swords ?? 0) < 1) return;
    const targetIndex = enemies.findIndex((enemy) => Math.abs(enemy.x - player.x) + Math.abs(enemy.y - player.y) === 1);
    if (targetIndex < 0) return;
    const target = enemies[targetIndex];
    setProgress((previous) => ({ ...previous, swords: Math.max(0, (previous.swords ?? 0) - 1) }));
    if (target.kind === 'boss' && (target.hp ?? 1) > 1) {
      setEnemies((previous) => previous.map((enemy) => enemy.id === target.id ? { ...enemy, hp: (enemy.hp ?? 1) - 1 } : enemy));
      setScore((previous) => previous + 40);
    } else {
      setEnemies((previous) => previous.filter((enemy) => enemy.id !== target.id));
      setScore((previous) => previous + (target.kind === 'boss' ? 250 : 100));
    }
    void triggerHaptics('heavy');
  };

  const useBomb = () => {
    if (screen !== 'playing' || (progress.bombs ?? 0) < 1) return;
    const affected = enemies.filter((enemy) => Math.abs(enemy.x - player.x) + Math.abs(enemy.y - player.y) <= 2);
    if (!affected.length) return;
    setProgress((previous) => ({ ...previous, bombs: Math.max(0, (previous.bombs ?? 0) - 1) }));
    setEnemies((previous) => previous.flatMap((enemy) => {
      if (Math.abs(enemy.x - player.x) + Math.abs(enemy.y - player.y) > 2) return [enemy];
      if (enemy.kind === 'boss' && (enemy.hp ?? 1) > 2) return [{ ...enemy, hp: (enemy.hp ?? 1) - 2 }];
      if (enemy.kind === 'boss' && (enemy.hp ?? 1) === 2) return [{ ...enemy, hp: 1 }];
      return [];
    }));
    setScore((previous) => previous + affected.length * 80);
    void triggerHaptics('heavy');
  };

  const playSound = async (_type: 'move' | 'win' | 'lose') => {
    // Sound assets are not present in the repository; keep gameplay independent of optional audio.
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
          coins: (previous.coins ?? 0) + 20 + currentLevel * 3,
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
    const hitEnemies = enemies.filter((enemy) => enemy.x === nextX && enemy.y === nextY);

    setPlayer(nextPlayer);
    setMoves((value) => value + 1);
    setHint([]);
    void playSound('move');
    void triggerHaptics('light');

    const foundGem = gems.some((gem) => gem.x === nextX && gem.y === nextY);
    if (foundGem) {
      setGems((previous) => previous.filter((gem) => gem.x !== nextX || gem.y !== nextY));
      setScore((previous) => previous + 50);
      setProgress((previous) => ({ ...previous, coins: (previous.coins ?? 0) + 10 + Math.floor(currentLevel / 10) }));
      void triggerHaptics('medium');
    }

    if (shieldPickup && shieldPickup.x === nextX && shieldPickup.y === nextY) {
      setShieldPickup(null);
      setShieldCharges((previous) => previous + 1);
      setScore((previous) => previous + 25);
      setProgress((previous) => ({ ...previous, coins: (previous.coins ?? 0) + 5 }));
      void triggerHaptics('medium');
    }

    if (nextX === goal.x && nextY === goal.y) {
      finishRound('won');
      return;
    }

    if (hitEnemies.length > 0) {
      if (shieldCharges > 0) {
        setShieldCharges((previous) => Math.max(0, previous - 1));
        setEnemies((previous) => previous.filter((enemy) => enemy.x !== nextX || enemy.y !== nextY));
        setScore((previous) => previous + 100);
        return;
      }
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

    // Monsters keep moving even when the player pauses; hunters track the latest position
    // and navigate through walkable corridors instead of getting stuck behind stale closures.
    const timer = setInterval(() => {
      const target = playerRef.current;
      const turn = turnRef.current;
      setEnemies((previous) => advanceEnemies(
        maze,
        previous,
        target,
        currentLevel,
        turn + previous.length,
      ));
    }, Math.max(700, 1450 - currentLevel * 28));

    return () => clearInterval(timer);
  }, [screen, maze, currentLevel]);

  useEffect(() => {
    if (screen !== 'playing') {
      return;
    }

    const collided = enemies.some((enemy) => enemy.x === player.x && enemy.y === player.y);
    if (!collided) return;
    if (shieldCharges > 0) {
      setShieldCharges((previous) => Math.max(0, previous - 1));
      setEnemies((previous) => previous.filter((enemy) => enemy.x !== player.x || enemy.y !== player.y));
      setScore((previous) => previous + 100);
      void triggerHaptics('heavy');
      return;
    }
    finishRound('lost');
  }, [screen, enemies, player, shieldCharges]);

  if (screen === 'shop') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
        <View style={[styles.playArea, { justifyContent: 'center' }]}>
          <View style={[styles.controls, { backgroundColor: theme.panel, padding: 22 }]}>
            <Text style={[styles.bossText, { color: theme.fg, fontSize: 26, textAlign: 'center' }]}>🛒 متجر أدوات الصياد</Text>
            <Text style={[styles.topBarText, { color: theme.accent, textAlign: 'center', marginVertical: 12 }]}>رصيدك: 🪙 {progress.coins ?? 0}</Text>
            <Text style={[styles.legendText, { color: theme.secondary, textAlign: 'center', marginBottom: 12 }]}>السيف يضرب وحشًا مجاورًا. القنبلة تصيب الوحوش القريبة ضمن خطوتين.</Text>
            <Pressable onPress={() => buyItem('sword')} style={[styles.shopItem, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
              <Text style={[styles.actionText, { color: theme.fg }]}>⚔️ سيف سحري — 80 عملة</Text>
              <Text style={[styles.legendText, { color: theme.secondary }]}>المخزون: {progress.swords ?? 0}</Text>
            </Pressable>
            <Pressable onPress={() => buyItem('bomb')} style={[styles.shopItem, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
              <Text style={[styles.actionText, { color: theme.fg }]}>💣 قنبلة صاعقة — 130 عملة</Text>
              <Text style={[styles.legendText, { color: theme.secondary }]}>المخزون: {progress.bombs ?? 0}</Text>
            </Pressable>
            <Pressable onPress={() => setScreen(shopReturnScreen)} style={[styles.actionButton, { backgroundColor: theme.primary, marginTop: 12 }]}>
              <Text style={[styles.actionText, { color: '#0d1426' }]}>العودة إلى اللعبة</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
        score={score}
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
            onShop={() => { setShopReturnScreen('start'); setScreen('shop'); }}
            coins={progress.coins ?? 0}
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
          <Text style={[styles.topBarText, { color: theme.fg }]}>{currentLevel}/100 · {LEVEL_ENVIRONMENTS[(currentLevel - 1) % LEVEL_ENVIRONMENTS.length]}</Text>
          <Text style={[styles.topBarText, { color: theme.secondary }]}>الحركات: {moves}</Text>
          <Text style={[styles.topBarText, { color: theme.secondary }]}>
            {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
          </Text>
          <Text style={[styles.topBarText, { color: theme.accent }]}>🪙 {progress.coins ?? 0} · {score}</Text>
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

        <View style={[styles.legend, { backgroundColor: theme.panel }]}>
          <Text style={[styles.legendText, { color: theme.fg }]}>💎 +50</Text>
          <Text style={[styles.legendText, { color: theme.fg }]}>🛡️ حماية: {shieldCharges}</Text>
          <Text style={[styles.legendText, { color: theme.secondary }]}>اعثر على طريق بديل!</Text>
        </View>
        <MazeBoard maze={maze} player={player} goal={goal} enemies={enemies} hint={hint} theme={theme} gems={gems} shieldPickup={shieldPickup} />

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
            <Pressable onPress={useSword} style={[styles.actionButton, { backgroundColor: theme.surface }]}>
              <Text style={[styles.actionText, { color: theme.fg }]}>⚔️ {progress.swords ?? 0}</Text>
            </Pressable>
            <Pressable onPress={useBomb} style={[styles.actionButton, { backgroundColor: theme.surface }]}>
              <Text style={[styles.actionText, { color: theme.fg }]}>💣 {progress.bombs ?? 0}</Text>
            </Pressable>
            <Pressable onPress={() => { setShopReturnScreen('playing'); setScreen('shop'); }} style={[styles.actionButton, { backgroundColor: theme.surface }]}>
              <Text style={[styles.actionText, { color: theme.fg }]}>المتجر</Text>
            </Pressable>
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginBottom: 8,
    borderRadius: 12,
  },
  legendText: { fontSize: 11, fontWeight: '800' },
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
  shopItem: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12, alignItems: 'center', gap: 6 },
  actionText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
