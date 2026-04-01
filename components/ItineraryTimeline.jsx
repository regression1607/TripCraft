import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import ActivityCard from './ActivityCard';
import { typography, spacing, borderRadius, shadows } from '../styles/theme';
import { useSettings } from '../context/SettingsContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function DayPill({ day, isExpanded, onPress }) {
  const { colors } = useSettings();
  const formatDayDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const activityCount = day.activities?.length || 0;
  const totalCost = day.activities?.reduce((sum, a) => sum + (a.cost || 0), 0) || 0;

  return (
    <TouchableOpacity
      style={[styles.dayPill, { backgroundColor: colors.card, borderColor: colors.border }, isExpanded && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.dayPillLeft}>
        <View style={[styles.dayBadge, { backgroundColor: colors.textSecondary }, isExpanded && { backgroundColor: colors.primary }]}>
          <Text style={styles.dayBadgeText}>Day {day.dayNumber}</Text>
        </View>
        <View>
          <Text style={[styles.dayPillDate, { color: colors.textPrimary }]}>{formatDayDate(day.date)}</Text>
          <Text style={[styles.dayPillMeta, { color: colors.textSecondary }]}>
            {activityCount} activities · ${totalCost}
          </Text>
        </View>
      </View>
      <Ionicons
        name={isExpanded ? 'chevron-up' : 'eye-outline'}
        size={20}
        color={isExpanded ? colors.primary : colors.textMuted}
      />
    </TouchableOpacity>
  );
}

function DayDetails({ day, onEditActivity, onAddActivity }) {
  const { colors } = useSettings();
  return (
    <View style={[styles.dayContent, { backgroundColor: colors.card, borderColor: colors.primary }]}>
      <View style={[styles.dayContentHeader, { borderBottomColor: colors.border }]}>
        <View style={[styles.dayContentBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.dayContentBadgeText}>Day {day.dayNumber}</Text>
        </View>
        <Text style={styles.dayContentDate}>
          {new Date(day.date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {day.activities?.map((activity, idx) => (
        <View key={activity._id || idx}>
          <ActivityCard
            activity={activity}
            isLast={idx === day.activities.length - 1 && !onAddActivity}
            onEdit={(a) => onEditActivity(day.dayNumber, idx, a)}
          />
        </View>
      ))}

      {onAddActivity && (
        <TouchableOpacity
          style={[styles.addButton, { borderColor: colors.secondary }]}
          onPress={() => onAddActivity(day.dayNumber, day.activities?.length || 0)}
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.secondary} />
          <Text style={[styles.addButtonText, { color: colors.secondary }]}>Add Activity</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ItineraryTimeline({ days, onEditActivity, onAddActivity }) {
  const { colors } = useSettings();
  const [expandedDay, setExpandedDay] = useState(null);

  const toggleDay = (dayNumber) => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(300, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.scaleY)
    );
    setExpandedDay(expandedDay === dayNumber ? null : dayNumber);
  };

  return (
    <View style={styles.container}>
      {days?.map((day) => (
        <View key={day.dayNumber}>
          {/* Day pill - always visible */}
          <DayPill
            day={day}
            isExpanded={expandedDay === day.dayNumber}
            onPress={() => toggleDay(day.dayNumber)}
          />

          {/* Details expand RIGHT BELOW this day pill, before next day */}
          {expandedDay === day.dayNumber && (
            <DayDetails
              day={day}
              onEditActivity={onEditActivity}
              onAddActivity={onAddActivity}
            />
          )}
        </View>
      ))}

      {!expandedDay && days?.length > 0 && (
        <View style={styles.hint}>
          <Ionicons name="hand-left-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.hintText, { color: colors.textMuted }]}>Tap a day to view details</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  dayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  dayPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dayBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  dayBadgeText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  dayPillDate: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  dayPillMeta: {
    ...typography.caption,
    marginTop: 2,
  },
  dayContent: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderWidth: 1,
    borderTopWidth: 0,
    marginBottom: spacing.xs,
  },
  dayContentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  dayContentBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  dayContentBadgeText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayContentDate: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  addButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  hintText: {
    ...typography.bodySmall,
  },
});
