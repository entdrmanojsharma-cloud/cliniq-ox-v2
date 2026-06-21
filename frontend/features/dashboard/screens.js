import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ActivityIndicator, TouchableOpacity,
  ScrollView, Modal, Pressable, TextInput, RefreshControl, Alert, Platform
} from 'react-native';
import { useAuthStore } from '../auth/store';
import { useSettingsStore } from '../settings/store';
import { api } from '../../shared/utils/api';
import { theme } from '../../shared/styles/theme';
import { useResponsive } from '../../shared/hooks/useResponsive';
import { useThemeStore } from '../../shared/styles/themeHelper';
import { usePatientsStore } from '../patients/store';
import { useCalendarStore } from '../calendar/store';
import { useInvoicesStore } from '../invoices/store';
import { useReceiptsStore } from '../receipts/store';
import { getEventBands } from '../calendar/calendarColorHelper';

/* ─────────────────────────────────────────────────────────────
   Theme picker modal
───────────────────────────────────────────────────────────── */
const THEME_OPTIONS = [
  { key: 'dark',   icon: '🌑', label: 'Dark',   accent: '#6366f1', bg: '#0f172a', text: '#f8fafc' },
  { key: 'light',  icon: '☀️', label: 'Light',  accent: '#4f46e5', bg: '#f8fafc', text: '#0f172a' },
  { key: 'ocean',  icon: '🌊', label: 'Ocean',  accent: '#06b6d4', bg: '#082f49', text: '#f0f9ff' },
  { key: 'forest', icon: '🌿', label: 'Forest', accent: '#10b981', bg: '#022c22', text: '#ecfdf5' },
];

