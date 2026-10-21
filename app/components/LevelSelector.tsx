import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MazeTheme } from './types';

type LevelSelectorProps = {
  selected: number;
  unlocked: number;
  theme: MazeTheme;
  onSelect: (level: number) => void;
};

export function LevelSelector({ selected, unlocked, theme, onSelect }: LevelSelectorProps) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: 25 }, (_, index) => index + 1).map((level) => {
        const locked = level > unlocked;
        const active = level === selected;
        return (
          <Pressable
            key={level}
            accessibilityRole="button"
            accessibilityLabel={`المستوى ${level}${locked ? ' مقفل' : ''}`}
            disabled={locked}
            onPress={() => onSelect(level)}
            style={[
              styles.level,
              {
                backgroundColor: active ? theme.primary : theme.surface,
                borderColor: active ? theme.accent : theme.secondary,
                opacity: locked ? 0.35 : 1,
              },
            ]}
          >
            <Text style={[styles.label, { color: active ? '#0d1426' : theme.fg }]}>{locked ? '🔒' : level}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  level: { width: 42, height: 42, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '800' },
});
