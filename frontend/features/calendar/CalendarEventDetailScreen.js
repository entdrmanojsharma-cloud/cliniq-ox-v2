/* 
  Purpose: Define Calendar event detailed presentation and estimate linkage.
  Responsibility: Provide action buttons to approve/complete/cancel schedule requests.
*/

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Pressable } from 'react-native';
import { api } from '../../shared/utils/api';
import { theme } from '../../shared/styles/theme';
import { DateDropdown } from '../../shared/components/DateDropdown';
import { TimeDropdown } from '../../shared/components/TimeDropdown';
import { parseCombinedDateTimeToIST } from '../../shared/utils/date';

export function CalendarEventDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [postponeModalVisible, setPostponeModalVisible] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

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

  const handlePostpone = async () => {
    if (!newDate || !newTime) {
      Alert.alert('Validation Error', 'Please select both a new date and time.');
      return;
    }
    try {
      setLoading(true);
      const startDT = parseCombinedDateTimeToIST(`${newDate}T${newTime}`);
      const duration = event.durationMinutes || 30;
      const endDT = new Date(startDT.getTime() + duration * 60000);
      
      await api.patch(`/calendar/${id}/postpone`, {
        startTime: startDT.toISOString(),
        endTime: endDT.toISOString()
      });
      Alert.alert('Success', 'Event postponed successfully.');
      setPostponeModalVisible(false);
      loadEvent();
    } catch (err) {
      Alert.alert('Action Failed', err.message);
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Event', 'Are you sure you want to permanently delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          setLoading(true);
          await api.delete(`/calendar/${id}`);
          Alert.alert('Success', 'Event deleted successfully');
          navigation.goBack();
        } catch (err) {
          Alert.alert('Error', err.message);
          setLoading(false);
        }
      }}
    ]);
  };

  if (loading) return <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />;
  if (!event) return <Text style={styles.emptyText}>Event not found.</Text>;

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  const isPast = new Date(event.startTime) < new Date();
  const isPendingOutcome = isPast && (event.eventStatus === 'PENDING' || event.eventStatus === 'APPROVED');
  const isHistorical = isPast && !isPendingOutcome;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={theme.typography.title}>
        {event.eventType === 'SURGERY' 
          ? (event.surgery?.surgeryName 
              ? `Surgery: ${event.surgery.surgeryName}` 
              : (event.estimate?.estimateSurgeries?.length > 0
                  ? `Surgery: ${event.estimate.estimateSurgeries.map(s => s.surgery?.surgeryName || s.surgeryName || 'Unspecified').join(', ')}`
                  : event.title))
          : event.title}
      </Text>
      
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
          <Text style={styles.value}>
            {event.doctor ? 
              (`${event.doctor.firstName} ${event.doctor.lastName}`.trim().toLowerCase().startsWith('dr') ? 
                `${event.doctor.firstName} ${event.doctor.lastName}` : 
                `Dr. ${event.doctor.firstName} ${event.doctor.lastName}`) 
              : 'N/A'}
          </Text>
        </View>

        {(event.surgery || (event.estimate?.estimateSurgeries && event.estimate.estimateSurgeries.length > 0)) && (
          <View style={styles.row}>
            <Text style={styles.label}>Surgery</Text>
            <Text style={styles.value}>
              {event.surgery?.surgeryName 
                ? `${event.surgery.surgeryName} (${event.surgery.surgeryCode || ''})` 
                : event.estimate.estimateSurgeries.map(s => s.surgery?.surgeryName || s.surgeryName || 'Unspecified').join(', ')}
            </Text>
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

        {/* Active Actions */}
        {!isPast && event.eventStatus === 'PENDING' && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleAction('approve')}>
              <Text style={styles.btnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => handleAction('cancel')}>
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isPast && event.eventStatus === 'APPROVED' && (
          <View style={styles.actionRow}>
            {event.eventType !== 'SURGERY' || (event.estimate && ['APPROVED', 'LOCKED'].includes(event.estimate.status)) ? (
              <TouchableOpacity style={[styles.actionBtn, styles.completeBtn]} onPress={() => handleAction('complete')}>
                <Text style={styles.btnText}>Complete Event</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.actionBtn, styles.disabledBtn]}>
                <Text style={styles.disabledBtnText}>Complete (Needs Estimate)</Text>
              </View>
            )}
            <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => handleAction('cancel')}>
              <Text style={styles.btnText}>Cancel Event</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pending Outcome Actions */}
        {isPendingOutcome && (
          <View style={styles.outcomePromptBox}>
            <Text style={styles.outcomePromptTitle}>⚠️ Event Time Has Passed</Text>
            <Text style={styles.outcomePromptDesc}>This event is still pending. Please enter the final outcome below:</Text>
            
            <View style={[styles.actionRow, { flexWrap: 'wrap', marginTop: 12 }]}>
              {event.eventType !== 'SURGERY' || (event.estimate && ['APPROVED', 'LOCKED'].includes(event.estimate.status)) ? (
                <TouchableOpacity style={[styles.actionBtn, styles.completeBtn]} onPress={() => handleAction('complete')}>
                  <Text style={styles.btnText}>Complete Event</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.actionBtn, styles.disabledBtn]}>
                  <Text style={styles.disabledBtnText}>Complete (Needs Estimate)</Text>
                </View>
              )}
              <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => handleAction('cancel')}>
                <Text style={styles.btnText}>Cancel Event</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f59e0b' }]} onPress={() => setPostponeModalVisible(true)}>
                <Text style={styles.btnText}>Postpone</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Edit Restictions */}
        {!isPast && (
          <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('CalendarEventForm', { id: event.id })}>
            <Text style={styles.editButtonText}>Edit Event Details</Text>
          </TouchableOpacity>
        )}

        {isHistorical && (
          <View style={styles.historicalBox}>
            <Text style={styles.historicalText}>This is a historical event. Details cannot be modified.</Text>
          </View>
        )}

        <TouchableOpacity style={[styles.editButton, { borderColor: '#dc2626', marginTop: 4 }]} onPress={handleDelete}>
          <Text style={[styles.editButtonText, { color: '#dc2626' }]}>Delete Event</Text>
        </TouchableOpacity>
      </View>

      {/* Postpone Modal */}
      <Modal visible={postponeModalVisible} transparent animationType="fade" onRequestClose={() => setPostponeModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPostponeModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Postpone Event</Text>
            <Text style={styles.modalDesc}>Select a new date and time for this event. The current event will be marked as POSTPONED and a new schedule will be created.</Text>
            
            <Text style={styles.modalLabel}>New Date</Text>
            <DateDropdown value={newDate} onChange={setNewDate} />

            <Text style={styles.modalLabel}>New Time</Text>
            <TimeDropdown value={newTime} onChange={setNewTime} />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setPostponeModalVisible(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPostponeBtn} onPress={handlePostpone}>
                <Text style={styles.modalPostponeBtnText}>Confirm Postpone</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  disabledBtn: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' },
  disabledBtnText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
  btnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  editButton: { borderWidth: 1, borderColor: theme.colors.primary, padding: 14, borderRadius: 8, alignItems: 'center' },
  editButtonText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 14 },
  historicalBox: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1' },
  historicalText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  outcomePromptBox: { backgroundColor: '#fee2e2', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#f87171', marginBottom: 12 },
  outcomePromptTitle: { color: '#991b1b', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  outcomePromptDesc: { color: '#7f1d1d', fontSize: 13, fontWeight: '500' },
  buttonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  loader: { marginVertical: theme.spacing.xl },
  emptyText: { textAlign: 'center', marginTop: theme.spacing.xl, color: theme.colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, backgroundColor: theme.colors.surface, borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text, marginBottom: 8 },
  modalDesc: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 16 },
  modalLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, marginTop: 12, marginBottom: 4 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 12 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border },
  modalCancelBtnText: { color: theme.colors.textMuted, fontWeight: '600' },
  modalPostponeBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f59e0b' },
  modalPostponeBtnText: { color: '#fff', fontWeight: 'bold' }
});
