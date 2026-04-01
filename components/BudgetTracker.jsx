import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { typography, spacing, borderRadius, shadows } from '../styles/theme';
import { useSettings } from '../context/SettingsContext';

const categoryConfig = {
  accommodation: { icon: 'bed-outline', label: 'Accommodation', color: '#6366F1' },
  food: { icon: 'restaurant-outline', label: 'Food', color: '#F59E0B' },
  transport: { icon: 'train-outline', label: 'Transport', color: '#2EC4B6' },
  activities: { icon: 'ticket-outline', label: 'Activities', color: '#EC4899' },
  shopping: { icon: 'bag-outline', label: 'Shopping', color: '#8B5CF6' },
};

export default function BudgetTracker({ budget, breakdown, days }) {
  const { colors } = useSettings();
  const [expandedDay, setExpandedDay] = useState(null);

  const totalSpend = breakdown?.total || 0;
  const remaining = (budget?.amount || 0) - totalSpend;
  const categories = Object.entries(categoryConfig).map(([key, config]) => ({
    ...config,
    key,
    amount: breakdown?.[key] || 0,
    percent: totalSpend > 0 ? ((breakdown?.[key] || 0) / totalSpend) * 100 : 0,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.summaryRow}>
        <View>
          <Text style={styles.label}>Total Budget</Text>
          <Text style={styles.budgetAmount}>${budget?.amount || 0}</Text>
        </View>
        <View style={styles.summaryRight}>
          <View>
            <Text style={styles.label}>Estimated</Text>
            <Text style={[styles.amount, { color: colors.secondary }]}>${totalSpend}</Text>
          </View>
          <View>
            <Text style={styles.label}>Remaining</Text>
            <Text style={[styles.amount, { color: remaining >= 0 ? colors.success : colors.error }]}>
              ${Math.abs(remaining)}
            </Text>
          </View>

        </View>
      </View>

      <View style={[styles.donutPlaceholder, { backgroundColor: colors.card }]}>
        <View style={styles.donutCenter}>
          <Text style={[styles.donutAmount, { color: colors.primary }]}>${totalSpend}</Text>
          <Text style={styles.donutLabel}>Total Spend</Text>
        </View>
        <View style={styles.donutLegend}>
          {categories.filter(c => c.amount > 0).map((cat) => (
            <View key={cat.key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
              <Text style={styles.legendText}>{cat.label} {Math.round(cat.percent)}%</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Breakdown</Text>
      {categories.map((cat) => (
        <View key={cat.key} style={styles.categoryRow}>
          <View style={styles.categoryHeader}>
            <Ionicons name={cat.icon} size={20} color={cat.color} />
            <Text style={styles.categoryLabel}>{cat.label}</Text>
            <Text style={styles.categoryAmount}>${cat.amount}</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(cat.percent, 100)}%`,
                  backgroundColor: cat.color,
                },
              ]}
            />
          </View>
        </View>
      ))}

      {days?.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: spacing.xxl }]}>Day-by-day Spending</Text>
          {days.map((day) => {
            const dayTotal = day.activities?.reduce((sum, a) => sum + (a.cost || 0), 0) || 0;
            return (
              <View key={day.dayNumber}>
                <TouchableOpacity
                  style={[styles.dayRow, { borderBottomColor: colors.border }]}
                  onPress={() => setExpandedDay(expandedDay === day.dayNumber ? null : day.dayNumber)}
                >
                  <Text style={styles.dayLabel}>Day {day.dayNumber}</Text>
                  <Text style={styles.dayAmount}>${dayTotal}</Text>
                  <Ionicons
                    name={expandedDay === day.dayNumber ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
                {expandedDay === day.dayNumber && day.activities?.map((act, idx) => (
                  act.cost > 0 && (
                    <View key={idx} style={styles.dayItem}>
                      <Text style={styles.dayItemText}>- {act.title}</Text>
                      <Text style={styles.dayItemAmount}>${act.cost}</Text>
                    </View>
                  )
                ))}
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxxl,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xxl,
  },
  summaryRight: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  label: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  budgetAmount: {
    ...typography.headingL,
  },
  amount: {
    ...typography.headingM,
  },
  donutPlaceholder: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xxl,
    ...shadows.card,
  },
  donutCenter: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  donutAmount: {
    ...typography.headingXL,
  },
  donutLabel: {
    ...typography.caption,
  },
  donutLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...typography.caption,
  },
  sectionTitle: {
    ...typography.headingM,
    marginBottom: spacing.lg,
  },
  categoryRow: {
    marginBottom: spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryLabel: {
    ...typography.bodySmall,
    flex: 1,
    fontWeight: '600',
  },
  categoryAmount: {
    ...typography.bodySmall,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  dayLabel: {
    ...typography.body,
    flex: 1,
    fontWeight: '600',
  },
  dayAmount: {
    ...typography.body,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  dayItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingLeft: spacing.xl,
  },
  dayItemText: {
    ...typography.bodySmall,
  },
  dayItemAmount: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
});
