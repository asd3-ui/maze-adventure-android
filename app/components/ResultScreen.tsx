import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MazeTheme } from './types';

type ResultScreenProps = {
  theme: MazeTheme;
  result: 'won' | 'lost';
  currentLevel: number;
  totalLevels: number;
  moves: number;
  seconds: number;
  score: number;
  onReplay: () => void;
  onNext: () => void;
  onHome: () => void;
};

export function ResultScreen({ theme, result, currentLevel, totalLevels, moves, seconds, score, onReplay, onNext, onHome }: ResultScreenProps) {
  const won = result === 'won';
  const lastLevel = currentLevel >= totalLevels;
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.card, { backgroundColor: theme.panel }]}>
        <Text style={[styles.emoji]}>{won ? '🏆' : '🧩'}</Text>
        <Text style={[styles.title, { color: theme.fg }]}>{won ? 'أحسنت! لقد فزت' : 'انتهت الجولة'}</Text>
        <Text style={[styles.subtitle, { color: theme.secondary }]}>{won ? (lastLevel ? 'أكملت جميع المستويات!' : 'تم فتح المستوى التالي.') : 'حاول مرة أخرى وتجنب الخصوم.'}</Text>
        <View style={[styles.stats, { backgroundColor: theme.surface }]}>
          <Text style={[styles.stat, { color: theme.fg }]}>المستوى: {currentLevel}</Text>
          <Text style={[styles.stat, { color: theme.fg }]}>الحركات: {moves}</Text>
          <Text style={[styles.stat, { color: theme.fg }]}>الوقت: {Math.floor(seconds / 60).toString().padStart(2, '0')}:{(seconds % 60).toString().padStart(2, '0')}</Text>
          <Text style={[styles.stat, { color: theme.fg }]}>النقاط: {score}</Text>
        </View>
        <Pressable onPress={won && !lastLevel ? onNext : onReplay} style={[styles.primary, { backgroundColor: theme.primary }]}>
          <Text style={styles.primaryText}>{won && !lastLevel ? 'المستوى التالي' : 'العب مجددًا'}</Text>
        </Pressable>
        <Pressable onPress={onHome} style={[styles.secondary, { borderColor: theme.primary }]}>
          <Text style={[styles.secondaryText, { color: theme.primary }]}>العودة للرئيسية</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { borderRadius: 24, padding: 24, elevation: 8 },
  emoji: { fontSize: 44, textAlign: 'center' },
  title: { fontSize: 28, fontWeight: '900', textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginVertical: 12 },
  stats: { borderRadius: 14, padding: 16, marginBottom: 18 },
  stat: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  primary: { borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 10 },
  primaryText: { color: '#0d1426', fontSize: 16, fontWeight: '900' },
  secondary: { borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  secondaryText: { fontSize: 15, fontWeight: '800' },
});
