/* 
  Purpose: Define main Calendar dashboard screen with rolling 7-day view.
  Responsibility: Render rolling schedule bar, handle week pagination, show event counts per day.
*/

import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  ActivityIndicator, Platform, ScrollView, TextInput
} from 'react-native';
import { useCalendarStore } from './store';
import { theme } from '../../shared/styles/theme';
import { useResponsive } from '../../shared/hooks/useResponsive';
import { DobDropdownPicker } from '../../shared/components/DobDropdownPicker';

// ─── Frontend occurrence expansion ───────────────────────────────────────────
const getFrontOccurrences = (event, startLimit, endLimit) => {
  const occurrences = [];
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  
  if (!event.recurrenceRule) {
    if (start <= endLimit && end >= startLimit) {
      occurrences.push({ ...event, startTime: start.toISOString(), endTime: end.toISOString() });
    }
    return occurrences;
  }

  const parts = event.recurrenceRule.split(';').reduce((acc, part) => {
    const [key, val] = part.split('=');
    if (key && val) acc[key.toUpperCase()] = val;
    return acc;
  }, {});

  const freq = parts.FREQ;
  const byDay = parts.BYDAY ? parts.BYDAY.split(',').map(d => d.trim().toUpperCase()) : null;
  const dayMap = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

  let until = null;
  if (parts.UNTIL) {
    const uStr = parts.UNTIL.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
    until = new Date(uStr);
    until.setHours(23, 59, 59, 999);
  }

  const durationMs = end.getTime() - start.getTime();
  let currentStart = new Date(start);
  let currentEnd = new Date(currentStart.getTime() + durationMs);
  let limit = 0;

  while (limit < 100) {
    if (until && currentStart > until) break;
    if (currentStart > endLimit) break;

    let isMatch = true;
    if (freq === 'WEEKLY' && byDay) {
      const dayName = Object.keys(dayMap).find(k => dayMap[k] === currentStart.getDay());
      if (!byDay.includes(dayName)) isMatch = false;
    }

    if (isMatch && currentEnd >= startLimit && currentStart <= endLimit) {
      const occurrenceId = `${event.id}_occ_${currentStart.toISOString().split('T')[0]}`;
      occurrences.push({
        ...event,
        occurrenceId,
        startTime: new Date(currentStart).toISOString(),
        endTime: new Date(currentEnd).toISOString()
      });
    }

    if (freq === 'DAILY') {
      currentStart.setDate(currentStart.getDate() + 1);
    } else if (freq === 'WEEKLY') {
      currentStart.setDate(currentStart.getDate() + (byDay ? 1 : 7));
    } else {
      break;
    }
    currentEnd = new Date(currentStart.getTime() + durationMs);
    limit++;
  }

  return occurrences;
};

