import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  ActivityIndicator, Platform, Alert
} from 'react-native';
import { theme } from '../../shared/styles/theme';
import { useResponsive } from '../../shared/hooks/useResponsive';
import { api } from '../../shared/utils/api';
import { useCalendarStore } from './store';
import { getLocalDateString } from '../../shared/utils/date';

const formatTime = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
};

const formatDateHeader = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

export function FutureSurgeriesScreen({ navigation }) {
  const { isMobile } = useResponsive();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { deleteEvent } = useCalendarStore();

  const fetchFutureSurgeries = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const data = await api.get(`/calendar?startFrom=${today.toISOString()}&eventType=SURGERY&limit=200&sortBy=startTime&sortOrder=asc`);
      
      // We only want surgery events. The backend might filter it perfectly, but let's be sure.
      const surgeryEvents = (data.events || []).filter(e => e.eventType === 'SURGERY');
      
      setEvents(surgeryEvents);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load future surgeries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFutureSurgeries();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchFutureSurgeries();
    });
    return unsubscribe;
  }, [navigation]);

  const handleDelete = (id) => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteEvent(id);
            Alert.alert('Success', 'Event deleted successfully');
            fetchFutureSurgeries();
          } catch (e) {
            Alert.alert('Error', e.message || 'Failed to delete event');
          }
      }}
    ]);
  };

  // Group events by date
  const groupedEvents = events.reduce((acc, event) => {
    const dateStr = getLocalDateString(new Date(event.startTime));
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(event);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedEvents).sort();

  // Flatten for FlatList with headers
  const listData = [];
  sortedDates.forEach(dateStr => {
    listData.push({ isHeader: true, dateStr });
    listData.push(...groupedEvents[dateStr]);
  });

  const renderItem = ({ item }) => {
    if (item.isHeader) {
      return (
        <View style={styles.dateHeader}>
          <Text style={styles.dateHeaderText}>{formatDateHeader(item.dateStr)}</Text>
        </View>
      );
    }

    const isPast = new Date(item.startTime) < new Date();
    const isTomorrow = getLocalDateString(new Date(item.startTime)) === getLocalDateString(new Date(new Date().getTime() + 86400000));
    const isPendingOutcome = isPast && (item.eventStatus === 'PENDING' || item.eventStatus === 'APPROVED');
    const isHistorical = isPast && !isPendingOutcome;

    return (
      <TouchableOpacity 
        style={[
          styles.card, 
          isMobile && styles.cardMobile,
          isHistorical && styles.cardHistorical,
          isPendingOutcome && styles.cardPendingOutcome,
          !isPast && isTomorrow && styles.cardTomorrow
        ]} 
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CalendarEventDetail', { id: item.id })}
      >
        <View style={[styles.cardContent, isMobile && styles.cardContentMobile]}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.categoryTag, styles.tagSurgery]}>
                <Text style={styles.categoryTagTextSurgery}>{item.eventType}</Text>
              </View>
              <TouchableOpacity 
                style={styles.deleteIconButton} 
                onPress={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id);
                }}
              >
                <Text style={styles.deleteIconText}>🗑️</Text>
              </TouchableOpacity>
            </View>
            <View style={[
              styles.statusTag,
              item.eventStatus === 'APPROVED' ? styles.statusApproved :
              item.eventStatus === 'COMPLETED' ? styles.statusCompleted : styles.statusPending
            ]}>
              <Text style={styles.statusTagText}>{item.eventStatus}</Text>
            </View>
          </View>

          <Text style={[
            styles.cardTitle, 
            isMobile && styles.cardTitleMobile,
            isHistorical && styles.textHistorical
          ]}>
            {item.surgery?.surgeryName 
              ? `Surgery: ${item.surgery.surgeryName}` 
              : (item.estimate?.estimateSurgeries?.length > 0
                  ? `Surgery: ${item.estimate.estimateSurgeries.map(s => s.surgery?.surgeryName || s.surgeryName || 'Unspecified').join(', ')}`
                  : (item.title.includes(item.patient?.name) ? `Surgery: Pending` : `Surgery: ${item.title}`))}
          </Text>

          <View style={[styles.cardMetaRow, isMobile && styles.cardMetaRowMobile]}>
            <Text style={styles.cardMeta}>⏰ {formatTime(item.startTime)} ({item.durationMinutes || 0}m)</Text>
            {item.otRoom && <Text style={styles.cardMeta}>🏥 {item.otRoom.roomName}</Text>}
            {item.location && !item.otRoom && <Text style={styles.cardMeta}>📍 {item.location}</Text>}
          </View>

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
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Future Surgeries</Text>
        <TouchableOpacity style={styles.newButton} onPress={() => navigation.navigate('CalendarEventForm', { id: null })}>
          <Text style={styles.newButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, index) => item.isHeader ? `header-${item.dateStr}` : item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>No future surgeries scheduled.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: theme.spacing.md, backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border
  },
  title: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  newButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  newButtonText: { color: '#fff', fontWeight: 'bold' },
  listContent: { padding: 14, paddingBottom: 32 },
  loader: { marginVertical: 32 },
  dateHeader: { marginTop: 16, marginBottom: 8, paddingHorizontal: 4 },
  dateHeaderText: { fontSize: 16, fontWeight: '700', color: theme.colors.textMuted },
  
  // Card Styles reused from CalendarScreen
  card: {
    backgroundColor: theme.colors.surface, borderRadius: 12, marginBottom: 10,
    borderWidth: 1, borderColor: theme.colors.border,
    overflow: 'hidden'
  },
  cardHistorical: {
    backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', opacity: 0.8
  },
  cardPendingOutcome: {
    borderColor: '#ef4444', borderWidth: 2
  },
  cardTomorrow: {
    borderColor: '#f59e0b', borderWidth: 2, backgroundColor: '#fffbeb'
  },
  textHistorical: { color: '#64748b' },
  cardMobile: { borderRadius: 10 },
  cardContent: { padding: 14 },
  cardContentMobile: { padding: 11 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  categoryTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  tagSurgery: { backgroundColor: 'rgba(52, 211, 153, 0.15)', borderWidth: 1, borderColor: 'rgba(52, 211, 153, 0.3)' },
  categoryTagTextSurgery: { fontSize: 10, fontWeight: '700', color: '#34d399' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusApproved: { backgroundColor: '#dcfce7' },
  statusCompleted: { backgroundColor: '#e0e7ff' },
  statusPending: { backgroundColor: '#fef3c7' },
  statusTagText: { fontSize: 10, fontWeight: '800', color: '#1f2937', textTransform: 'uppercase' },
  deleteIconButton: {
    paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#fee2e2',
    borderRadius: 4, borderWidth: 1, borderColor: '#fca5a5'
  },
  deleteIconText: { fontSize: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 6, lineHeight: 20 },
  cardTitleMobile: { fontSize: 14 },
  cardMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 6 },
  cardMetaRowMobile: { gap: 8 },
  cardMeta: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '500' },
  descriptionText: { fontSize: 12, color: theme.colors.textMuted, fontStyle: 'italic', marginBottom: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8, marginTop: 4 },
  cardFooterMobile: { flexDirection: 'column', gap: 4 },
  cardSubText: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '600' },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '500' },
});
