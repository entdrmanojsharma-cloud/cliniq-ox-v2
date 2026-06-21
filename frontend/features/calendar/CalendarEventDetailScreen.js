/* 
  Purpose: Define Calendar event detailed presentation and estimate linkage.
  Responsibility: Provide action buttons to approve/complete/cancel schedule requests.
*/

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { api } from '../../shared/utils/api';
import { theme } from '../../shared/styles/theme';

export function CalendarEventDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadEvent = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/calendar/${id}`);
      setEvent(data);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvent();
  }, [id]);

  const handleAction = async (actionPath) => {
    try {
      setLoading(true);
      await api.patch(`/calendar/${id}/${actionPath}`);
      Alert.alert('Success', `Event successfully marked as ${actionPath.toUpperCase()}`);
      loadEvent();
    } catch (err) {
      Alert.alert('Action Failed', err.message);
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />;
  if (!event) return <Text style={styles.emptyText}>Event not found.</Text>;

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={theme.typography.title}>{event.title}</Text>
      
      <View style={styles.detailCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Event Type</Text>
          <Text style={[styles.value, styles.badge]}>{event.eventType}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <Text style={[styles.value, styles.badge, { backgroundColor: event.eventStatus === 'APPROVED' ? '#dcfce7' : '#fef3c7', color: event.eventStatus === 'APPROVED' ? '#15803d' : '#d97706' }]}>
            {event.eventStatus}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Scheduled From</Text>
          <Text style={styles.value}>{formatTime(event.startTime)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Scheduled To</Text>
          <Text style={styles.value}>{formatTime(event.endTime)}</Text>
        </View>

        {event.durationMinutes && (
          <View style={styles.row}>
            <Text style={styles.label}>Duration</Text>
            <Text style={styles.value}>{event.durationMinutes} minutes</Text>
          </View>
        )}

        {event.location && (
          <View style={styles.row}>
            <Text style={styles.label}>Location / Room</Text>
            <Text style={styles.value}>{event.location}</Text>
          </View>
        )}

        {event.otRoom && (
          <View style={styles.row}>
            <Text style={styles.label}>OT Room</Text>
            <Text style={styles.value}>{event.otRoom.roomName}</Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Patient</Text>
          <Text style={styles.value}>{event.patient ? `${event.patient.name} (${event.patient.uhid})` : 'N/A'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Doctor</Text>
          <Text style={styles.value}>{event.doctor ? `Dr. ${event.doctor.firstName} ${event.doctor.lastName}` : 'N/A'}</Text>
        </View>

        {event.surgery && (
          <View style={styles.row}>
            <Text style={styles.label}>Surgery</Text>
            <Text style={styles.value}>{event.surgery.surgeryName} ({event.surgery.surgeryCode})</Text>
          </View>
        )}

        {event.diagnoses && event.diagnoses.length > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Diagnoses</Text>
            <Text style={styles.value}>{event.diagnoses.join(', ')}</Text>
          </View>
        )}

        {event.surgeryCost && (
          <View style={styles.row}>
            <Text style={styles.label}>Surgery Cost</Text>
            <Text style={[styles.value, { fontWeight: '700', color: theme.colors.primary }]}>
              ₹{Number(event.surgeryCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        )}

        {event.description && (
          <View style={styles.descBlock}>
            <Text style={styles.label}>Notes / Description</Text>
            <Text style={styles.descText}>{event.description}</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonGrid}>
        {event.eventType === 'SURGERY' && (
          event.estimate ? (
            <TouchableOpacity style={styles.estimateButton} onPress={() => navigation.navigate('EstimateDetail', { id: event.estimate.id })}>
              <Text style={styles.buttonText}>View Surgery Estimate</Text>
            </TouchableOpacity>
          ) : (
            event.eventStatus === 'APPROVED' && (
              <TouchableOpacity style={styles.estimateButton} onPress={() => navigation.navigate('EstimateForm', { id: null, eventId: event.id })}>
                <Text style={styles.buttonText}>Create Surgery Estimate</Text>
              </TouchableOpacity>
            )
          )
        )}

        {event.eventStatus === 'PENDING' && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleAction('approve')}>
              <Text style={styles.btnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => handleAction('cancel')}>
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {event.eventStatus === 'APPROVED' && (
          <View style={styles.actionRow}>
            {event.eventType !== 'SURGERY' || (event.estimate && ['APPROVED', 'LOCKED'].includes(event.estimate.status)) ? (
              <TouchableOpacity style={[styles.actionBtn, styles.completeBtn]} onPress={() => handleAction('complete')}>
                <Text style={styles.btnText}>Complete Event</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.actionBtn, styles.disabledBtn]}>
                <Text style={styles.disabledBtnText}>Complete Event (Pending Estimate)</Text>
              </View>
            )}
            <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => handleAction('cancel')}>
              <Text style={styles.btnText}>Cancel Event</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('CalendarEventForm', { id: event.id })}>
          <Text style={styles.editButtonText}>Edit Event Details</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  detailCard: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  label: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '500' },
  value: { color: theme.colors.text, fontSize: 14, fontWeight: '600', textAlign: 'right' },
  badge: { backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 11, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },
  descBlock: { marginTop: 12 },
  descText: { color: theme.colors.text, fontSize: 13, marginTop: 4, lineHeight: 18 },
  buttonGrid: { gap: 10 },
  estimateButton: { backgroundColor: theme.colors.success, padding: 14, borderRadius: 8, alignItems: 'center' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  approveBtn: { backgroundColor: '#2563eb' },
  cancelBtn: { backgroundColor: '#dc2626' },
  completeBtn: { backgroundColor: '#16a34a' },
  btnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  editButton: { borderWidth: 1, borderColor: theme.colors.primary, padding: 14, borderRadius: 8, alignItems: 'center' },
  editButtonText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 14 },
  buttonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  loader: { marginVertical: theme.spacing.xl },
  emptyText: { color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing.xl },
  disabledBtn: { backgroundColor: '#475569', opacity: 0.5 },
  disabledBtnText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 13, textAlign: 'center' }
});
