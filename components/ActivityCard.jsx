import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, borderRadius } from '../styles/theme';
import { useSettings } from '../context/SettingsContext';

const getTypeIcons = (colors) => ({
  attraction: { icon: 'location', color: colors.primary },
  food: { icon: 'restaurant', color: '#F59E0B' },
  shopping: { icon: 'bag', color: '#8B5CF6' },
  transport: { icon: 'train', color: colors.secondary },
  hotel: { icon: 'bed', color: '#EC4899' },
});

export default function ActivityCard({ activity, isLast, onEdit }) {
  const { colors } = useSettings();
  const typeIcons = getTypeIcons(colors);
  const typeInfo = typeIcons[activity.type] || typeIcons.attraction;

  return (
    <View style={styles.container}>
      <View style={styles.timelineCol}>
        <View style={[styles.dot, { backgroundColor: typeInfo.color }]}>
          <Ionicons name={typeInfo.icon} size={12} color="#FFFFFF" />
        </View>
        {!isLast && <View style={[styles.line, { backgroundColor: colors.border }]} />}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.time, { color: colors.textSecondary }]}>{activity.time}</Text>
          <TouchableOpacity onPress={() => onEdit(activity)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="pencil" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{activity.title}</Text>

        {activity.location?.name && (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.detail, { color: colors.textSecondary }]}>{activity.location.name}</Text>
          </View>
        )}

        <View style={styles.metaRow}>
          {activity.duration && (
            <View style={styles.row}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.detail, { color: colors.textSecondary }]}>{activity.duration}</Text>
            </View>
          )}
          {activity.cost > 0 && (
            <View style={styles.row}>
              <Ionicons name="cash-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.detail, { color: colors.textSecondary }]}>${activity.cost}</Text>
            </View>
          )}
          {activity.rating && (
            <View style={styles.row}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={[styles.detail, { color: colors.textSecondary }]}>{activity.rating}</Text>
            </View>
          )}
        </View>

        {activity.description ? (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>{activity.description}</Text>
        ) : null}

        {activity.transport?.mode && (
          <View style={[styles.transportBadge, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="swap-vertical-outline" size={12} color={colors.secondary} />
            <Text style={[styles.transportText, { color: colors.secondary }]}>
              {activity.transport.mode} · {activity.transport.duration}
              {activity.transport.cost > 0 ? ` · $${activity.transport.cost}` : ''}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  timelineCol: {
    width: 32,
    alignItems: 'center',
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  line: {
    flex: 1,
    width: 2,
    marginVertical: spacing.xs,
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  time: {
    ...typography.caption,
    fontWeight: '700',
  },
  title: {
    ...typography.headingM,
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  detail: {
    ...typography.caption,
  },
  description: {
    ...typography.bodySmall,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  transportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  transportText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
