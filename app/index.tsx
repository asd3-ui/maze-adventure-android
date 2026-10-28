import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
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

const BIOME_PALETTES = [
  { bg: '#10231b', panel: '#19382a', surface: '#24513b', fg: '#f0fff4', primary: '#86efac', accent: '#facc15', wall: '#315b42', floor: '#132b20', goal: '#4ade80', player: '#bbf7d0', enemy: '#fb7185', secondary: '#a7cdb3' },
  { bg: '#2a160b', panel: '#48240e', surface: '#653512', fg: '#fff7ed', primary: '#fdba74', accent: '#fbbf24', wall: '#82471d', floor: '#301a0d', goal: '#facc15', player: '#ffedd5', enemy: '#ef4444', secondary: '#e8b98e' },
  { bg: '#101f38', panel: '#1b3154', surface: '#29466f', fg: '#eff6ff', primary: '#93c5fd', accent: '#c4b5fd', wall: '#38567e', floor: '#132642', goal: '#67e8f9', player: '#dbeafe', enemy: '#fda4af', secondary: '#abc3e7' },
  { bg: '#21152f', panel: '#38234d', surface: '#4c3068', fg: '#faf5ff', primary: '#d8b4fe', accent: '#f0abfc', wall: '#62417d', floor: '#291a3b', goal: '#a7f3d0', player: '#f3e8ff', enemy: '#fb7185', secondary: '#cbb4df' },
  { bg: '#102a2d', panel: '#194247', surface: '#235960', fg: '#ecfeff', primary: '#67e8f9', accent: '#5eead4', wall: '#2c6970', floor: '#123438', goal: '#5eead4', player: '#cffafe', enemy: '#fda4af', secondary: '#9ccfd2' },
  { bg: '#321515', panel: '#501e1e', surface: '#702828', fg: '#fff1f2', primary: '#fca5a5', accent: '#fdba74', wall: '#873535', floor: '#3a1919', goal: '#fde047', player: '#ffe4e6', enemy: '#fb923c', secondary: '#e7b0a9' },
  { bg: '#20261a', panel: '#343d23', surface: '#4a5630', fg: '#f7fee7', primary: '#bef264', accent: '#facc15', wall: '#5e6a3a', floor: '#262d1c', goal: '#a3e635', player: '#ecfccb', enemy: '#f87171', secondary: '#c5d3a2' },
  { bg: '#251b12', panel: '#413021', surface: '#5a422b', fg: '#fffbeb', primary: '#fcd34d', accent: '#f9a8d4', wall: '#765536', floor: '#2f2317', goal: '#a7f3d0', player: '#fef3c7', enemy: '#f87171', secondary: '#d6bd9c' },
  { bg: '#161b35', panel: '#252d50', surface: '#333d68', fg: '#eef2ff', primary: '#a5b4fc', accent: '#67e8f9', wall: '#454f7d', floor: '#1a2140', goal: '#6ee7b7', player: '#e0e7ff', enemy: '#fda4af', secondary: '#b2bde4' },
  { bg: '#30142b', panel: '#4b1f41', surface: '#652a56', fg: '#fdf2f8', primary: '#f9a8d4', accent: '#c4b5fd', wall: '#80376c', floor: '#38182f', goal: '#86efac', player: '#fce7f3', enemy: '#fca5a5', secondary: '#dfb2d1' },
] as const;

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
  const [timeLeft, setTimeLeft] = useState(180);
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
    const palette = BIOME_PALETTES[(currentLevel - 1) % BIOME_PALETTES.length];
    return { ...biome, ...palette, id: selected.id, name: LEVEL_ENVIRONMENTS[(currentLevel - 1) % LEVEL_ENVIRONMENTS.length] };
  }, [themeId, currentLevel, screen]);

  const bossEnemy = enemies.find((enemy) => enemy.kind === 'boss') ?? null;
  const screenSlide = useRef(new Animated.Value(0)).current;
  // Keep the chase timer stable while reading the latest player position on every tick.
  // Including seconds/moves/player in the timer dependencies used to restart it before it fired.
  const playerRef = useRef(player);
  const turnRef = useRef(0);
  playerRef.current = player;
  turnRef.current = moves + seconds;

  // Android system Back navigates through the game's screens.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'start') return false;
      if (screen === 'shop') {
        setScreen(shopReturnScreen);
        return true;
      }
      setScreen('start');
      return true;
    });
    return () => subscription.remove();
  }, [screen, shopReturnScreen]);

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
    setTimeLeft(Math.max(60, 180 - Math.floor((safeLevel - 1) * 1.2)));
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
    void playSound('attack');
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
    void playSound('attack');
    void triggerHaptics('heavy');
  };

  const activeSoundRef = useRef<Audio.Sound | null>(null);
  const lastSoundAtRef = useRef(0);
  const playSound = async (type: 'move' | 'win' | 'lose' | 'gem' | 'attack' = 'move') => {
    if (!progress.soundEnabled) return;
    const now = Date.now();
    // Movement sounds are deliberately rate-limited; one sound at a time prevents overlap.
    if (type === 'move' && now - lastSoundAtRef.current < 180) return;
    lastSoundAtRef.current = now;
    const soundUrls: Record<typeof type, string> = {
      move: 'https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg',
      win: 'https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg',
      lose: 'https://actions.google.com/sounds/v1/cartoon/boing.ogg',
      gem: 'https://actions.google.com/sounds/v1/cartoon/pop.ogg',
      attack: 'https://actions.google.com/sounds/v1/impacts/crash.ogg',
    };
    try {
      const previous = activeSoundRef.current;
      activeSoundRef.current = null;
      if (previous) {
        previous.setOnPlaybackStatusUpdate(null);
        await previous.stopAsync().catch(() => undefined);
        await previous.unloadAsync().catch(() => undefined);
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: soundUrls[type] },
        { shouldPlay: true, volume: type === 'move' ? 0.22 : 0.55 },
      );
      activeSoundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish && activeSoundRef.current === sound) {
          activeSoundRef.current = null;
          void sound.unloadAsync().catch(() => undefined);
        }
      });
    } catch {
      // Audio playback is best-effort and must not interrupt the game.
    }
  };

  useEffect(() => () => {
    const sound = activeSoundRef.current;
    activeSoundRef.current = null;
    if (sound) void sound.unloadAsync().catch(() => undefined);
  }, []);

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
      void playSound('gem');
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

  // Each level has a countdown. Higher levels receive less time (down to 60 seconds).
  useEffect(() => {
    if (screen !== 'playing') {
      return;
    }

    const timer = setInterval(() => {
      setSeconds((value) => value + 1);
      setTimeLeft((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [screen]);

  useEffect(() => {
    if (screen === 'playing' && timeLeft <= 0) {
      finishRound('lost');
    }
  }, [screen, timeLeft]);

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
        <View style={[styles.hud, { backgroundColor: theme.panel, borderColor: theme.primary }]}>
          <View style={styles.hudStat}><Text style={styles.hudIcon}>🗝️</Text><Text style={[styles.hudValue, { color: theme.fg }]}>{currentLevel}/{TOTAL_LEVELS}</Text></View>
          <View style={styles.hudStat}><Text style={styles.hudIcon}>💎</Text><Text style={[styles.hudValue, { color: theme.fg }]}>{progress.coins ?? 0}</Text></View>
          <View style={styles.hudStat}><Text style={styles.hudIcon}>👾</Text><Text style={[styles.hudValue, { color: theme.fg }]}>{enemies.length}</Text></View>
          <View style={[styles.hudStat, styles.timerStat, { borderColor: timeLeft <= 15 ? '#fb7185' : theme.accent }]}>
            <Text style={styles.hudIcon}>⏳</Text>
            <Text style={[styles.hudValue, { color: timeLeft <= 15 ? '#fb7185' : theme.fg }]}>{String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}</Text>
          </View>
        </View>
        <View style={styles.boardStage}>
          <MazeBoard
            maze={maze}
            player={player}
            goal={goal}
            enemies={enemies}
            hint={hint}
            theme={theme}
            gems={gems}
            shieldPickup={shieldPickup}
            maxHeight={Math.max(120,  Dimensions.get('window').height - 340)}
          />
        </View>

        <View style={[styles.controls, { backgroundColor: theme.panel }]}>
          <View style={styles.controlLayout}>
            <View style={styles.cornerColumn}>
              <Pressable accessibilityLabel="استخدام السيف" onPress={useSword} style={[styles.cornerButton, { backgroundColor: theme.surface, borderColor: theme.primary }]}><Text style={styles.cornerIcon}>⚔️</Text><Text style={[styles.cornerCount, { color: theme.fg }]}>{progress.swords ?? 0}</Text></Pressable>
              <Pressable accessibilityLabel="فتح المتجر" onPress={() => { setShopReturnScreen('playing'); setScreen('shop'); }} style={[styles.cornerButton, { backgroundColor: theme.surface, borderColor: theme.primary }]}><Text style={styles.cornerIcon}>🛒</Text><Text style={[styles.cornerLabel, { color: theme.fg }]}>المتجر</Text></Pressable>
            </View>
            <View style={[styles.dpadRing, { borderColor: theme.accent, shadowColor: theme.accent }]}>
              <Pressable accessibilityLabel="التحرك إلى الأعلى" onPress={() => movePlayer(0, -1)} style={[styles.dpadButton, styles.dpadUp, { backgroundColor: theme.surface }]}><Text style={[styles.dpadArrow, { color: theme.primary, writingDirection: 'ltr', textAlign: 'center' }]}>▲</Text></Pressable>
              <Pressable accessibilityLabel="التحرك إلى اليسار" onPress={() => movePlayer(-1, 0)} style={[styles.dpadButton, styles.dpadLeft, { backgroundColor: theme.surface }]}><Text style={[styles.dpadArrow, { color: theme.primary, writingDirection: 'ltr', textAlign: 'center' }]}>◀</Text></Pressable>
              <View style={[styles.dpadCenter, { borderColor: theme.accent, backgroundColor: theme.bg }]}><Text style={[styles.dpadCenterText, { color: theme.primary }]}>✦</Text></View>
              <Pressable accessibilityLabel="التحرك إلى اليمين" onPress={() => movePlayer(1, 0)} style={[styles.dpadButton, styles.dpadRight, { backgroundColor: theme.surface }]}><Text style={[styles.dpadArrow, { color: theme.primary, writingDirection: 'ltr', textAlign: 'center' }]}>▶</Text></Pressable>
              <Pressable accessibilityLabel="التحرك إلى الأسفل" onPress={() => movePlayer(0, 1)} style={[styles.dpadButton, styles.dpadDown, { backgroundColor: theme.surface }]}><Text style={[styles.dpadArrow, { color: theme.primary, writingDirection: 'ltr', textAlign: 'center' }]}>▼</Text></Pressable>
            </View>
            <View style={styles.cornerColumn}>
              <Pressable accessibilityLabel="استخدام القنبلة" onPress={useBomb} style={[styles.cornerButton, { backgroundColor: theme.surface, borderColor: theme.accent }]}><Text style={styles.cornerIcon}>💣</Text><Text style={[styles.cornerCount, { color: theme.fg }]}>{progress.bombs ?? 0}</Text></Pressable>
              <Pressable accessibilityLabel="العودة إلى القائمة الرئيسية" onPress={() => setScreen('start')} style={[styles.cornerButton, { backgroundColor: theme.surface, borderColor: theme.accent }]}><Text style={styles.cornerIcon}>⌂</Text><Text style={[styles.cornerLabel, { color: theme.fg }]}>القائمة</Text></Pressable>
            </View>
          </View>
          <View style={styles.utilityRow}>
            <Pressable onPress={() => startLevel(currentLevel)} style={[styles.utilityButton, { backgroundColor: theme.surface }]}><Text style={[styles.utilityText, { color: theme.fg }]}>↻ إعادة</Text></Pressable>
            <Pressable onPress={() => setScreen('settings')} style={[styles.utilityButton, { backgroundColor: theme.surface }]}><Text style={[styles.utilityText, { color: theme.fg }]}>⚙ الإعدادات</Text></Pressable>
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
    minHeight: 0,
    paddingHorizontal: 4,
    paddingTop: 2,
    paddingBottom: 2,
    justifyContent: 'flex-start',
  },
  hud: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginBottom: 4,
    flexGrow: 0,
  },
  hudStat: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 42, justifyContent: 'center' },
  hudIcon: { fontSize: 15 },
  hudValue: { fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'] },
  timerStat: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  boardStage: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  topBarText: {
    fontSize: 13,
    fontWeight: '800',
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
    flexGrow: 0,
    flexShrink: 0,
    borderRadius: 18,
    marginTop: 0,
    marginBottom: 1,
    paddingHorizontal: 3,
    paddingVertical: 4,
    alignItems: 'center',
  },
  controlLayout: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', direction: 'ltr' },
  cornerColumn: { width: 54, alignItems: 'center', justifyContent: 'space-evenly', gap: 12 },
  cornerButton: { width: 48, height: 48, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', padding: 2 },
  cornerIcon: { fontSize: 19, textAlign: 'center' },
  cornerCount: { fontSize: 10, fontWeight: '900', textAlign: 'center' },
  cornerLabel: { fontSize: 9, fontWeight: '800', textAlign: 'center' },
  utilityRow: { flexDirection: 'row', width: '100%', justifyContent: 'center', gap: 8, marginTop: 4 },
  utilityButton: { borderRadius: 10, paddingVertical: 5, paddingHorizontal: 12, minWidth: 92, alignItems: 'center' },
  utilityText: { fontSize: 10, fontWeight: '800' },
  dpadRing: {
    width: 174,
    height: 174,
    borderRadius: 87,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: '#303641',
    shadowOpacity: 0.65,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  dpadButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  dpadUp: { top: 7 },
  dpadDown: { bottom: 7 },
  dpadLeft: { left: 7 },
  dpadRight: { right: 7 },
  dpadArrow: { fontSize: 24, fontWeight: '900', includeFontPadding: false },
  dpadCenter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadCenterText: { fontSize: 27, fontWeight: '900' },
  orbitActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    width: '100%',
  },
  orbitButton: {
    minWidth: 52,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  orbitIcon: { fontSize: 17 },
  orbitCount: { fontSize: 11, fontWeight: '900' },
  orbitLabel: { fontSize: 10, fontWeight: '800' },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  shopItem: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12, alignItems: 'center', gap: 6 },
  actionText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
