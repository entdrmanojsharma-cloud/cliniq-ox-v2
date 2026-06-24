/* 
  Purpose: Define Patient screens (List, Detail View, and Form Editor).
  Responsibility: Render screens, handle pagination/sorting triggers, and validate user input.
*/

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Pressable, FlatList, ActivityIndicator, Alert, Platform } from 'react-native';
import { usePatientsStore } from './store';
import { useEstimatesStore } from '../estimates/store';
import { api } from '../../shared/utils/api';
import { theme } from '../../shared/styles/theme';
import { DobDropdownPicker } from '../../shared/components/DobDropdownPicker';

// SearchableDropdown component for consulting doctor
function SearchableDropdown({ label, items, selectedValue, onSelect, placeholder }) {
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = items.filter(item =>
    item.label.toLowerCase().includes(searchText.toLowerCase())
  );

  const selectedItem = items.find(i => i.value === selectedValue);

  return (
    <View style={{ marginVertical: 4, zIndex: 10 }}>
      <Text style={dropdownStyles.label}>{label}</Text>

      {/* Transparent overlay to close on outside click */}
      {showDropdown && (
        <Pressable
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }}
          onPress={() => { setShowDropdown(false); setSearchText(''); }}
        />
      )}

      <View style={{ zIndex: 11 }}>
        <TouchableOpacity
          style={dropdownStyles.selector}
          onPress={() => setShowDropdown(!showDropdown)}
          activeOpacity={0.8}
        >
          <Text style={selectedItem ? dropdownStyles.selectedText : dropdownStyles.placeholderText}>
            {selectedItem ? selectedItem.label : placeholder || 'Select...'}
          </Text>
          <Text style={dropdownStyles.arrow}>{showDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showDropdown && (
          <View style={[dropdownStyles.dropdownContainer, { position: 'absolute', top: 46, left: 0, right: 0, zIndex: 999 }]}>
            <TextInput
              style={dropdownStyles.searchInput}
              placeholder="Search doctor..."
              placeholderTextColor={theme.colors.textMuted}
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
            />
            <ScrollView style={dropdownStyles.optionsList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {filtered.map(item => (
                <TouchableOpacity
                  key={item.value}
                  style={[dropdownStyles.option, selectedValue === item.value && dropdownStyles.optionActive]}
                  onPress={() => { onSelect(item.value); setShowDropdown(false); setSearchText(''); }}
                >
                  <Text style={[dropdownStyles.optionText, selectedValue === item.value && dropdownStyles.optionTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
              {filtered.length === 0 && (
                <View style={dropdownStyles.option}>
                  <Text style={[dropdownStyles.optionText, { color: theme.colors.textMuted }]}>No doctors found</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}

// Simple gender dropdown
function GenderDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const options = [
    { label: 'Male', value: 'MALE' },
    { label: 'Female', value: 'FEMALE' },
    { label: 'Other', value: 'OTHER' },
  ];
  const selected = options.find(o => o.value === value);
  return (
    <View style={{ zIndex: 20, width: 130 }}>
      {/* Transparent overlay to close on outside click */}
      {open && (
        <Pressable
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 19 }}
          onPress={() => setOpen(false)}
        />
      )}
      <View style={{ zIndex: 21 }}>
        <TouchableOpacity
          style={[dropdownStyles.selector, { minHeight: 36, padding: 8 }]}
          onPress={() => setOpen(!open)}
          activeOpacity={0.8}
        >
          <Text style={selected ? dropdownStyles.selectedText : dropdownStyles.placeholderText}>
            {selected ? selected.label : 'Gender'}
          </Text>
          <Text style={dropdownStyles.arrow}>{open ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {open && (
          <View style={[dropdownStyles.dropdownContainer, { position: 'absolute', top: 40, left: 0, width: 130, maxHeight: 150, zIndex: 999 }]}>
            {options.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[dropdownStyles.option, value === opt.value && dropdownStyles.optionActive]}
                onPress={() => { onChange(opt.value); setOpen(false); }}
              >
                <Text style={[dropdownStyles.optionText, value === opt.value && dropdownStyles.optionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const dropdownStyles = StyleSheet.create({
  label: { color: theme.colors.text, marginVertical: 4, fontWeight: '600', fontSize: 13 },
  selector: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedText: { color: theme.colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  placeholderText: { color: theme.colors.textMuted, fontSize: 14, flex: 1 },
  arrow: { color: theme.colors.textMuted, fontSize: 10, marginLeft: 8 },
  dropdownContainer: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 220,
    overflow: 'hidden',
  },
  searchInput: {
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    padding: 10,
    fontSize: 13,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  optionsList: { maxHeight: 170 },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  optionActive: {
    backgroundColor: 'rgba(99,102,241,0.12)',
  },
  optionText: { color: theme.colors.text, fontSize: 13 },
  optionTextActive: { color: theme.colors.primaryLight, fontWeight: '700' },
});

// Extraction helpers for notes & Aadhaar
export function parsePatientNotes(rawNotes) {
  if (!rawNotes) return { notes: '', aadhaar: '' };
  const aadhaarMatch = rawNotes.match(/\[AADHAAR:([^\]]+)\]/);
  const aadhaar = aadhaarMatch ? aadhaarMatch[1] : '';
  const notes = rawNotes.replace(/\[AADHAAR:[^\]]*\]/g, '').trim();
  return { notes, aadhaar };
}

export function serializePatientNotes(notes, aadhaar) {
  let cleanNotes = notes || '';
  if (aadhaar) {
    cleanNotes = `${cleanNotes.trim()} [AADHAAR:${aadhaar.trim()}]`;
  }
  return cleanNotes.trim();
}

export function formatDateToDisplay(dobString) {
  if (!dobString) return '—';
  const date = new Date(dobString);
  if (isNaN(date.getTime())) return dobString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day} / ${month} / ${year}`;
}

export function calculateAge(dobString) {
  if (!dobString) return 'N/A';
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 ? `${age} yrs` : 'N/A';
}

const SkeletonCard = () => (
  <View style={[styles.patientCard, { opacity: 0.15 }]}>
    <View style={styles.cardContent}>
      <View style={styles.cardRow}>
        <View style={[styles.cardCol, { flex: 2 }]}>
          <View style={{ height: 12, width: 80, backgroundColor: theme.colors.textMuted, borderRadius: 4, marginBottom: 6 }} />
          <View style={{ height: 16, width: 140, backgroundColor: theme.colors.textMuted, borderRadius: 4 }} />
        </View>
        <View style={styles.cardCol}>
          <View style={{ height: 12, width: 40, backgroundColor: theme.colors.textMuted, borderRadius: 4, marginBottom: 6 }} />
          <View style={{ height: 16, width: 50, backgroundColor: theme.colors.textMuted, borderRadius: 4 }} />
        </View>
        <View style={styles.cardCol}>
          <View style={{ height: 12, width: 50, backgroundColor: theme.colors.textMuted, borderRadius: 4, marginBottom: 6 }} />
          <View style={{ height: 16, width: 60, backgroundColor: theme.colors.textMuted, borderRadius: 4 }} />
        </View>
      </View>
    </View>
  </View>
);

const SkeletonList = () => (
  <View style={{ gap: 12, paddingBottom: 88 }}>
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
  </View>
);

export function PatientsListScreen({ route, navigation }) {
  const { patients, fetchPatients, loading, page, limit, total, search, pmjay, setFilters } = usePatientsStore();
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [matchingPatientIds, setMatchingPatientIds] = useState(null);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    if (route?.params?.reset) {
      setFilters({ search: '', page: 1, pmjay: 'all' });
      setDateStart('');
      setDateEnd('');
      setMatchingPatientIds(null);
    } else if (route?.params?.initialPmjay) {
      setFilters({ pmjay: route.params.initialPmjay, page: 1 });
    }
  }, [route?.params]);

  useEffect(() => {
    fetchPatients();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPatients();
    });
    return unsubscribe;
  }, [navigation, page, search, pmjay]);

  useEffect(() => {
    if (dateStart || dateEnd) {
      fetchMatchingPatients();
    } else {
      setMatchingPatientIds(null);
    }
  }, [dateStart, dateEnd]);

  const fetchMatchingPatients = async () => {
    setLoadingEvents(true);
    try {
      const data = await api.get('/calendar?limit=200');
      const events = data.events || [];
      const filtered = events.filter(e => {
        const eDate = e.startTime ? e.startTime.split('T')[0] : '';
        if (dateStart && eDate < dateStart) return false;
        if (dateEnd && eDate > dateEnd) return false;
        return true;
      });
      const ids = filtered.map(e => e.patientId || e.patient?.id).filter(Boolean);
      setMatchingPatientIds(new Set(ids));
    } catch (err) {
      console.log('Error fetching events for patient filtering:', err.message);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleNextPage = () => {
    if (page * limit < total) {
      setFilters({ page: page + 1 });
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setFilters({ page: page - 1 });
    }
  };

  const displayedPatients = matchingPatientIds
    ? patients.filter(p => matchingPatientIds.has(p.id))
    : patients;

  const webDateInputStyle = {
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    padding: 12,
    borderRadius: 8,
    border: '1px solid ' + theme.colors.border,
    fontSize: 14,
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 44
  };

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={theme.typography.title}>Patient Directory</Text>
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8 }}
          onPress={() => navigation.navigate('PatientForm', { id: null })}
        >
          <Text style={{ fontWeight: '800', color: theme.colors.text }}>ADD Patient</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by phone number, name, UHID..."
        placeholderTextColor={theme.colors.textMuted}
        value={search}
        onChangeText={(val) => setFilters({ search: val, page: 1 })}
      />

      <Text style={styles.label}>Filter By Date</Text>
      <View style={{ flexDirection: 'row', gap: 12, marginVertical: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 260 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 2 }}>From Date</Text>
          <DobDropdownPicker value={dateStart} onChange={setDateStart} />
        </View>
        <View style={{ flex: 1, minWidth: 260 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 2 }}>To Date</Text>
          <DobDropdownPicker value={dateEnd} onChange={setDateEnd} />
        </View>

      </View>

      <Text style={styles.label}>Patient Scheme Category</Text>
      <View style={styles.schemeFilterRow}>
        {[
          { key: 'all', label: 'All', activeColor: '#10b981' },
          { key: 'pmjay', label: 'PMJAY', activeColor: '#f97316' },
          { key: 'others', label: 'OTHERS', activeColor: '#3b82f6' }
        ].map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.schemeFilterButton,
              pmjay === opt.key && { backgroundColor: opt.activeColor, borderColor: opt.activeColor }
            ]}
            onPress={() => setFilters({ pmjay: opt.key, page: 1 })}
          >
            <Text style={[
              styles.schemeFilterText,
              pmjay === opt.key && { color: '#ffffff', fontWeight: '800' }
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, { width: 40 }]}>Sr Num</Text>
        <Text style={[styles.tableHeaderText, { flex: 2 }]}>Name</Text>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}>Age</Text>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}>Gender</Text>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}>PMJAY Status</Text>
        <View style={{ width: 38 }} />
      </View>

      {(loading || loadingEvents) && displayedPatients.length === 0 ? (
        <SkeletonList />
      ) : (
        <FlatList
          data={displayedPatients}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 88 }}
          renderItem={({ item, index }) => {
            const age = calculateAge(item.dateOfBirth);
            const genderStr = item.gender ? item.gender.toLowerCase() : '';
            const capitalizedGender = genderStr.charAt(0).toUpperCase() + genderStr.slice(1);
            const hasPmjay = !!item.pmjayNumber;
            const srNum = index + 1;

            return (
              <TouchableOpacity 
                style={styles.patientTableRow}
                onPress={() => navigation.navigate('PatientDetail', { id: item.id })}
                activeOpacity={0.8}
              >
                <Text style={[styles.tableCellText, { width: 40 }]}>{srNum}</Text>
                <Text style={[styles.tableCellText, { flex: 2 }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.tableCellText, { flex: 1 }]}>{age}</Text>
                <Text style={[styles.tableCellText, { flex: 1 }]}>{capitalizedGender}</Text>
                <View style={[{ flex: 1, alignItems: 'flex-start' }]}>
                  <View style={[styles.statusBadge, hasPmjay ? styles.statusBadgeYes : styles.statusBadgeNo]}>
                    <Text style={[styles.statusBadgeText, { color: hasPmjay ? theme.colors.success : theme.colors.danger }]}>
                      {hasPmjay ? 'Yes' : 'No'}
                    </Text>
                  </View>
                </View>
                <View style={{ width: 38, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={styles.cardAction}>➔</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>No patient records found.</Text>}
        />
      )}
      
      <View style={styles.pagination}>
        <TouchableOpacity onPress={handlePrevPage} disabled={page === 1} style={styles.pageButton}>
          <Text style={styles.pageButtonText}>Prev</Text>
        </TouchableOpacity>
        <Text style={theme.typography.body}>Page {page} of {Math.ceil(total / limit) || 1}</Text>
        <TouchableOpacity onPress={handleNextPage} disabled={page * limit >= total} style={styles.pageButton}>
          <Text style={styles.pageButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
      
    </View>
  );
}

export function PatientDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { patients, deletePatient } = usePatientsStore();
  const patient = patients.find(p => p.id === id);

  const { estimates, fetchEstimates } = useEstimatesStore();
  const [patientEvents, setPatientEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    fetchEstimates();
    loadPatientEvents();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchEstimates();
      loadPatientEvents();
    });
    return unsubscribe;
  }, [navigation, id]);

  const loadPatientEvents = async () => {
    setLoadingEvents(true);
    try {
      const data = await api.get('/calendar?limit=200');
      const allEvents = data.events || [];
      const filtered = allEvents.filter(e => e.patientId === id || e.patient?.id === id);
      filtered.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      setPatientEvents(filtered);
    } catch (err) {
      console.log('Error loading patient events:', err.message);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleDeleteEvent = (eventId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this scheduled event?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/calendar/${eventId}`);
              loadPatientEvents();
              Alert.alert('Success', 'Event deleted successfully.');
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete event.');
            }
          }
        }
      ]
    );
  };

  if (!patient) return null;

  const handleDelete = () => {
    Alert.alert('Delete Patient', 'Are you sure you want to delete this patient?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          await deletePatient(id);
          navigation.goBack();
        }}
    ]);
  };

  const nameParts = patient.name ? patient.name.trim().split(/\s+/) : [];
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '—';
  const formattedDob = formatDateToDisplay(patient.dateOfBirth);
  const { notes, aadhaar } = parsePatientNotes(patient.notes);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, position: 'relative', zIndex: 1000 }}>
        <Text style={theme.typography.title}>{patient.name}</Text>
        <View style={{ position: 'relative' }}>
          <TouchableOpacity 
            style={{ 
              paddingHorizontal: 12, 
              paddingVertical: 6, 
              borderRadius: 8, 
              backgroundColor: 'rgba(255,255,255,0.04)', 
              borderWidth: 1, 
              borderColor: theme.colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 36,
              minHeight: 36
            }}
            onPress={() => setShowMenu(!showMenu)}
          >
            <Text style={{ fontSize: 18, color: theme.colors.text, fontWeight: 'bold' }}>⋮</Text>
          </TouchableOpacity>
          {showMenu && (
            <View style={{
              position: 'absolute',
              right: 0,
              top: 40,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: 8,
              width: 140,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 8,
              zIndex: 1001
            }}>
              <TouchableOpacity 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  padding: 12, 
                  borderBottomWidth: 1, 
                  borderBottomColor: theme.colors.border
                }}
                onPress={() => { setShowMenu(false); navigation.navigate('PatientForm', { id }); }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }}>✏️  Edit Patient</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  padding: 12
                }}
                onPress={() => { setShowMenu(false); handleDelete(); }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.danger }}>🗑️  Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      <View style={styles.detailCard}>
        <Text style={styles.detailLabel}>First Name: <Text style={styles.detailValue}>{firstName}</Text></Text>
        <Text style={styles.detailLabel}>Last Name: <Text style={styles.detailValue}>{lastName}</Text></Text>
        <Text style={styles.detailLabel}>UHID: <Text style={styles.detailValue}>{patient.uhid}</Text></Text>
        <Text style={styles.detailLabel}>Gender: <Text style={styles.detailValue}>{patient.gender}</Text></Text>
        <Text style={styles.detailLabel}>Date of Birth: <Text style={styles.detailValue}>{formattedDob}</Text></Text>
        <Text style={styles.detailLabel}>Mobile: <Text style={styles.detailValue}>{patient.mobile}</Text></Text>
        {patient.pmjayNumber ? (
          <Text style={styles.detailLabel}>PMJAY Card Number: <Text style={[styles.detailValue, { color: theme.colors.primaryLight }]}>{patient.pmjayNumber}</Text></Text>
        ) : null}
        {aadhaar ? (
          <Text style={styles.detailLabel}>Aadhaar Number: <Text style={styles.detailValue}>{aadhaar}</Text></Text>
        ) : null}
        <Text style={styles.detailLabel}>Address: <Text style={styles.detailValue}>{patient.address || 'N/A'}</Text></Text>

        {patient.consultingDoctor ? (
          <Text style={styles.detailLabel}>Consulting Doctor: <Text style={[styles.detailValue, { color: theme.colors.primaryLight }]}>Dr. {patient.consultingDoctor.firstName} {patient.consultingDoctor.lastName}</Text></Text>
        ) : (
          <Text style={styles.detailLabel}>Consulting Doctor: <Text style={styles.detailValue}>N/A</Text></Text>
        )}
      </View>

      <Text style={[theme.typography.title, { fontSize: 16, marginTop: theme.spacing.lg, marginBottom: 8 }]}>Associated Booking Events</Text>
      {loadingEvents ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : patientEvents.length === 0 ? (
        <View style={styles.eventCard}>
          <View style={{ flex: 1 }}>
            <Text style={theme.typography.body}>No surgery or OPD bookings found for this patient.</Text>
            <TouchableOpacity 
              style={[styles.createEventBtn, { marginTop: 10 }]} 
              onPress={() => navigation.navigate('CalendarEventForm', { id: null, patientId: id, redirectToEstimate: false })}
            >
              <Text style={styles.createEventBtnText}>📅 Schedule Surgery / Event</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        patientEvents.map((event, index) => {
          const linkedEstimate = estimates.find(est => est.eventId === event.id);
          const isApproved = linkedEstimate && (linkedEstimate.status === 'APPROVED' || linkedEstimate.status === 'LOCKED');
          const shortId = event.id.split('-')[0].toUpperCase();
          
          let surgeryNames = 'N/A';
          if (isApproved && linkedEstimate.estimateSurgeries && linkedEstimate.estimateSurgeries.length > 0) {
            surgeryNames = linkedEstimate.estimateSurgeries.map(s => s.surgery?.surgeryName || s.surgeryName || 'Unknown Procedure').join(', ');
          }

          const scheduledDate = new Date(event.startTime);
          const formattedDate = scheduledDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
          const formattedTime = scheduledDate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });

          return (
            <View key={event.id} style={styles.eventCard}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.eventTitle}>{index + 1}. {event.title}</Text>
                
                {isApproved ? (
                  <View style={{ backgroundColor: 'rgba(52, 211, 153, 0.08)', padding: 8, borderRadius: 6, marginVertical: 6, borderWidth: 1, borderColor: 'rgba(52, 211, 153, 0.3)' }}>
                    <Text style={{ fontWeight: '800', color: theme.colors.text, fontSize: 13, marginBottom: 4 }}>🏥 Surgery Details</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.text }}>
                      <Text style={{ fontWeight: '700' }}>Procedure:</Text> {surgeryNames}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.colors.text, marginTop: 2 }}>
                      <Text style={{ fontWeight: '700' }}>Date & Time:</Text> {formattedDate} at {formattedTime}
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={theme.typography.caption}>Scheduled: {new Date(event.startTime).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</Text>
                    <Text style={theme.typography.caption}>Status: {event.eventStatus}</Text>
                  </>
                )}

                <Text style={theme.typography.caption}>ID: {shortId}</Text>
                {linkedEstimate && (
                  <Text style={[theme.typography.caption, { color: theme.colors.success, fontWeight: '700', marginTop: 4 }]}>
                    ✅ Linked Estimate: {linkedEstimate.estimateNumber} ({linkedEstimate.status})
                  </Text>
                )}
              </View>
              <View style={{ gap: 6 }}>
                {linkedEstimate ? (
                  <TouchableOpacity 
                    style={[styles.eventActionBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={() => navigation.navigate('EstimateDetail', { id: linkedEstimate.id })}
                  >
                    <Text style={styles.eventActionBtnText}>View Estimate</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.eventActionBtn, { backgroundColor: theme.colors.success }]}
                    onPress={() => navigation.navigate('EstimateForm', { id: null, eventId: event.id })}
                  >
                    <Text style={styles.eventActionBtnText}>➕ Create Estimate</Text>
                  </TouchableOpacity>
                )}
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity 
                    style={[styles.eventActionBtn, { flex: 1, backgroundColor: theme.colors.warning }]}
                    onPress={() => navigation.navigate('CalendarEventForm', { id: event.id })}
                  >
                    <Text style={[styles.eventActionBtnText, { color: '#000000' }]}>📅 Reschedule</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.eventActionBtn, { paddingHorizontal: 12, backgroundColor: theme.colors.error }]}
                    onPress={() => handleDeleteEvent(event.id)}
                  >
                    <Text style={styles.eventActionBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })
      )}

      {patientEvents.length > 0 && (
        <TouchableOpacity 
          style={styles.createEventBtn} 
          onPress={() => navigation.navigate('CalendarEventForm', { id: null, patientId: id, redirectToEstimate: false })}
        >
          <Text style={styles.createEventBtnText}>📅 Schedule New Event</Text>
        </TouchableOpacity>
      )}

    </ScrollView>
  );
}