const formatRecurrence = (rule) => {
  if (!rule) return '';
  const parts = rule.split(';').reduce((acc, part) => {
    const [key, val] = part.split('=');
    if (key && val) acc[key.toUpperCase()] = val;
    return acc;
  }, {});
  if (parts.FREQ === 'WEEKLY' && parts.BYDAY) {
    const dayLabels = { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' };
    const days = parts.BYDAY.split(',').map(d => dayLabels[d.trim().toUpperCase()] || d).join(', ');
    return `Weekly on ${days}`;
  }
  return parts.FREQ || '';
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export function CalendarScreen({ navigation }) {
  const { 
    events, fetchEvents, loading,
    selectedDate, setSelectedDate,
    weekStartDate, setWeekStartDate,
    nextWeek, prevWeek 
  } = useCalendarStore();

  const { isMobile, isTablet } = useResponsive();
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchEvents();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchEvents();
    });
    return unsubscribe;
  }, [navigation, weekStartDate]);

  const weekStart = new Date(weekStartDate);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const expandedEvents = events.flatMap(e => getFrontOccurrences(e, weekStart, weekEnd));

  const getWeekDays = () => {
    const days = [];
    const base = new Date(weekStartDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayCount = expandedEvents.filter(e => new Date(e.startTime).toISOString().split('T')[0] === dateStr).length;
      days.push({
        dateStr,
        dayNum: d.getDate(),
        dayName: d.toLocaleDateString('en-US', { weekday: isMobile ? 'narrow' : 'short' }),
        count: dayCount
      });
    }
    return days;
  };

  const weekDays = getWeekDays();

  const filteredEvents = expandedEvents.filter(item => {
    const eventDate = new Date(item.startTime).toISOString().split('T')[0];
    if (eventDate !== selectedDate) return false;
    if (!searchText) return true;
    const s = searchText.toLowerCase();
    return (
      item.title?.toLowerCase().includes(s) ||
      (item.doctor ? `Dr. ${item.doctor.firstName} ${item.doctor.lastName}`.toLowerCase().includes(s) : false) ||
      item.patient?.name?.toLowerCase().includes(s) ||
      item.patient?.uhid?.toLowerCase().includes(s) ||
      item.otRoom?.roomName?.toLowerCase().includes(s) ||
      item.location?.toLowerCase().includes(s)
    );
  });

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  // Week range label
  const weekRangeLabel = (() => {
    const s = new Date(weekStartDate);
    const e = new Date(weekStartDate);
    e.setDate(e.getDate() + 6);
    if (isMobile) {
      return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.getDate()}`;
    }
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  })();

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <Text style={[styles.headerTitle, isMobile && styles.headerTitleMobile]}>
          {isMobile ? '📅 Schedule' : 'OT & Surgery Schedule'}
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CalendarEventForm', { id: null })}
        >
          <Text style={styles.addButtonText}>{isMobile ? '+ New' : '+ Schedule'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Week Navigator ── */}
      <View style={[styles.weekController, isMobile && styles.weekControllerMobile]}>
        <TouchableOpacity onPress={prevWeek} style={[styles.navButton, isMobile && styles.navButtonMobile]}>
          <Text style={styles.navButtonText}>{isMobile ? '◀' : '◀ Prev'}</Text>
        </TouchableOpacity>

        <View style={styles.weekControlMiddle}>
          <Text style={[styles.weekLabel, isMobile && styles.weekLabelMobile]}>{weekRangeLabel}</Text>
          {Platform.OS === 'web' && !isMobile && (
            <View style={{ marginLeft: 16, width: 240 }}>
              <DobDropdownPicker
                value={weekStartDate}
                onChange={(val) => {
                  if (val) { setWeekStartDate(val); setSelectedDate(val); }
                }}
              />
            </View>
          )}
        </View>

        <TouchableOpacity onPress={nextWeek} style={[styles.navButton, isMobile && styles.navButtonMobile]}>
          <Text style={styles.navButtonText}>{isMobile ? '▶' : 'Next ▶'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── 7-Day Bar – scrollable on mobile ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dateBarScroll}
        contentContainerStyle={[styles.dateBar, isMobile && styles.dateBarMobile]}
      >
        {weekDays.map((day) => {
          const isSelected = day.dateStr === selectedDate;
          return (
            <TouchableOpacity
              key={day.dateStr}
              style={[
                styles.dateTab,
                isMobile && styles.dateTabMobile,
                isSelected && styles.dateTabActive
              ]}
              onPress={() => setSelectedDate(day.dateStr)}
            >
              {/* Day name */}
              <Text style={[styles.dayLabel, isSelected && styles.dayLabelActive]}>
                {day.dayName}
              </Text>

              {/* Date number */}
              <Text style={[styles.dateText, isMobile && styles.dateTextMobile, isSelected && styles.dateTextActive]}>
                {day.dayNum}
              </Text>

              {/* Event count badge — always rendered for stable height */}
              <View style={[
                styles.countBadge,
                isSelected && styles.countBadgeActive,
                day.count === 0 && styles.countBadgeEmpty
              ]}>
                {day.count > 0 && (
                  <Text style={[styles.countText, isSelected && styles.countTextActive]}>
                    {day.count}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Jump-to-date on mobile ── */}
      {Platform.OS === 'web' && isMobile && (
        <View style={[styles.mobileDateRow, { flexDirection: 'column', alignItems: 'stretch', gap: 6, minHeight: 70 }]}>
          <Text style={styles.mobileDateLabel}>Jump to date:</Text>
          <DobDropdownPicker
            value={weekStartDate}
            onChange={(val) => {
              if (val) { setWeekStartDate(val); setSelectedDate(val); }
            }}
          />
        </View>
      )}

      {/* ── Event List ── */}
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.occurrenceId || item.id}
          contentContainerStyle={[styles.listContent, isMobile && styles.listContentMobile]}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, isMobile && styles.cardMobile]}
              onPress={() => navigation.navigate('CalendarEventDetail', { id: item.id })}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.categoryTag, item.eventType === 'SURGERY' ? styles.tagSurgery : styles.tagOther]}>
                  <Text style={styles.categoryTagText}>{item.eventType}</Text>
                </View>
                <View style={[
                  styles.statusTag,
                  item.eventStatus === 'APPROVED' ? styles.statusApproved :
                  item.eventStatus === 'COMPLETED' ? styles.statusCompleted : styles.statusPending
                ]}>
                  <Text style={styles.statusTagText}>{item.eventStatus}</Text>
                </View>
              </View>

              <Text style={[styles.cardTitle, isMobile && styles.cardTitleMobile]}>{item.title}</Text>

              <View style={[styles.cardMetaRow, isMobile && styles.cardMetaRowMobile]}>
                <Text style={styles.cardMeta}>⏰ {formatTime(item.startTime)} ({item.durationMinutes || 0}m)</Text>
                {item.otRoom && <Text style={styles.cardMeta}>🏥 {item.otRoom.roomName}</Text>}
                {item.location && !item.otRoom && <Text style={styles.cardMeta}>📍 {item.location}</Text>}
              </View>

              {item.recurrenceRule && (
                <Text style={styles.recurrenceText}>🔄 {formatRecurrence(item.recurrenceRule)}</Text>
              )}

              {item.description && (
                <Text style={styles.descriptionText} numberOfLines={2}>📝 {item.description}</Text>
              )}

              <View style={[styles.cardFooter, isMobile && styles.cardFooterMobile]}>
                <Text style={styles.cardSubText} numberOfLines={1}>
                  👤 {item.patient ? item.patient.name : 'No patient'}
                </Text>
                <Text style={styles.cardSubText} numberOfLines={1}>
                  🩺 {item.doctor ? `${item.doctor.firstName} ${item.doctor.lastName}` : 'No doctor'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>No events scheduled for this day.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border
  },
  headerMobile: { paddingHorizontal: 12, paddingVertical: 10 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  headerTitleMobile: { fontSize: 15 },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8
  },
  addButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },

  // Week controller
  weekController: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border
  },
  weekControllerMobile: { paddingHorizontal: 8, paddingVertical: 6 },
  weekControlMiddle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  weekLabel: { color: theme.colors.text, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  weekLabelMobile: { fontSize: 11 },
  navButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  navButtonMobile: { paddingHorizontal: 8, paddingVertical: 5 },
  navButtonText: { color: theme.colors.primary, fontWeight: '700', fontSize: 12 },

  // 7-day scroll bar — FIXED HEIGHT so FlatList never squeezes it
  dateBarScroll: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    height: 88,          // ← fixed: never changes regardless of event count
    flexShrink: 0        // ← prevents flex from compressing this
  },
  dateBar: { flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 6, gap: 4, height: 88 },
  dateBarMobile: { paddingHorizontal: 4, gap: 3 },

  dateTab: {
    width: 56,
    height: 76,          // ← fixed height: letter + number + badge always visible
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1, borderColor: theme.colors.border
  },
  dateTabMobile: { width: 48, height: 76, borderRadius: 12 },
  dateTabActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },

  dayLabel: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 1, letterSpacing: 0.5 },
  dayLabelActive: { color: 'rgba(255,255,255,0.8)' },
  dateText: { color: theme.colors.text, fontSize: 20, fontWeight: '800', lineHeight: 24 },
  dateTextMobile: { fontSize: 18 },
  dateTextActive: { color: '#ffffff' },

  // Bold filled pill — always visible, high contrast
  countBadge: {
    marginTop: 4,
    minWidth: 22,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 6,
    backgroundColor: theme.colors.warning,   // amber — stands out on any bg
    alignItems: 'center',
    justifyContent: 'center'
  },
  countBadgeActive: {
    backgroundColor: '#ffffff'               // white pill on selected purple tab
  },
  countBadgeEmpty: {
    backgroundColor: 'transparent',          // invisible placeholder for days with 0 events
    borderWidth: 0
  },
  countText: { color: '#000000', fontSize: 10, fontWeight: '900', lineHeight: 14 },
  countTextActive: { color: theme.colors.primary, fontWeight: '900' },

  // Mobile jump-to-date row
  mobileDateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border
  },
  mobileDateLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },

  // Event list
  listContent: { padding: 14, paddingBottom: 32 },
  listContentMobile: { padding: 10, paddingBottom: 24 },
  loader: { marginVertical: 32 },

  card: {
    backgroundColor: theme.colors.surface,
    padding: 14, borderRadius: 12, marginBottom: 10,
    borderWidth: 1, borderColor: theme.colors.border
  },
  cardMobile: { padding: 11, borderRadius: 10 },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  categoryTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagSurgery: { backgroundColor: '#fee2e2' },
  tagOther: { backgroundColor: theme.colors.background },
  categoryTagText: { fontSize: 10, fontWeight: '700', color: '#b91c1c' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusApproved: { backgroundColor: '#dcfce7' },
  statusCompleted: { backgroundColor: '#e0e7ff' },
  statusPending: { backgroundColor: '#fef3c7' },
  statusTagText: { fontSize: 10, fontWeight: '700', color: '#15803d' },

  cardTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
  cardTitleMobile: { fontSize: 14 },

  cardMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 5 },
  cardMetaRowMobile: { gap: 6 },
  cardMeta: { fontSize: 12, color: theme.colors.textMuted },

  recurrenceText: { fontSize: 12, color: theme.colors.primaryLight, marginBottom: 5, fontWeight: '600' },
  descriptionText: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 7, fontStyle: 'italic' },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: theme.colors.border,
    paddingTop: 7, gap: 8
  },
  cardFooterMobile: { flexDirection: 'column', gap: 2 },
  cardSubText: { fontSize: 12, color: theme.colors.text, fontWeight: '500', flex: 1 },

  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 }
});
