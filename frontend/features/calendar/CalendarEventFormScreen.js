/* 
  Purpose: Define event booking form supporting surgery workflows and routine events.
  Responsibility: Collect details, auto-calculate end-times, validate parameters, and query conflicts.
*/

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useCalendarStore } from './store';
import { usePatientsStore } from '../patients/store';
import { useDoctorsStore } from '../doctors/store';
import { useMasterDataStore } from '../master-data/store';
import { useSurgeriesStore } from '../surgeries/store';
import { AlertModal } from '../../shared/components/AlertModal';
import { DateDropdown } from '../../shared/components/DateDropdown';
import { TimeDropdown } from '../../shared/components/TimeDropdown';
import { SearchableDropdown } from '../../shared/components/SearchableDropdown';
import { theme } from '../../shared/styles/theme';

const getInitialDate = (isoString) => {
  if (!isoString) return '';
  try {
    return new Date(isoString).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const getInitialTime = (isoString) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  } catch {
    return '';
  }
};

const parseRecurrence = (rule, startTimeIso) => {
  const defaultDays = { MO: false, TU: false, WE: false, TH: false, FR: false, SA: false, SU: false };
  if (!rule) {
    return { enabled: false, days: defaultDays, untilOption: 'FOREVER' };
  }
  const parts = rule.split(';').reduce((acc, part) => {
    const [key, val] = part.split('=');
    if (key && val) acc[key.toUpperCase()] = val;
    return acc;
  }, {});

  const enabled = parts.FREQ === 'WEEKLY' || parts.FREQ === 'DAILY';
  const days = { ...defaultDays };
  if (parts.BYDAY) {
    parts.BYDAY.split(',').forEach(d => {
      const uD = d.trim().toUpperCase();
      if (days[uD] !== undefined) days[uD] = true;
    });
  } else if (parts.FREQ === 'DAILY') {
    Object.keys(days).forEach(k => days[k] = true);
  }

  let untilOption = 'FOREVER';
  if (parts.UNTIL && startTimeIso) {
    const startD = new Date(startTimeIso);
    const untilD = new Date(parts.UNTIL.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
    const diffMonths = (untilD.getFullYear() - startD.getFullYear()) * 12 + (untilD.getMonth() - startD.getMonth());
    untilOption = diffMonths > 6 ? '1_YEAR' : '1_MONTH';
  }

  return { enabled, days, untilOption };
};



export function CalendarEventFormScreen({ route, navigation }) {
  const { id, patientId: routePatientId, redirectToEstimate: routeRedirectToEstimate } = route.params || {};
  const { events, createEvent, updateEvent, selectedDate: storeSelectedDate } = useCalendarStore();
  const existing = events.find(e => e.id === id) || {};

  const { patients, fetchPatients } = usePatientsStore();
  const { doctors, fetchDoctors } = useDoctorsStore();
  const { otRooms, fetchOtRooms } = useMasterDataStore();
  const { surgeries, fetchSurgeries } = useSurgeriesStore();

  const [categorySelected, setCategorySelected] = useState(!!id);
  const [eventType, setEventType] = useState(existing.eventType || '');
  const [title, setTitle] = useState(existing.title || '');

  const defaultDate = storeSelectedDate || new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(existing.startTime ? getInitialDate(existing.startTime) : defaultDate);
  const [startTimeVal, setStartTimeVal] = useState(existing.startTime ? getInitialTime(existing.startTime) : '');
  const [durationMinutes, setDurationMinutes] = useState(existing.durationMinutes ? String(existing.durationMinutes) : '60');
  const [endTimeVal, setEndTimeVal] = useState(existing.endTime ? getInitialTime(existing.endTime) : '');

  const recConfig = parseRecurrence(existing.recurrenceRule, existing.startTime);
  const [repeatEvent, setRepeatEvent] = useState(recConfig.enabled);
  const [selectedDays, setSelectedDays] = useState(recConfig.days);
  const [repeatUntil, setRepeatUntil] = useState(recConfig.untilOption);
  
  const [patientId, setPatientId] = useState(existing.patientId || routePatientId || '');
  const [doctorId, setDoctorId] = useState(existing.doctorId || '');
  const [assistantSurgeonId, setAssistantSurgeonId] = useState(existing.assistantSurgeonId || '');
  const [location, setLocation] = useState(existing.location || '');

  const [patientSearch, setPatientSearch] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [saving, setSaving] = useState(false);
  // Open states for SearchableDropdown are managed internally inside that component

  useEffect(() => {
    fetchPatients();
    fetchDoctors();
    fetchOtRooms();
    fetchSurgeries();
  }, []);

  const handleSelectCategory = (cat) => {
    setEventType(cat === 'Routine Event' ? 'OPD' : cat === 'Rounds' ? 'IPD' : cat.toUpperCase());
    setCategorySelected(true);
  };

  const updateDuration = (durationStr) => {
    setDurationMinutes(durationStr);
    const mins = parseInt(durationStr, 10);
    if (!isNaN(mins) && startTimeVal) {
      const [h, m] = startTimeVal.split(':').map(Number);
      const startMs = h * 60 + m;
      const endMs = startMs + mins;
      const endH = String(Math.floor((endMs / 60) % 24)).padStart(2, '0');
      const endM = String(endMs % 60).padStart(2, '0');
      setEndTimeVal(`${endH}:${endM}`);
    }
  };

  const updateEndTime = (endTimeStr) => {
    setEndTimeVal(endTimeStr);
    if (startTimeVal && endTimeStr) {
      const [sh, sm] = startTimeVal.split(':').map(Number);
      const [eh, em] = endTimeStr.split(':').map(Number);
      let diffMins = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMins < 0) diffMins += 1440;
      setDurationMinutes(String(diffMins));
    }
  };

  const updateStartTime = (startTimeStr) => {
    setStartTimeVal(startTimeStr);
    if (durationMinutes) {
      const mins = parseInt(durationMinutes, 10);
      if (!isNaN(mins)) {
        const [h, m] = startTimeStr.split(':').map(Number);
        const startMs = h * 60 + m;
        const endMs = startMs + mins;
        const endH = String(Math.floor((endMs / 60) % 24)).padStart(2, '0');
        const endM = String(endMs % 60).padStart(2, '0');
        setEndTimeVal(`${endH}:${endM}`);
      }
    }
  };

  // Core save logic — separated so we can call it twice (once normal, once forceCreate)
  const doSave = async (forceCreate = false) => {
    if (!startDate.trim() || !startTimeVal.trim()) {
      return Alert.alert('Validation Error', 'Start date and time are required.');
    }
    
    const startTimeCombined = `${startDate}T${startTimeVal}`;
    let endTimeCombined = endTimeVal.trim() ? `${startDate}T${endTimeVal}` : '';

    if (!endTimeCombined && durationMinutes.trim()) {
      const startMs = new Date(startTimeCombined).getTime();
      const durMs = parseInt(durationMinutes, 10) * 60000;
      if (!isNaN(startMs) && !isNaN(durMs)) {
        endTimeCombined = new Date(startMs + durMs).toISOString().slice(0, 16);
      }
    }

    if (!endTimeCombined) return Alert.alert('Validation Error', 'End time or Duration is required.');
    
    let eventTitle = title.trim();
    if (eventType === 'SURGERY') {
      if (!patientId) return Alert.alert('Validation Error', 'Patient selection is mandatory for surgery.');
      
      const pat = patients.find(p => p.id === patientId);
      if (!eventTitle && pat) {
        eventTitle = `Surgery - ${pat.name}`;
      }
    }

    if (!eventTitle) return Alert.alert('Validation Error', 'Title is required.');

    let computedRecurrenceRule = null;
    if (repeatEvent) {
      const activeDays = Object.keys(selectedDays).filter(k => selectedDays[k]);
      if (activeDays.length === 0) {
        return Alert.alert('Validation Error', 'Please select at least one day of the week for repeat.');
      }
      
      let ruleStr = `FREQ=WEEKLY;BYDAY=${activeDays.join(',')}`;
      if (repeatUntil !== 'FOREVER') {
        const startD = new Date(startDate);
        const untilD = new Date(startD);
        if (repeatUntil === '1_MONTH') {
          untilD.setMonth(untilD.getMonth() + 1);
        } else if (repeatUntil === '1_YEAR') {
          untilD.setFullYear(untilD.getFullYear() + 1);
        }
        const year = untilD.getFullYear();
        const month = String(untilD.getMonth() + 1).padStart(2, '0');
        const day = String(untilD.getDate()).padStart(2, '0');
        ruleStr += `;UNTIL=${year}${month}${day}`;
      }
      computedRecurrenceRule = ruleStr;
    }

    setSaving(true);
    try {
      const payload = {
        title: eventTitle,
        eventType,
        startTime: new Date(startTimeCombined).toISOString(),
        endTime: new Date(endTimeCombined).toISOString(),
        patientId: patientId || null,
        doctorId: doctorId || null,
        assistantSurgeonId: assistantSurgeonId || null,
        location: location || null,
        recurrenceRule: computedRecurrenceRule,
        forceCreate: forceCreate || undefined  // skip conflict check when true
      };
      
      console.log('doSave called with forceCreate:', forceCreate);
      console.log('Sending payload:', JSON.stringify(payload));

      if (id) {
        await updateEvent(id, payload);
        navigation.goBack();
      } else {
        const res = await createEvent(payload);
        if (routeRedirectToEstimate && res && res.id) {
          navigation.navigate('EstimateForm', { id: null, eventId: res.id });
        } else {
          navigation.goBack();
        }
      }
    } catch (err) {
      // 409 conflict → offer "Schedule Anyway?" instead of hard blocking
      if (err.status === 409 || err.message?.includes('already has an event') || err.message?.includes('already booked')) {
        setSaving(false);
        Alert.alert(
          '⚠️ Scheduling Conflict',
          err.message,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Schedule Anyway', style: 'destructive', onPress: () => doSave(true) }
          ]
        );
        return;
      }
      Alert.alert('Scheduling Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => doSave(false);


  if (!categorySelected) {
    return (
      <View style={styles.container}>
        <Text style={theme.typography.title}>Schedule New Event</Text>
        <Text style={styles.subtitle}>Select category of the event to begin</Text>
        <View style={styles.grid}>
          {['Surgery', 'Routine Event', 'Rounds', 'Meeting', 'Other'].map(cat => (
            <TouchableOpacity key={cat} style={styles.tile} onPress={() => handleSelectCategory(cat)}>
              <Text style={styles.tileText}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  const selectedPatient = patients.find(p => p.id === patientId);
  const selectedDoctor = doctors.find(d => d.id === doctorId);

  // Only show dropdown list when user is actively typing (non-empty search)
  const filteredPatients = patientSearch.trim()
    ? patients.filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase()) || p.uhid.toLowerCase().includes(patientSearch.toLowerCase()) || p.mobile.includes(patientSearch))
    : [];

  const filteredDoctors = doctorSearch.trim()
    ? doctors.filter(d => `${d.firstName} ${d.lastName}`.toLowerCase().includes(doctorSearch.toLowerCase()))
    : [];
  const webInputStyle = {
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    padding: 12,
    borderRadius: 8,
    border: '1px solid ' + theme.colors.border,
    fontSize: 14,
    fontFamily: 'inherit',
    flex: 1,
    boxSizing: 'border-box',
    marginHorizontal: 2
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={theme.typography.title}>{id ? 'Edit Event' : `New ${eventType}`}</Text>
      
      <View style={styles.form}>
        {eventType !== 'SURGERY' && (
          <>
            <Text style={styles.label}>Title *</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Meeting or Routine Title" placeholderTextColor={theme.colors.textMuted} />
          </>
        )}

        <Text style={styles.label}>Start Date & Time *</Text>
          <View style={styles.pickerRow}>
            <View style={{ flex: 1, marginRight: 4 }}>
              <DateDropdown value={startDate} onChange={setStartDate} />
            </View>
            <View style={{ flex: 1, marginLeft: 4 }}>
              <TimeDropdown value={startTimeVal} onChange={updateStartTime} />
            </View>
          </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <Text style={styles.label}>Duration (min)</Text>
            <TextInput style={styles.input} value={durationMinutes} onChangeText={updateDuration} keyboardType="numeric" placeholder="60" placeholderTextColor={theme.colors.textMuted} />
          </View>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <Text style={styles.label}>End Time (Optional)</Text>
            <TimeDropdown value={endTimeVal} onChange={updateEndTime} />
          </View>
        </View>

        {eventType === 'SURGERY' ? (
          <>
            {/* ─── Patient Search Dropdown ─── */}
            <Text style={styles.label}>Patient *</Text>
            {selectedPatient ? (
              <View style={styles.selectedChip}>
                <Text style={styles.selectedChipText}>👤 {selectedPatient.name} ({selectedPatient.uhid})</Text>
                <TouchableOpacity onPress={() => { setPatientId(''); setPatientSearch(''); }} style={styles.chipClearBtn}>
                  <Text style={styles.chipClearText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  value={patientSearch}
                  onChangeText={setPatientSearch}
                  placeholder="Type name, UHID or mobile to search..."
                  placeholderTextColor={theme.colors.textMuted}
                />
                {filteredPatients.length > 0 && (
                  <View style={styles.suggestionBox}>
                    {filteredPatients.slice(0, 5).map(p => (
                      <TouchableOpacity key={p.id} style={styles.selectItem} onPress={() => { setPatientId(p.id); setPatientSearch(''); }}>
                        <Text style={styles.selectItemText}>👤 {p.name}</Text>
                        <Text style={styles.selectItemSub}>{p.uhid} · 📞 {p.mobile}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {patientSearch.trim().length > 0 && filteredPatients.length === 0 && (
                  <Text style={styles.noResultText}>No patients match "{patientSearch}"</Text>
                )}
              </>
            )}

            {/* ─── Surgeon Combobox Dropdown ─── */}
            <Text style={styles.label}>Surgeon</Text>
            <SearchableDropdown
              items={doctors}
              value={selectedDoctor}
              onSelect={(d) => { setDoctorId(d ? d.id : ''); }}
              placeholder="Tap to browse surgeons ▼"
              keyExtractor={d => d.id}
              renderItem={d => `Dr. ${d.firstName} ${d.lastName} (${d.specialty || ''})`}
              renderSelected={d => `🩺 Dr. ${d.firstName} ${d.lastName} (${d.specialty || ''})`}
              filterFn={(d, q) => `${d.firstName} ${d.lastName} ${d.specialty || ''}`.toLowerCase().includes(q.toLowerCase())}
            />

            {/* ─── Assistant Surgeon Combobox Dropdown ─── */}
            <Text style={styles.label}>Assistant Surgeon (Optional)</Text>
            <SearchableDropdown
              items={doctors}
              value={doctors.find(d => d.id === assistantSurgeonId)}
              onSelect={(d) => { setAssistantSurgeonId(d ? d.id : ''); }}
              placeholder="Tap to browse assistant surgeons ▼"
              keyExtractor={d => d.id}
              renderItem={d => `Dr. ${d.firstName} ${d.lastName} (${d.specialty || ''})`}
              renderSelected={d => `🩺 Dr. ${d.firstName} ${d.lastName} (${d.specialty || ''})`}
              filterFn={(d, q) => `${d.firstName} ${d.lastName} ${d.specialty || ''}`.toLowerCase().includes(q.toLowerCase())}
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>Location / Place</Text>
            <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="OPD Room 3, Conf Room etc." placeholderTextColor={theme.colors.textMuted} />

            {/* Optional Doctor selection for non-surgery events */}
            {doctors.length > 0 && (
              <>
                <Text style={styles.label}>Assigned Doctor (Optional)</Text>
                <SearchableDropdown
                  items={doctors}
                  value={selectedDoctor}
                  onSelect={(d) => { setDoctorId(d ? d.id : ''); }}
                  placeholder="Tap to browse doctors ▼"
                  keyExtractor={d => d.id}
                  renderItem={d => `Dr. ${d.firstName} ${d.lastName} (${d.specialty || ''})`}
                  renderSelected={d => `🩺 Dr. ${d.firstName} ${d.lastName} (${d.specialty || ''})`}
                  filterFn={(d, q) => `${d.firstName} ${d.lastName} ${d.specialty || ''}`.toLowerCase().includes(q.toLowerCase())}
                />
              </>
            )}

            <Text style={styles.label}>Repeat Options</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity 
                style={[styles.toggleButton, !repeatEvent && styles.toggleButtonActive]} 
                onPress={() => setRepeatEvent(false)}
              >
                <Text style={[styles.toggleText, !repeatEvent && styles.toggleTextActive]}>Once (No Repeat)</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleButton, repeatEvent && styles.toggleButtonActive]} 
                onPress={() => setRepeatEvent(true)}
              >
                <Text style={[styles.toggleText, repeatEvent && styles.toggleTextActive]}>Repeat on selected days</Text>
              </TouchableOpacity>
            </View>

            {repeatEvent && (
              <View style={styles.recurrenceContainer}>
                <Text style={styles.subLabel}>Repeat On (Select days):</Text>
                <View style={styles.daysRow}>
                  {Object.entries({
                    MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun'
                  }).map(([code, name]) => {
                    const isChecked = selectedDays[code];
                    return (
                      <TouchableOpacity 
                        key={code} 
                        style={[styles.dayCheckbox, isChecked && styles.dayCheckboxActive]}
                        onPress={() => setSelectedDays({ ...selectedDays, [code]: !isChecked })}
                      >
                        <Text style={[styles.dayCheckboxText, isChecked && styles.dayCheckboxTextActive]}>
                          {name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.subLabel}>Repeat Until:</Text>
                <View style={styles.toggleRow}>
                  {[
                    { key: 'FOREVER', label: 'Forever' },
                    { key: '1_MONTH', label: '1 Month' },
                    { key: '1_YEAR', label: '1 Year' }
                  ].map(opt => (
                    <TouchableOpacity 
                      key={opt.key} 
                      style={[styles.toggleButton, repeatUntil === opt.key && styles.toggleButtonActive]} 
                      onPress={() => setRepeatUntil(opt.key)}
                    >
                      <Text style={[styles.toggleText, repeatUntil === opt.key && styles.toggleTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
        )}



        {saving ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Confirm Schedule</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  subtitle: { color: theme.colors.textMuted, fontSize: 14, marginBottom: theme.spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  tile: { width: '47%', backgroundColor: theme.colors.surface, padding: 24, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  tileText: { color: theme.colors.text, fontWeight: '700', fontSize: 14 },
  form: { marginVertical: theme.spacing.md },
  label: { color: theme.colors.text, marginTop: theme.spacing.sm, marginBottom: 4, fontWeight: '600' },
  subLabel: { color: theme.colors.text, fontSize: 13, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  selectedLabel: { color: theme.colors.textMuted, fontSize: 12, marginBottom: 4 },
  selectedVal: { color: theme.colors.primary, fontWeight: '700' },
  // Selected chip with clear button
  selectedChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary + '22', borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 8, paddingVertical: 8, paddingLeft: 12, paddingRight: 6, marginVertical: 4 },
  selectedChipText: { flex: 1, color: theme.colors.primary, fontWeight: '600', fontSize: 13 },
  chipClearBtn: { padding: 4, marginLeft: 6 },
  chipClearText: { color: theme.colors.primary, fontWeight: '700', fontSize: 15 },
  // Suggestion dropdown
  suggestionBox: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, overflow: 'hidden', marginBottom: 4 },
  selectItem: { backgroundColor: theme.colors.surface, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  selectItemText: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
  selectItemSub: { color: theme.colors.textMuted, fontSize: 11, marginTop: 1 },
  noResultText: { color: theme.colors.textMuted, fontSize: 12, fontStyle: 'italic', paddingVertical: 6, paddingHorizontal: 4 },
  input: { backgroundColor: theme.colors.surface, color: theme.colors.text, padding: 12, borderRadius: 8, borderColor: theme.colors.border, borderWidth: 1, marginVertical: 4 },
  row: { flexDirection: 'row' },
  pickerRow: { flexDirection: 'row', gap: 6, marginVertical: 4 },
  recurrenceContainer: { backgroundColor: theme.colors.surface, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, marginVertical: 8 },
  daysRow: { flexDirection: 'row', gap: 6, marginVertical: 6, flexWrap: 'wrap' },
  dayCheckbox: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: theme.colors.surface, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, minWidth: 44, alignItems: 'center' },
  dayCheckboxActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  dayCheckboxText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' },
  dayCheckboxTextActive: { color: '#ffffff' },
  toggleRow: { flexDirection: 'row', gap: 6, marginVertical: 6, flexWrap: 'wrap' },
  toggleButton: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.colors.surface, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border },
  toggleButtonActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  toggleText: { color: theme.colors.text, fontSize: 11, fontWeight: '600' },
  toggleTextActive: { color: '#ffffff' },
  saveButton: { backgroundColor: theme.colors.success, padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' }
});