function ThemePickerModal({ visible, onClose }) {
  const { activeTheme, setTheme } = useThemeStore();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={mStyles.overlay} onPress={onClose}>
        <Pressable style={mStyles.sheet} onPress={e => e.stopPropagation()}>
          <Text style={mStyles.title}>🎨  Choose Theme</Text>
          <View style={mStyles.grid}>
            {THEME_OPTIONS.map(t => {
              const active = activeTheme === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[mStyles.tile, { backgroundColor: t.bg, borderColor: active ? t.accent : 'transparent', borderWidth: active ? 2.5 : 1 }]}
                  onPress={() => { setTheme(t.key); onClose(); }}
                  activeOpacity={0.8}
                >
                  <Text style={mStyles.tileIcon}>{t.icon}</Text>
                  <Text style={[mStyles.tileLabel, { color: t.text }]}>{t.label}</Text>
                  {active && (
                    <View style={[mStyles.check, { backgroundColor: t.accent }]}>
                      <Text style={mStyles.checkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={mStyles.closeBtn} onPress={onClose}>
            <Text style={mStyles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet:   { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: theme.colors.border },
  title:   { fontSize: 18, fontWeight: '800', color: theme.colors.text, marginBottom: 16, textAlign: 'center' },
  grid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  tile:    { width: '47%', borderRadius: 14, padding: 16, alignItems: 'center', gap: 6, position: 'relative', minHeight: 90, justifyContent: 'center' },
  tileIcon:  { fontSize: 28 },
  tileLabel: { fontSize: 13, fontWeight: '700' },
  check:     { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  closeBtn:     { backgroundColor: theme.colors.background, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  closeBtnText: { color: theme.colors.text, fontWeight: '600', fontSize: 14 },
});

/* ─────────────────────────────────────────────────────────────
   Staff Management Modal (Add / Edit / Delete)
───────────────────────────────────────────────────────────── */
function StaffModal({ visible, onClose, onSaved, editUser, token }) {
  const [username,    setUsername]    = useState('');
  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [password,    setPassword]    = useState('');
  const [role,        setRole]        = useState('DOCTOR');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const { profile }                   = useSettingsStore();

  const isEdit = !!editUser;

  useEffect(() => {
    if (editUser) {
      setRole(editUser.role);
      setFirstName(editUser.firstName || '');
      setLastName(editUser.lastName || '');
      setPassword('');
      setError('');
    } else {
      setUsername(''); setFirstName(''); setLastName(''); setPassword(''); setRole('DOCTOR'); setError('');
    }
  }, [editUser, visible]);

  const getBaseUrl = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.location) return `http://${window.location.hostname}:3000/api/v1`;
      return 'http://localhost:3000/api/v1';
    }
    return 'http://192.168.0.124:3000/api/v1';
  };

  const handleSave = async () => {
    setError('');
    if (!isEdit && !username.trim()) return setError('Username is required.');
    if (!firstName.trim()) return setError('First Name is required.');
    if (!isEdit && password.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      if (isEdit) {
        const body = { role, firstName: firstName.trim(), lastName: lastName.trim() };
        if (password.trim()) body.newPassword = password;
        const res = await fetch(`${getBaseUrl()}/auth/staff/${editUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body)
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Update failed');
      } else {
        // Use existing signup — pass hospital code from profile
        await api.post('/auth/signup', { hospitalCode: profile?.code || 'CLKOX', username: username.trim(), password, role, firstName: firstName.trim(), lastName: lastName.trim() });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={staffModalStyles.overlay} onPress={onClose}>
        <Pressable style={staffModalStyles.card} onPress={e => e.stopPropagation()}>
          <Text style={staffModalStyles.title}>{isEdit ? '✏️ Edit Staff' : '➕ Add Staff'}</Text>

          {error ? (
            <View style={staffModalStyles.errorBox}>
              <Text style={staffModalStyles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {!isEdit && (
            <>
              <Text style={staffModalStyles.label}>Username *</Text>
              <TextInput
                style={staffModalStyles.input}
                placeholder="e.g. dr_sharma"
                placeholderTextColor="#64748b"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </>
          )}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={staffModalStyles.label}>First Name *</Text>
              <TextInput
                style={staffModalStyles.input}
                placeholder="e.g. Priya"
                placeholderTextColor="#64748b"
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={staffModalStyles.label}>Last Name</Text>
              <TextInput
                style={staffModalStyles.input}
                placeholder="e.g. Sharma"
                placeholderTextColor="#64748b"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>

          {isEdit && (
            <View style={staffModalStyles.infoBox}>
              <Text style={staffModalStyles.infoText}>
                User: <Text style={{ color: theme.colors.text, fontWeight: '800' }}>{editUser?.username}</Text>
              </Text>
            </View>
          )}

          <Text style={staffModalStyles.label}>{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</Text>
          <TextInput
            style={staffModalStyles.input}
            placeholder="••••••••"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={staffModalStyles.label}>Role *</Text>
          <View style={staffModalStyles.roleRow}>
            {['ADMIN', 'DOCTOR', 'RECEPTIONIST'].map(r => (
              <TouchableOpacity
                key={r}
                style={[staffModalStyles.roleBtn, role === r && staffModalStyles.roleBtnActive]}
                onPress={() => setRole(r)}
              >
                <Text style={[staffModalStyles.roleBtnText, role === r && { color: '#fff' }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 16 }} />
          ) : (
            <View style={staffModalStyles.btnRow}>
              <TouchableOpacity style={staffModalStyles.cancelBtn} onPress={onClose}>
                <Text style={staffModalStyles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={staffModalStyles.saveBtn} onPress={handleSave}>
                <Text style={staffModalStyles.saveBtnText}>{isEdit ? 'Save Changes' : 'Create Staff'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const staffModalStyles = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card:     { width: '100%', maxWidth: 440, backgroundColor: theme.colors.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: theme.colors.border },
  title:    { fontSize: 20, fontWeight: '800', color: theme.colors.primary, marginBottom: 16, textAlign: 'center' },
  label:    { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 4, marginTop: 10 },
  input:    { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, padding: 12, color: theme.colors.text, fontSize: 14 },
  infoBox:  { backgroundColor: theme.colors.background, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: theme.colors.border, marginTop: 4 },
  infoText: { fontSize: 13, color: theme.colors.textMuted },
  roleRow:  { flexDirection: 'row', gap: 8, marginTop: 4 },
  roleBtn:  { flex: 1, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  roleBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  roleBtnText:   { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted },
  errorBox:  { backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 10, padding: 10, marginBottom: 6 },
  errorText: { color: '#fca5a5', fontSize: 13, fontWeight: '600' },
  btnRow:     { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn:  { flex: 1, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, padding: 12, alignItems: 'center' },
  cancelBtnText: { color: theme.colors.textMuted, fontWeight: '700', fontSize: 13 },
  saveBtn:    { flex: 2, backgroundColor: theme.colors.primary, borderRadius: 10, padding: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});

/* ─────────────────────────────────────────────────────────────
   Calendar & Date Helper Functions
───────────────────────────────────────────────────────────── */
const generateMonthDays = (year, month) => {
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();
  
  const days = [];
  
  // Previous month days (greyed out)
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    days.push({
      day: prevMonthTotalDays - i,
      month: month === 0 ? 11 : month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false,
    });
  }
  
  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    days.push({
      day: i,
      month: month,
      year: year,
      isCurrentMonth: true,
    });
  }
  
  // Next month days (greyed out to fill grid)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      day: i,
      month: month === 11 ? 0 : month + 1,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false,
    });
  }
  
  return days;
};

const isDateInRange = (cellDateStr, fromStr, toStr) => {
  if (!fromStr || !toStr) return false;
  return cellDateStr > fromStr && cellDateStr < toStr;
};

const formatDateString = (dateObjOrStr) => {
  if (!dateObjOrStr) return '';
  const date = new Date(dateObjOrStr);
  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const formatPeriodDate = (dateStr) => {
  if (!dateStr || dateStr === '—') return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  return `${months[monthIdx]} ${day}`;
};

const getDateRange = (type, range) => {
  const today = new Date();
  let fromDate = new Date(today);
  let toDate = new Date(today);

  switch (type) {
    case 'today':
      break;
    case 'week':
      fromDate.setDate(today.getDate() - 7);
      break;
    case 'month':
      fromDate.setDate(today.getDate() - 30);
      break;
    case 'year':
      fromDate.setDate(today.getDate() - 365);
      break;
    case 'custom':
      if (range && range.from && range.to) {
        return { from: range.from, to: range.to };
      }
      break;
  }

  const format = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    from: format(fromDate),
    to: format(toDate)
  };
};

/* ─────────────────────────────────────────────────────────────
   DropdownFilterModal Component
───────────────────────────────────────────────────────────── */
function DropdownFilterModal({ visible, onClose, selectedValue, onSelect }) {
  const options = [
    { key: 'today', label: 'Today', icon: '📅' },
    { key: 'week', label: 'Last 7 Days', icon: '🗓️' },
    { key: 'month', label: 'Last Month', icon: '📊' },
    { key: 'year', label: 'Last Year', icon: '⏳' },
    { key: 'custom', label: 'Custom Range...', icon: '⚙️' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={dStyles.overlay} onPress={onClose}>
        <Pressable style={dStyles.sheet} onPress={e => e.stopPropagation()}>
          <Text style={dStyles.title}>📅 Select Date Range</Text>
          <View style={dStyles.optionsList}>
            {options.map(opt => {
              const active = selectedValue === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[dStyles.optionItem, active && dStyles.optionItemActive]}
                  onPress={() => {
                    onSelect(opt.key);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={dStyles.optionIcon}>{opt.icon}</Text>
                  <Text style={[dStyles.optionLabel, active && dStyles.optionLabelActive]}>{opt.label}</Text>
                  {active && <Text style={dStyles.checkMark}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={dStyles.closeBtn} onPress={onClose}>
            <Text style={dStyles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const dStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, borderWidth: 1, borderColor: theme.colors.border },
  title: { fontSize: 18, fontWeight: '800', color: theme.colors.text, marginBottom: 18, textAlign: 'center' },
  optionsList: { gap: 8, marginBottom: 16 },
  optionItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border },
  optionItemActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '10' },
  optionIcon: { fontSize: 18, marginRight: 12 },
  optionLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text, flex: 1 },
  optionLabelActive: { color: theme.colors.primary, fontWeight: '700' },
  checkMark: { fontSize: 16, color: theme.colors.primary, fontWeight: '800' },
  closeBtn: { marginTop: 8, backgroundColor: theme.colors.background, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  closeBtnText: { color: theme.colors.textMuted, fontWeight: '700', fontSize: 14 }
});

/* ─────────────────────────────────────────────────────────────
   CalendarRangePickerModal Component
───────────────────────────────────────────────────────────── */
function CalendarRangePickerModal({ visible, onClose, initialRange, onApply }) {
  const [activeTab, setActiveTab] = useState('from');
  const [tempFrom, setTempFrom] = useState('');
  const [tempTo, setTempTo] = useState('');
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  useEffect(() => {
    if (visible) {
      setTempFrom(initialRange?.from || '');
      setTempTo(initialRange?.to || '');
      setActiveTab('from');
      
      const defaultDate = initialRange?.from ? new Date(initialRange.from) : new Date();
      if (!isNaN(defaultDate.getTime())) {
        setViewYear(defaultDate.getFullYear());
        setViewMonth(defaultDate.getMonth());
      }
    }
  }, [visible, initialRange]);

  const monthsList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const handleDayPress = (cell) => {
    const formattedMonth = String(cell.month + 1).padStart(2, '0');
    const formattedDay = String(cell.day).padStart(2, '0');
    const dateStr = `${cell.year}-${formattedMonth}-${formattedDay}`;

    if (activeTab === 'from') {
      setTempFrom(dateStr);
      setActiveTab('to');
    } else {
      setTempTo(dateStr);
    }
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleApply = () => {
    if (!tempFrom || !tempTo) {
      Alert.alert('Incomplete Dates', 'Please select both start and end dates.');
      return;
    }
    if (tempFrom > tempTo) {
      Alert.alert('Invalid Date Range', 'Start date cannot be after end date.');
      return;
    }
    onApply({ from: tempFrom, to: tempTo });
    onClose();
  };

  const cells = generateMonthDays(viewYear, viewMonth);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={calStyles.overlay} onPress={onClose}>
        <Pressable style={calStyles.card} onPress={e => e.stopPropagation()}>
          <Text style={calStyles.title}>📅 Select Custom Period</Text>

          {/* From / To tabs */}
          <View style={calStyles.tabRow}>
            <TouchableOpacity
              style={[calStyles.tabButton, activeTab === 'from' && calStyles.tabButtonActive]}
              onPress={() => setActiveTab('from')}
            >
              <Text style={calStyles.tabLabel}>From</Text>
              <Text style={[calStyles.tabValue, activeTab === 'from' && calStyles.tabValueActive]}>
                {tempFrom ? formatDateString(tempFrom) : 'Select Start'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[calStyles.tabButton, activeTab === 'to' && calStyles.tabButtonActive]}
              onPress={() => setActiveTab('to')}
            >
              <Text style={calStyles.tabLabel}>To</Text>
              <Text style={[calStyles.tabValue, activeTab === 'to' && calStyles.tabValueActive]}>
                {tempTo ? formatDateString(tempTo) : 'Select End'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Month Navigation */}
          <View style={calStyles.monthHeader}>
            <TouchableOpacity style={calStyles.monthNavBtn} onPress={handlePrevMonth}>
              <Text style={calStyles.monthNavBtnText}>‹</Text>
            </TouchableOpacity>
            <Text style={calStyles.monthLabel}>{monthsList[viewMonth]} {viewYear}</Text>
            <TouchableOpacity style={calStyles.monthNavBtn} onPress={handleNextMonth}>
              <Text style={calStyles.monthNavBtnText}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Week Days Label */}
          <View style={calStyles.weekDaysRow}>
            {weekDays.map(d => (
              <Text key={d} style={calStyles.weekDayText}>{d}</Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={calStyles.grid}>
            {cells.map((cell, idx) => {
              const formattedMonth = String(cell.month + 1).padStart(2, '0');
              const formattedDay = String(cell.day).padStart(2, '0');
              const dateStr = `${cell.year}-${formattedMonth}-${formattedDay}`;

              const isFrom = tempFrom === dateStr;
              const isTo = tempTo === dateStr;
              const inRange = isDateInRange(dateStr, tempFrom, tempTo);

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    calStyles.dayCell,
                    isFrom && calStyles.dayCellSelectedFrom,
                    isTo && calStyles.dayCellSelectedTo,
                    inRange && calStyles.dayCellInRange,
                  ]}
                  onPress={() => handleDayPress(cell)}
                >
                  <Text
                    style={[
                      calStyles.dayCellText,
                      !cell.isCurrentMonth && calStyles.dayCellTextMuted,
                      (isFrom || isTo) && { color: '#fff', fontWeight: '800' },
                    ]}
                  >
                    {cell.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer Actions */}
          <View style={calStyles.footer}>
            <TouchableOpacity style={calStyles.cancelBtn} onPress={onClose}>
              <Text style={calStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={calStyles.applyBtn} onPress={handleApply}>
              <Text style={calStyles.applyBtnText}>Apply Period</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const calStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 20, width: '100%', maxWidth: 360, borderWidth: 1, borderColor: theme.colors.border },
  title: { fontSize: 16, fontWeight: '800', color: theme.colors.text, textAlign: 'center', marginBottom: 16 },
  tabRow: { flexDirection: 'row', backgroundColor: theme.colors.background, borderRadius: 12, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border },
  tabButton: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', borderRadius: 8 },
  tabButtonActive: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  tabLabel: { fontSize: 10, color: theme.colors.textMuted, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  tabValue: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '800' },
  tabValueActive: { color: theme.colors.primary },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  monthNavBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  monthNavBtnText: { color: theme.colors.text, fontSize: 16, fontWeight: '800' },
  monthLabel: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  weekDaysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  weekDayText: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 11, fontWeight: '700', color: theme.colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginVertical: 2, borderRadius: 8, position: 'relative' },
  dayCellText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  dayCellTextMuted: { color: 'rgba(255,255,255,0.2)' },
  dayCellSelectedFrom: { backgroundColor: theme.colors.primary },
  dayCellSelectedTo: { backgroundColor: theme.colors.accent || '#ec4899' },
  dayCellInRange: { backgroundColor: 'rgba(99,102,241,0.15)' },
  footer: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn: { flex: 1, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, padding: 12, alignItems: 'center' },
  cancelBtnText: { color: theme.colors.textMuted, fontWeight: '700', fontSize: 14 },
  applyBtn: { flex: 1.5, backgroundColor: theme.colors.primary, borderRadius: 10, padding: 12, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 }
});


/* ─────────────────────────────────────────────────────────────
   Module groups
───────────────────────────────────────────────────────────── */
const MODULE_GROUPS = [
  {
    group: '🏥 Clinical',
    items: [
      { title: 'Patients',         screen: 'PatientsList',  desc: 'Profiles & registrations',          color: '#6366f1', icon: '👤', hasPills: true },
      { title: 'Surgeries',        screen: 'SurgeriesList', desc: 'Surgical queues & bookings',         color: '#f59e0b', icon: '🔪' },
    ],
  },
  {
    group: '💰 Billing',
    items: [
      { title: 'Estimates',        screen: 'EstimatesList',   desc: 'Pre-admission financial plans',      color: '#ec4899', icon: '📋' },
      { title: 'Invoices',         screen: 'InvoicesList',    desc: 'Invoicing & ledger allocations',     color: '#3b82f6', icon: '💳' },
      { title: 'Receipts',         screen: 'ReceiptsList',    desc: 'Deposits & payments received',       color: '#06b6d4', icon: '📥' },
      { title: 'Refunds',          screen: 'RefundsList',     desc: 'Approve & record refunds',           color: '#ef4444', icon: '📤' },
      { title: 'Credit Notes',     screen: 'CreditNotesList', desc: 'Billing credits & adjustments',      color: '#8b5cf6', icon: '📝' },
      { title: 'Advance Balances', screen: 'AdvanceBalances', desc: 'Advance balance ledger',             color: '#f43f5e', icon: '💰' },
    ],
  },
  {
    group: '⚙️ Configuration',
    items: [
      { title: 'Estimate Templates', screen: 'TemplatesList',   desc: 'Pre-configured charge templates',    color: '#14b8a6', icon: '📄' },
      { title: 'Billing Defaults',   screen: 'BillingDefaults', desc: 'Default billing rates config',       color: '#f43f5e', icon: '💸' },
      { title: 'OT Rooms',           screen: 'OtRooms',         desc: 'Configure surgical theaters',        color: '#10b981', icon: '🚪' },
      { title: 'Ward Rooms',         screen: 'Rooms',           desc: 'Patient ward room definitions',      color: '#6366f1', icon: '🛏️' },
      { title: 'Hospital Charges',   screen: 'HospitalCharges', desc: 'Master charge configurations',       color: '#3b82f6', icon: '🏷️' },
      { title: 'Pending Changes',    screen: 'PendingCharges',  desc: 'Review requested amendments',        color: '#ef4444', icon: '⏳' },
      { title: 'Documents Hub',      screen: 'DocumentsList',   desc: 'Generated PDFs & summaries',         color: '#a855f7', icon: '🗂️' },
      { title: 'Hospital Profile',   screen: 'HospitalProfile', desc: 'Settings & clinic credentials',      color: '#94a3b8', icon: '🏢' },
    ],
  },
];

const ROLE_COLORS = { ADMIN: '#6366f1', DOCTOR: '#10b981', RECEPTIONIST: '#f59e0b' };
const ROLE_ICONS  = { ADMIN: '👑', DOCTOR: '🩺', RECEPTIONIST: '🗂️' };

/* ─────────────────────────────────────────────────────────────
   StatCard
───────────────────────────────────────────────────────────── */
function StatCard({ icon, label, count, totalValue, showValue, color, loading, isMobile, period }) {
  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <View style={[sStyles.card, { borderLeftColor: color }, isMobile ? { width: '48%', minWidth: '48%', flex: 0 } : { flex: 1 }]}>
      <View style={[sStyles.iconContainer, { backgroundColor: color + '15' }]}>
        <Text style={[sStyles.icon, { color }]}>{icon}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={sStyles.label} numberOfLines={1}>{label}</Text>
        {loading ? (
          <ActivityIndicator size="small" color={color} style={{ marginTop: 6, alignSelf: 'flex-start' }} />
        ) : (
          <View style={sStyles.valuesContainer}>
            <View style={sStyles.valueBlock}>
              <Text style={[sStyles.countValue, { color }]}>{count}</Text>
              <Text style={sStyles.subtext}>records</Text>
            </View>
            {showValue && (
              <View style={sStyles.valueBlock}>
                <Text style={sStyles.amountValue} numberOfLines={1}>{formatCurrency(totalValue)}</Text>
                <Text style={sStyles.subtext}>value</Text>
              </View>
            )}
          </View>
        )}
        {period && period.from !== '—' && (
          <View style={sStyles.periodRow}>
            <Text style={sStyles.periodText} numberOfLines={1}>
              ⏱️ {formatPeriodDate(period.from)} → {formatPeriodDate(period.to)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const sStyles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valuesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    marginBottom: 4,
  },
  valueBlock: {
    minWidth: 45,
  },
  countValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  subtext: {
    fontSize: 9,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  periodRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 6,
    marginTop: 6,
  },
  periodText: {
    fontSize: 9,
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
});

/* ─────────────────────────────────────────────────────────────
   ModuleCard
───────────────────────────────────────────────────────────── */
function ModuleCard({ item, navigation, isMobile }) {
  if (item.hasPills) {
    return (
      <View style={[styles.card, { width: '100%' }]}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}
          activeOpacity={0.7}
          onPress={() => navigation.navigate(item.screen, { initialPmjay: 'all' })}
        >
          <View style={[styles.cardIcon, { backgroundColor: item.color + '20' }]}>
            <Text style={{ fontSize: 20, color: item.color }}>{item.icon}</Text>
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDesc}>{item.desc}</Text>
          </View>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity style={[styles.pill, { backgroundColor: item.color }]}
            onPress={() => navigation.navigate(item.screen, { initialPmjay: 'pmjay' })}>
            <Text style={styles.pillText}>PMJAY</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.pill, styles.pillOutline]}
            onPress={() => navigation.navigate(item.screen, { initialPmjay: 'all' })}>
            <Text style={[styles.pillText, { color: theme.colors.text }]}>ALL</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  return (
    <TouchableOpacity
      style={[styles.card, isMobile ? { width: '100%' } : { width: '48%' }]}
      activeOpacity={0.7}
      onPress={() => navigation.navigate(item.screen)}
    >
      <View style={[styles.cardIcon, { backgroundColor: item.color + '20' }]}>
        <Text style={{ fontSize: 20, color: item.color }}>{item.icon}</Text>
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDesc}>{item.desc}</Text>
      </View>
    </TouchableOpacity>
  );
}

/* ─── Occurrence expansion helper ─── */
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

export function DashboardScreen({ navigation }) {
  const { role, logout, username, firstName, lastName } = useAuthStore();
  const { profile, fetchProfile } = useSettingsStore();

  const [refreshing, setRefreshing] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [statsLoading, setStatsLoading] = useState(true);

  // Metrics state
  const [metrics, setMetrics] = useState({
    totalPatients: 0,
    newPatientsThisMonth: 0,
    todayAppointmentsCount: 0,
    upcomingSurgeriesCount: 0,
    pendingInvoicesCount: 0,
    todayCollections: 0,
    pendingEstimatesCount: 0,
    monthlySurgeonFees: 0,
    monthlyAssistantSurgeonFees: 0
  });

  // Calendar View states
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [allEvents, setAllEvents] = useState([]);
  
  // Right panel clinical widget states
  const [recentPatients, setRecentPatients] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);

  // Live clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const date = now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
      const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      setCurrentDateTime(`${date} • ${time}`);
    };
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  // Initial loads
  useEffect(() => {
    fetchProfile();
    loadDashboardData();
  }, [currentDate]);

  const loadDashboardData = async () => {
    setStatsLoading(true);
    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      // Calculate calendar view range to load events
      let calStart, calEnd;
      if (viewMode === 'month') {
        calStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString();
        calEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0).toISOString();
      } else {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        calStart = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() - 7).toISOString();
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 21);
        calEnd = endOfWeek.toISOString();
      }

      const [
        patientsRes,
        monthStatsRes,
        todayStatsRes,
        calendarRes,
        invoicesRes,
        recentPatientsRes
      ] = await Promise.all([
        api.get('/patients?limit=1').catch(() => ({ meta: { total: 0 } })),
        api.get(`/dashboard/stats?from=${startOfMonth}&to=${endOfMonth}`).catch(() => ({ patients: { count: 0 } })),
        api.get(`/dashboard/stats?from=${todayStr}&to=${todayStr}`).catch(() => ({ receipts: { totalValue: 0 } })),
        api.get(`/calendar?startFrom=${calStart}&startTo=${calEnd}&limit=500`).catch(() => ({ events: [] })),
        api.get('/invoices?limit=100').catch(() => ({ invoices: [] })),
        api.get('/patients?limit=5').catch(() => ({ patients: [] }))
      ]);

      const events = calendarRes.events || [];
      
      // Calculate dashboard metrics
      const totalPatients = patientsRes.meta?.total || 0;
      const newPatientsThisMonth = monthStatsRes.patients?.count || 0;
      
      const todayEvents = events.filter(e => e.startTime.split('T')[0] === todayStr);
      const todayAppointmentsCount = todayEvents.length;
      
      const upcomingSurgeriesCount = events.filter(e => {
        const eDate = e.startTime.split('T')[0];
        return e.eventType === 'SURGERY' && eDate >= todayStr;
      }).length;

      const unfinalizedInvoices = (invoicesRes.invoices || []).filter(inv => inv.status === 'DRAFT' || inv.status === 'PENDING');
      const pendingInvoicesCount = unfinalizedInvoices.length;
      const todayCollections = todayStatsRes.receipts?.totalValue || 0;

      setMetrics({
        totalPatients,
        newPatientsThisMonth,
        todayAppointmentsCount,
        upcomingSurgeriesCount,
        pendingInvoicesCount,
        todayCollections,
        pendingEstimatesCount: monthStatsRes.estimates?.pendingCount || 0,
        monthlySurgeonFees: monthStatsRes.fees?.surgeon || 0,
        monthlyAssistantSurgeonFees: monthStatsRes.fees?.assistantSurgeon || 0
      });

      setAllEvents(events);
      setRecentPatients(recentPatientsRes.patients || []);

      // Build some actionable pending tasks
      const tasks = [];
      if (pendingInvoicesCount > 0) {
        tasks.push({ id: 'invoices', text: `${pendingInvoicesCount} invoices are pending finalization`, action: () => navigation.navigate('InvoicesList') });
      }
      if (role === 'ADMIN') {
        tasks.push({ id: 'charges', text: 'Review requested charge amendments', action: () => navigation.navigate('PendingCharges') });
      }
      const pendingEstCount = monthStatsRes.estimates?.pendingCount || 0;
      if (pendingEstCount > 0) {
        tasks.push({
          id: 'estimates_pending',
          text: `${pendingEstCount} estimate${pendingEstCount > 1 ? 's are' : ' is'} pending doctor approval`,
          action: () => {
            useEstimatesStore.getState().setFilters({ status: 'PENDING_APPROVAL', page: 1 });
            navigation.navigate('EstimatesList');
          }
        });
      }
      if (tasks.length === 0) {
        tasks.push({ id: 'none', text: 'All tasks completed! Have a great day.', action: null });
      }
      setPendingTasks(tasks);

    } catch (err) {
      console.warn('Error fetching dashboard EMR data:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), loadDashboardData()]);
    setRefreshing(false);
  };

  // Calendar event calculations
  const getExpandedEventsForRange = (startLimit, endLimit) => {
    return allEvents.flatMap(e => getFrontOccurrences(e, startLimit, endLimit));
  };

  // Generate Month View calendar elements
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthDays = generateMonthDays(year, month);
  const startLimit = new Date(year, month - 1, 20);
  const endLimit = new Date(year, month + 1, 10);
  const expandedEvents = getExpandedEventsForRange(startLimit, endLimit);

  // Generate Week View calendar elements
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  const weekEvents = getExpandedEventsForRange(startOfWeek, endOfWeek);

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  };
  const weekDaysList = getWeekDays();

  // KPI Card onPress Handlers
  const handlePatientsPress = () => {
    usePatientsStore.getState().setFilters({ search: '', page: 1, pmjay: 'all' });
    navigation.navigate('PatientsList', { reset: true });
  };

  const handleCalendarPress = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    useCalendarStore.getState().setSelectedDate(todayStr);
    useCalendarStore.getState().setWeekStartDate(todayStr);
    useCalendarStore.getState().fetchEvents();
    navigation.navigate('Calendar');
  };

  const handleInvoicesPress = () => {
    useInvoicesStore.getState().setFilters({ search: '', page: 1 });
    useInvoicesStore.getState().fetchInvoices();
    navigation.navigate('InvoicesList');
  };

  const handleCollectionsPress = () => {
    useReceiptsStore.getState().setFilters({ search: '', page: 1 });
    useReceiptsStore.getState().fetchReceipts();
    navigation.navigate('ReceiptsList');
  };

  // Navigation handlers
  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    setCurrentDate(d);
  };

  const selectedDateEvents = expandedEvents.filter(e => e.startTime.split('T')[0] === selectedDate);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = expandedEvents.filter(e => e.startTime.split('T')[0] === todayStr);
  const upcomingSurgeries = expandedEvents.filter(e => e.eventType === 'SURGERY' && e.startTime.split('T')[0] >= todayStr).slice(0, 5);

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  const getEventStyle = (type) => {
    const t = (type || '').trim().toUpperCase();
    switch (t) {
      case 'OPD':
        return { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#f87171' };
      case 'SURGERY':
        return { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', text: '#34d399' };
      default:
        return { bg: 'rgba(249, 115, 22, 0.15)', border: '#f97316', text: '#fb923c' };
    }
  };

  // Header display
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const viewHeaderLabel = viewMode === 'month' 
    ? `${months[month]} ${year}`
    : `W/C ${startOfWeek.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  const displayName = (firstName && lastName)
    ? `${firstName} ${lastName}`
    : firstName || lastName || (username || '').split('@')[0] || 'User';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
    >
      
      {/* Header Banner */}
      <View style={styles.headerBanner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hospitalName}>🏥 {profile?.name || 'Cliniq-OX Hospital'}</Text>
          <Text style={styles.greeting}>Good day, <Text style={styles.displayName}>{displayName}</Text></Text>
          <Text style={styles.clockText}>{currentDateTime}</Text>
        </View>
        <View style={styles.headerRightBadge}>
          <Text style={styles.roleText}>{role}</Text>
        </View>
      </View>

      {/* KPI Section */}
      <View style={styles.kpiRow}>
        <TouchableOpacity style={[styles.kpiCard, { borderLeftColor: '#6366f1' }]} activeOpacity={0.7} onPress={handlePatientsPress}>
          <Text style={styles.kpiLabel}>👤 Total Patients</Text>
          <Text style={styles.kpiValue}>{metrics.totalPatients.toLocaleString('en-IN')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.kpiCard, { borderLeftColor: '#ef4444' }]} activeOpacity={0.7} onPress={handleCalendarPress}>
          <Text style={styles.kpiLabel}>✂️ Upcoming Surgeries</Text>
          <Text style={styles.kpiValue}>{metrics.upcomingSurgeriesCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.kpiCard, { borderLeftColor: '#8b5cf6' }]}
          activeOpacity={0.7}
          onPress={() => {
            useEstimatesStore.getState().setFilters({ status: 'PENDING_APPROVAL', page: 1 });
            navigation.navigate('EstimatesList');
          }}
        >
          <Text style={styles.kpiLabel}>⏳ Pending Estimates</Text>
          <Text style={styles.kpiValue}>{metrics.pendingEstimatesCount}</Text>
        </TouchableOpacity>
      </View>

      {/* Main Grid View */}
      <View style={styles.dashboardGrid}>
        
        {/* Left/Center Column (70%): Calendar View */}
        <View style={styles.calendarColumn}>
          
          {/* Calendar Header with Controls */}
          <View style={styles.calendarControlsHeader}>
            <View style={styles.navControls}>
              <TouchableOpacity style={styles.btnNav} onPress={handlePrev}>
                <Text style={styles.btnNavText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.calendarPeriodLabel}>{viewHeaderLabel}</Text>
              <TouchableOpacity style={styles.btnNav} onPress={handleNext}>
                <Text style={styles.btnNavText}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnToday} onPress={handleToday}>
                <Text style={styles.btnTodayText}>Today</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.toggleRow}>
              <TouchableOpacity 
                style={[styles.toggleBtn, viewMode === 'month' && styles.toggleBtnActive]}
                onPress={() => setViewMode('month')}
              >
                <Text style={[styles.toggleText, viewMode === 'month' && styles.toggleTextActive]}>Month</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleBtn, viewMode === 'week' && styles.toggleBtnActive]}
                onPress={() => setViewMode('week')}
              >
                <Text style={[styles.toggleText, viewMode === 'week' && styles.toggleTextActive]}>Week</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Month View Grid */}
          {viewMode === 'month' && (
            <View style={styles.monthCalendarContainer}>
              {/* Day Labels */}
              <View style={styles.weekHeader}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <Text key={d} style={styles.dayHeaderCell}>{d}</Text>
                ))}
              </View>
              {/* Days Grid */}
              <View style={styles.daysGrid}>
                {monthDays.map((cell, idx) => {
                  const cellDateStr = `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
                  const isSelected = selectedDate === cellDateStr;
                  const isToday = cellDateStr === todayStr;
                  
                  // Filter events for this cell date
                  const cellEvents = expandedEvents.filter(e => e.startTime.split('T')[0] === cellDateStr);

                  return (
                    <TouchableOpacity 
                      key={idx} 
                      style={[
                        styles.dayCell, 
                        !cell.isCurrentMonth && styles.dayCellMuted,
                        isToday && styles.dayCellToday,
                        isSelected && styles.dayCellSelected
                      ]}
                      onPress={() => setSelectedDate(cellDateStr)}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.dayNumText, 
                        !cell.isCurrentMonth && styles.dayNumMuted,
                        isToday && styles.dayNumTodayText
                      ]}>{cell.day}</Text>

                      {/* Render event indicator pills */}
                      <View style={styles.eventsIndicatorContainer}>
                        {cellEvents.slice(0, 2).map((ev, evIdx) => {
                          const palette = getEventStyle(ev.eventType);
                          return (
                            <View key={evIdx} style={[styles.eventMiniPill, { backgroundColor: palette.bg, borderLeftColor: palette.border }]}>
                              <Text style={[styles.eventMiniPillText, { color: palette.text }]} numberOfLines={1}>
                                {ev.title}
                              </Text>
                            </View>
                          );
                        })}
                        {cellEvents.length > 2 && (
                          <Text style={styles.plusMoreText}>+{cellEvents.length - 2} more</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Week View Grid */}
          {viewMode === 'week' && (
            <View style={styles.weekCalendarContainer}>
              {weekDaysList.map((day, idx) => {
                const cellDateStr = day.toISOString().split('T')[0];
                const isSelected = selectedDate === cellDateStr;
                const isToday = cellDateStr === todayStr;
                
                const cellEvents = weekEvents.filter(e => e.startTime.split('T')[0] === cellDateStr);

                return (
                  <TouchableOpacity 
                    key={idx} 
                    style={[
                      styles.weekDayColumn,
                      isToday && styles.weekDayColumnToday,
                      isSelected && styles.weekDayColumnSelected
                    ]}
                    onPress={() => setSelectedDate(cellDateStr)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.weekColumnHeader}>
                      <Text style={[styles.weekDayLabel, isToday && styles.weekDayTodayText]}>
                        {day.toLocaleDateString('en-IN', { weekday: 'short' })}
                      </Text>
                      <Text style={[styles.weekDayNum, isToday && styles.weekDayNumToday]}>
                        {day.getDate()}
                      </Text>
                    </View>

                    <ScrollView style={styles.weekEventsScroll}>
                      {cellEvents.map((ev, evIdx) => {
                        const [upperColor, middleColor, lowerColor] = getEventBands(ev.eventType);
                        return (
                          <View key={evIdx} style={styles.weekEventCard}>
                            {/* 3-Band Background Zoning */}
                            <View style={styles.cardBackgroundContainer}>
                              <View style={[styles.cardBand, { backgroundColor: upperColor }]} />
                              <View style={[styles.cardBand, { backgroundColor: middleColor }]} />
                              <View style={[styles.cardBand, { backgroundColor: lowerColor }]} />
                            </View>
                            {/* Inner Content Layer */}
                            <View style={styles.weekEventContent}>
                              <Text style={styles.weekEventTime}>{formatTime(ev.startTime)}</Text>
                              <Text style={styles.weekEventTitle} numberOfLines={1}>{ev.title}</Text>
                              <Text style={styles.weekEventMeta}>{ev.eventType}</Text>
                            </View>
                          </View>
                        );
                      })}
                      {cellEvents.length === 0 && (
                        <Text style={styles.emptyWeekText}>No events</Text>
                      )}
                    </ScrollView>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Right Column (30%): Info Panel */}
        <View style={styles.infoColumn}>
          
          {/* Date Event Panel */}
          <View style={styles.widgetCard}>
            <Text style={styles.widgetTitle}>📅 Events on {formatDateString(selectedDate)}</Text>
            
            {/* Widget Legend */}
            <View style={styles.widgetLegendBar}>
              <View style={styles.widgetLegendItem}>
                <Text style={[styles.legendColorBox, { color: '#ef4444' }]}>■</Text>
                <Text style={styles.widgetLegendLabel}>OPD</Text>
              </View>
              <View style={styles.widgetLegendItem}>
                <Text style={[styles.legendColorBox, { color: '#10b981' }]}>■</Text>
                <Text style={styles.widgetLegendLabel}>Surgery</Text>
              </View>
              <View style={styles.widgetLegendItem}>
                <Text style={[styles.legendColorBox, { color: '#f97316' }]}>■</Text>
                <Text style={styles.widgetLegendLabel}>Other</Text>
              </View>
            </View>

            {selectedDateEvents.map((ev, idx) => {
              const [upperColor, middleColor, lowerColor] = getEventBands(ev.eventType);
              return (
                <TouchableOpacity 
                  key={idx} 
                  style={styles.detailedEventRow}
                  onPress={() => navigation.navigate('CalendarEventDetail', { id: ev.id })}
                >
                  {/* 3-Band Background Zoning */}
                  <View style={styles.cardBackgroundContainer}>
                    <View style={[styles.cardBand, { backgroundColor: upperColor }]} />
                    <View style={[styles.cardBand, { backgroundColor: middleColor }]} />
                    <View style={[styles.cardBand, { backgroundColor: lowerColor }]} />
                  </View>

                  {/* Inner Content Layer */}
                  <View style={styles.detailedEventRowContent}>
                    <View style={styles.eventRowHeader}>
                      <Text style={styles.eventRowTime}>{formatTime(ev.startTime)} ({ev.durationMinutes || 0}m)</Text>
                      <View style={[
                        styles.dashboardCategoryTag,
                        ev.eventType === 'SURGERY' ? styles.tagSurgery :
                        ev.eventType === 'OPD' ? styles.tagOpd : styles.tagOther
                      ]}>
                        <Text style={[
                          ev.eventType === 'SURGERY' ? styles.categoryTagTextSurgery :
                          ev.eventType === 'OPD' ? styles.categoryTagTextOpd : styles.categoryTagTextOther
                        ]}>
                          {ev.eventType}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.eventRowTitle}>{ev.title}</Text>
                    {ev.patient && <Text style={styles.eventRowPatient}>👤 Patient: {ev.patient.name}</Text>}
                    {ev.doctor && <Text style={styles.eventRowDoctor}>🩺 Doctor: Dr. {ev.doctor.firstName} {ev.doctor.lastName}</Text>}
                    {ev.location && <Text style={styles.eventRowMeta}>📍 {ev.location}</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
            {selectedDateEvents.length === 0 && (
              <Text style={styles.emptyWidgetText}>No appointments scheduled.</Text>
            )}
          </View>

          {/* Today's Schedule */}
          <View style={styles.widgetCard}>
            <Text style={styles.widgetTitle}>🗓️ Today's Schedule</Text>
            {todayEvents.slice(0, 4).map((ev, idx) => (
              <View key={idx} style={styles.compactWidgetRow}>
                <Text style={styles.compactTime}>{formatTime(ev.startTime)}</Text>
                <Text style={styles.compactText} numberOfLines={1}>{ev.title}</Text>
              </View>
            ))}
            {todayEvents.length === 0 && (
              <Text style={styles.emptyWidgetText}>No events scheduled today.</Text>
            )}
          </View>

          {/* Upcoming Surgeries */}
          <View style={styles.widgetCard}>
            <Text style={styles.widgetTitle}>🩺 Upcoming Surgeries</Text>
            {upcomingSurgeries.map((ev, idx) => (
              <View key={idx} style={styles.compactWidgetRow}>
                <Text style={styles.compactTime}>{new Date(ev.startTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
                <Text style={styles.compactText} numberOfLines={1}>{ev.title}</Text>
              </View>
            ))}
            {upcomingSurgeries.length === 0 && (
              <Text style={styles.emptyWidgetText}>No upcoming surgeries.</Text>
            )}
          </View>

          {/* Recent Patients */}
          <View style={styles.widgetCard}>
            <Text style={styles.widgetTitle}>👥 Recent Patients</Text>
            {recentPatients.map((p, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={styles.compactWidgetRow}
                onPress={() => navigation.navigate('PatientDetail', { id: p.id })}
              >
                <Text style={styles.compactUhid}>{p.uhid}</Text>
                <Text style={styles.compactText} numberOfLines={1}>{p.name}</Text>
              </TouchableOpacity>
            ))}
            {recentPatients.length === 0 && (
              <Text style={styles.emptyWidgetText}>No patient records found.</Text>
            )}
          </View>

          {/* Pending Tasks */}
          <View style={styles.widgetCard}>
            <Text style={styles.widgetTitle}>📋 Pending Tasks</Text>
            {pendingTasks.map((task, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={styles.taskWidgetRow}
                onPress={task.action}
                disabled={!task.action}
              >
                <Text style={styles.taskDot}>•</Text>
                <Text style={styles.taskText}>{task.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 20,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  greeting: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  displayName: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  clockText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  headerRightBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primaryLight,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    minWidth: '28%',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 5,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.text,
    marginTop: 6,
  },
  dashboardGrid: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  calendarColumn: {
    flex: 7,
    minWidth: 320,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
  },
  calendarControlsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnNav: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnNavText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  calendarPeriodLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
    minWidth: 120,
    textAlign: 'center',
  },
  btnToday: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  btnTodayText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    padding: 3,
    borderRadius: 8,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: theme.colors.surface,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  toggleTextActive: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  monthCalendarContainer: {
    width: '100%',
  },
  weekHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 8,
    marginBottom: 8,
  },
  dayHeaderCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1.1,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 4,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  dayCellMuted: {
    opacity: 0.35,
  },
  dayCellToday: {
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  dayCellSelected: {
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
    borderRadius: 8,
  },
  dayNumText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text,
  },
  dayNumMuted: {
    color: theme.colors.textMuted,
  },
  dayNumTodayText: {
    color: theme.colors.primary,
    fontWeight: '900',
  },
  eventsIndicatorContainer: {
    width: '100%',
    marginTop: 4,
    gap: 2,
  },
  eventMiniPill: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    borderLeftWidth: 2,
  },
  eventMiniPillText: {
    fontSize: 8,
    fontWeight: '700',
  },
  plusMoreText: {
    fontSize: 8,
    color: theme.colors.textMuted,
    fontWeight: '800',
    textAlign: 'center',
  },
  weekCalendarContainer: {
    flexDirection: 'row',
    width: '100%',
    minHeight: 280,
  },
  weekDayColumn: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.04)',
    minHeight: 280,
  },
  weekDayColumnToday: {
    backgroundColor: 'rgba(99, 102, 241, 0.03)',
  },
  weekDayColumnSelected: {
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
    borderRadius: 8,
  },
  weekColumnHeader: {
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  weekDayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  weekDayTodayText: {
    color: theme.colors.primary,
    fontWeight: '900',
  },
  weekDayNum: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 2,
  },
  weekDayNumToday: {
    color: theme.colors.primary,
  },
  weekEventsScroll: {
    flex: 1,
    padding: 4,
  },
  weekEventCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  weekEventContent: {
    padding: 6,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  cardBackgroundContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'column',
    zIndex: 0,
  },
  cardBand: {
    flex: 1,
  },
  weekEventTime: {
    fontSize: 8,
    fontWeight: '800',
    color: '#ffffff',
  },
  weekEventTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 1,
  },
  weekEventMeta: {
    fontSize: 7.5,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    marginTop: 1,
  },
  emptyWeekText: {
    fontSize: 8.5,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
  infoColumn: {
    flex: 3,
    minWidth: 260,
    gap: 16,
  },
  widgetCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  widgetTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  widgetLegendBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 10,
    gap: 12
  },
  widgetLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  widgetLegendLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.colors.textMuted
  },
  legendColorBox: {
    fontSize: 14,
    lineHeight: 16
  },
  detailedEventRow: {
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  detailedEventRowContent: {
    padding: 10,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  eventRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventRowTime: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  dashboardCategoryTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagSurgery: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  tagOpd: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  tagOther: { backgroundColor: 'rgba(249, 115, 22, 0.15)', borderWidth: 1, borderColor: 'rgba(249, 115, 22, 0.3)' },
  categoryTagTextSurgery: { fontSize: 9, fontWeight: '800', color: '#34d399' },
  categoryTagTextOpd: { fontSize: 9, fontWeight: '800', color: '#f87171' },
  categoryTagTextOther: { fontSize: 9, fontWeight: '800', color: '#fb923c' },
  eventRowTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 4,
  },
  eventRowPatient: {
    fontSize: 11,
    color: theme.colors.text,
    fontWeight: '600',
    marginTop: 4,
  },
  eventRowDoctor: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  eventRowMeta: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  emptyWidgetText: {
    fontSize: 11.5,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginVertical: 10,
  },
  compactWidgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  compactTime: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primaryLight,
    width: 60,
  },
  compactUhid: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primaryLight,
    width: 90,
  },
  compactText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: theme.colors.text,
  },
  taskWidgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  taskDot: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  taskText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
});

