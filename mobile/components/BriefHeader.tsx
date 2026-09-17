import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Logo } from './Logo';
import { colors, fonts, radius } from '../lib/theme';

export function BriefHeader({ onSignOut }: { onSignOut: () => void }) {
  return (
    <View style={styles.row}>
      <Logo size={30} />
      <View style={styles.icons}>
        <Pressable style={styles.iconBtn} accessibilityLabel="Search">
          <Ionicons name="search" size={16} color={colors.textDim} />
        </Pressable>
        <Pressable style={styles.iconBtn} accessibilityLabel="Notifications">
          <Ionicons name="notifications-outline" size={16} color={colors.textDim} />
          <View style={styles.dot} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onSignOut} accessibilityLabel="Sign out">
          <Ionicons name="log-out-outline" size={16} color={colors.textDim} />
        </Pressable>
      </View>
    </View>
  );
}

export function FilterChips({
  categories,
  active,
  onChange,
}: {
  categories: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {categories.map((c) => {
        const on = c.id === active;
        return (
          <Pressable
            key={c.id}
            onPress={() => onChange(c.id)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{c.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
  },
  icons: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.green,
  },

  chipRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 20, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  chipOn: { backgroundColor: colors.violet, borderColor: colors.violet },
  chipLabel: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.textMuted },
  chipLabelOn: { color: colors.onViolet },
});
