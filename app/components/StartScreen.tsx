import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LevelSelector } from './LevelSelector';
import type { MazeTheme } from './types';

type StartScreenProps = {
  theme: MazeTheme;
  unlocked: number;
  currentLevel: number;
  onStart: () => void;
  onSettings: () => void;
  onSelectLevel: (level: number) => void;
};

export function StartScreen({ theme, unlocked, currentLevel, onStart, onSettings, onSelectLevel }: StartScreenProps) {
  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.card, { backgroundColor: theme.panel }]}>
        <Text style={[styles.logo, { color: theme.primary }]}>🗝️</Text>
        <Text style={[styles.title, { color: theme.fg }]}>متاهات المغامرة</Text>
        <Text style={[styles.subtitle, { color: theme.secondary }]}>اهرب من الوحوش، اجمع الجواهر، والتقط الدرع السحري قبل الوصول إلى بوابة النجاة!</Text>

        <Pressable onPress={onStart} style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
          <Text style={[styles.primaryText, { color: '#0d1426' }]}>ابدأ اللعب</Text>
        </Pressable>

        <Pressable onPress={onSettings} style={[styles.secondaryButton, { borderColor: theme.primary }]}>
          <Text style={[styles.secondaryText, { color: theme.primary }]}>الإعدادات</Text>
        </Pressable>

        <Text style={[styles.sectionTitle, { color: theme.fg }]}>اختيار المستوى</Text>
        <LevelSelector selected={currentLevel} unlocked={unlocked} theme={theme} onSelect={onSelectLevel} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    fontSize: 36,
    textAlign: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 6,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 8,
    marginBottom: 18,
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryText: {
    fontSize: 17,
    fontWeight: '800',
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 18,
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
});