export function PatientFormScreen({ route, navigation }) {
  const { id } = route.params;
  const { patients, createPatient, updatePatient } = usePatientsStore();
  const existing = patients.find(p => p.id === id) || {};

  const existingNameParts = existing.name ? existing.name.trim().split(/\s+/) : [];
  const existingFirstName = existingNameParts[0] || '';
  const existingLastName = existingNameParts.slice(1).join(' ') || '';

  const { notes: existingNotes, aadhaar: existingAadhaar } = parsePatientNotes(existing.notes);

  const [firstName, setFirstName] = useState(existingFirstName);
  const [lastName, setLastName] = useState(existingLastName);
  const [mobile, setMobile] = useState(existing.mobile || '');
  const [gender, setGender] = useState(existing.gender || 'MALE');
  const [dob, setDob] = useState(existing.dateOfBirth ? new Date(existing.dateOfBirth).toISOString().split('T')[0] : '');
  const [isPmjay, setIsPmjay] = useState(!!existing.pmjayNumber);
  const [pmjayNumber, setPmjayNumber] = useState(existing.pmjayNumber || '');
  const [aadhaar, setAadhaar] = useState(existingAadhaar);
  const [address, setAddress] = useState(existing.address || '');
  const [referringDoctor, setReferringDoctor] = useState(existing.referringDoctor || '');
  const [notes, setNotes] = useState(existingNotes);
  const [consultingDoctorId, setConsultingDoctorId] = useState(existing.consultingDoctorId || null);
  const [doctorsList, setDoctorsList] = useState([]);
  const [saving, setSaving] = useState(false);

  // Fetch active doctors for dropdown
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const data = await api.get('/doctors?limit=200');
        const doctors = (data.doctors || data || []).map(d => ({
          value: d.id,
          label: d.specialty ? `Dr. ${d.firstName} ${d.lastName} (${d.specialty})` : `Dr. ${d.firstName} ${d.lastName}`
        }));
        // Alphabetical sort
        doctors.sort((a, b) => a.label.localeCompare(b.label));
        setDoctorsList(doctors);
      } catch (err) {
        console.log('Error fetching doctors:', err.message);
      }
    };
    fetchDoctors();
  }, []);

  const handleSave = async () => {
    if (!firstName.trim()) return Alert.alert('Validation Error', 'First name is required.');
    if (!lastName.trim()) return Alert.alert('Validation Error', 'Last name is required.');
    if (!mobile.trim()) return Alert.alert('Validation Error', 'Mobile number is required.');
    if (!dob.trim()) return Alert.alert('Validation Error', 'Date of Birth is required.');
    
    // Future date validation
    if (new Date(dob) > new Date()) {
      return Alert.alert('Validation Error', 'Date of Birth cannot be in the future.');
    }

    if (isPmjay) {
      if (!pmjayNumber.trim() && !aadhaar.trim()) {
        return Alert.alert('Validation Error', 'PMJAY Card Number or Aadhaar Number is required for PMJAY scheme patient.');
      }
    }

    setSaving(true);
    try {
      const payload = { 
        name: `${firstName.trim()} ${lastName.trim()}`, 
        mobile: mobile.trim(), 
        gender, 
        dateOfBirth: dob,
        pmjayNumber: isPmjay ? pmjayNumber.trim() : null,
        address: address.trim() || null,
        referringDoctor: referringDoctor.trim() || null,
        notes: serializePatientNotes(notes, aadhaar),
        consultingDoctorId: consultingDoctorId || null
      };
      
      if (id) {
        await updatePatient(id, payload);
        navigation.goBack();
      } else {
        const newPatient = await createPatient(payload);
        Alert.alert(
          'Registration Successful',
          'Patient registered successfully. What would you like to do next?',
          [
            { 
              text: 'Go to Dashboard', 
              onPress: () => navigation.navigate('Dashboard'),
              style: 'cancel'
            },
            { 
              text: 'Schedule Surgery', 
              onPress: () => navigation.navigate('CalendarEventForm', { id: null, patientId: newPatient?.id, redirectToEstimate: false })
            }
          ]
        );
      }
    } catch (err) {
      Alert.alert('Save Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const calculatedAge = dob ? calculateAge(dob) : '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      <Text style={theme.typography.title}>{id ? 'Edit Patient Details' : 'New Patient Registration'}</Text>
      
      <View style={styles.form}>
        
        {/* First Name - full row, no label */}
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First Name"
          placeholderTextColor={theme.colors.textMuted}
        />

        {/* Last Name - full row, no label */}
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Last Name"
          placeholderTextColor={theme.colors.textMuted}
        />

        {/* Gender + Mobile in same row */}
        <View style={[styles.formRow, { zIndex: 100 }]}>
          <View style={{ width: 130 }}>
            <Text style={styles.label}>Gender *</Text>
            <GenderDropdown value={gender} onChange={setGender} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Mobile Number *</Text>
            <TextInput
              style={styles.input}
              value={mobile}
              onChangeText={(val) => setMobile(val.replace(/\D/g, '').slice(0, 15))}
              keyboardType="phone-pad"
              placeholder="e.g. 9876543210"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        </View>

        {/* Consulting Doctor Searchable Dropdown */}
        <View style={{ zIndex: 50 }}>
          <SearchableDropdown
            label="Consulting Doctor"
            items={doctorsList}
            selectedValue={consultingDoctorId}
            onSelect={setConsultingDoctorId}
            placeholder="Select Consulting Doctor..."
          />
        </View>

        {/* Date of Birth Picker */}
        <View style={{ marginVertical: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.label}>Date of Birth *</Text>
            {calculatedAge ? (
              <Text style={styles.ageBadge}>Age: {calculatedAge}</Text>
            ) : null}
          </View>
          <DobDropdownPicker value={dob} onChange={setDob} />
        </View>

        {/* PMJAY scheme toggle */}
        <Text style={styles.label}>PMJAY Scheme Patient? *</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginVertical: 4 }}>
          {[
            { key: false, label: 'No' },
            { key: true, label: 'Yes' }
          ].map(opt => (
            <TouchableOpacity
              key={opt.label}
              style={[styles.toggleButton, { flex: 1, paddingVertical: 7, minHeight: 34 }, isPmjay === opt.key && styles.toggleButtonActive]}
              onPress={() => setIsPmjay(opt.key)}
            >
              <Text style={[styles.toggleText, isPmjay === opt.key && { color: '#ffffff', fontWeight: '800' }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
          <View style={{ flex: 2 }} />
        </View>

        {/* Dynamic PMJAY Fields */}
        {isPmjay && (
          <View style={styles.pmjayContainer}>
            <Text style={styles.pmjayHeader}>💳 PMJAY / Ayushman Credentials</Text>
            <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginBottom: 8 }}>
              Please provide either the PMJAY Card Number OR the Aadhaar Card Number:
            </Text>

            <Text style={styles.label}>PMJAY Card Number</Text>
            <TextInput
              style={styles.input}
              value={pmjayNumber}
              onChangeText={setPmjayNumber}
              placeholder="e.g. ABHA-1234-5678-9012"
              placeholderTextColor={theme.colors.textMuted}
            />

            <Text style={styles.orDivider}>— OR —</Text>

            <Text style={styles.label}>Aadhaar Number</Text>
            <TextInput
              style={styles.input}
              value={aadhaar}
              onChangeText={(val) => setAadhaar(val.replace(/\D/g, '').slice(0, 12))}
              keyboardType="numeric"
              maxLength={12}
              placeholder="e.g. 123456789012"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        )}

        {/* Address (replaces Referring Doctor) */}
        <Text style={styles.label}>Address</Text>
        <TextInput
          style={[styles.input, { minHeight: 60 }]}
          value={address}
          onChangeText={setAddress}
          multiline
          placeholder="Enter patient address..."
          placeholderTextColor={theme.colors.textMuted}
        />

        {saving ? (
          <View style={styles.saveButton}>
            <ActivityIndicator size="small" color="#ffffff" />
          </View>
        ) : (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>{id ? 'Save Details' : 'Register Patient'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  searchInput: { backgroundColor: theme.colors.surface, color: theme.colors.text, padding: 8, borderRadius: 8, marginVertical: 4, borderWidth: 1, borderColor: theme.colors.border, fontSize: 14, minHeight: 36 },
  loader: { marginVertical: theme.spacing.xl },
  
  patientTableRow: {
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    // Add subtle shadow for more interactive feel
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tableCellText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    paddingRight: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
    marginTop: 12,
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    paddingRight: 6,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusBadgeYes: {
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
  },
  statusBadgeNo: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardActionWrapper: {
    width: 38,
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.03)',
  },
  cardAction: {
    color: theme.colors.primaryLight,
    fontWeight: '800',
    fontSize: 14,
  },

  emptyText: { color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing.xl },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.md },
  pageButton: { backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md, paddingVertical: 10, borderRadius: 8, minHeight: 44, justifyContent: 'center' },
  pageButtonText: { color: theme.colors.text, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: theme.colors.primary, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  fabText: { fontSize: 28, color: '#ffffff', fontWeight: 'bold', lineHeight: 30 },
  
  detailCard: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: 10, marginVertical: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  detailLabel: { color: theme.colors.textMuted, fontSize: 13, marginVertical: 6 },
  detailValue: { color: theme.colors.text, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: theme.spacing.md },
  editButton: { flex: 1, backgroundColor: theme.colors.primary, padding: theme.spacing.md, borderRadius: 8, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  deleteButton: { flex: 1, backgroundColor: theme.colors.danger, padding: theme.spacing.md, borderRadius: 8, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  actionButtonText: { color: '#ffffff', fontWeight: '700' },
  
  form: { marginVertical: theme.spacing.sm },
  formRow: { flexDirection: 'row', gap: 10, width: '100%' },
  formCol: { flex: 1 },
  label: { color: theme.colors.text, marginVertical: 2, fontWeight: '600', fontSize: 13 },
  input: { backgroundColor: theme.colors.surface, color: theme.colors.text, padding: theme.spacing.md, borderRadius: 8, borderColor: theme.colors.border, borderWidth: 1, marginVertical: theme.spacing.xs, minHeight: 44, fontSize: 14 },
  toggleRow: { flexDirection: 'row', gap: theme.spacing.sm, marginVertical: theme.spacing.xs },
  toggleButton: { flex: 1, backgroundColor: theme.colors.surface, padding: theme.spacing.sm, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, minHeight: 44, justifyContent: 'center' },
  toggleButtonActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  toggleText: { color: theme.colors.text, fontWeight: '600' },
  saveButton: { backgroundColor: theme.colors.success, padding: theme.spacing.md, borderRadius: 8, alignItems: 'center', marginVertical: theme.spacing.lg, minHeight: 48, justifyContent: 'center' },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  
  // Dynamic PMJAY section styles
  pmjayContainer: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
  },
  pmjayHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primaryLight,
    marginBottom: 4,
  },
  orDivider: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    marginVertical: 8,
    letterSpacing: 1,
  },
  ageBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primaryLight,
    backgroundColor: 'rgba(99,102,241,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },

  // Associated bookings custom styles
  eventCard: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, marginVertical: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  eventActionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, alignItems: 'center', justifyContent: 'center', minHeight: 38 },
  eventActionBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  createEventBtn: { backgroundColor: theme.colors.primaryLight, padding: theme.spacing.md, borderRadius: 8, alignItems: 'center', marginVertical: theme.spacing.sm, minHeight: 44, justifyContent: 'center' },
  createEventBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  schemeFilterRow: { flexDirection: 'row', gap: 6, marginVertical: 2 },
  schemeFilterButton: { flex: 1, backgroundColor: theme.colors.surface, paddingVertical: 6, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, minHeight: 32, justifyContent: 'center' },
  schemeFilterButtonActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  schemeFilterText: { color: theme.colors.text, fontWeight: '600', fontSize: 12 },
  schemeFilterTextActive: { color: '#ffffff', fontWeight: '700' }
});
