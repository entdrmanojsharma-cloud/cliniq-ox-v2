import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, Modal, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../features/auth/store';
import { useThemeStore } from '../styles/themeHelper';
import { useSettingsStore } from '../../features/settings/store';
import { theme } from '../styles/theme';
import { api } from '../utils/api';

const THEME_OPTIONS = [
  { key: 'dark',   icon: '🌑', label: 'Dark' },
  { key: 'light',  icon: '☀️', label: 'Light' },
  { key: 'ocean',  icon: '🌊', label: 'Ocean' },
  { key: 'forest', icon: '🌿', label: 'Forest' },
];

export function SidebarContent({ navigation, onClose }) {
  const { role, logout, username, firstName, lastName } = useAuthStore();
  const { activeTheme, setTheme } = useThemeStore();
  const { profile } = useSettingsStore();

  const [expanded, setExpanded] = useState({
    patients: true,
    schedule: true,
    billing: true,
    config: false,
    clinical: true,
    admin: false,
  });

  const toggle = (menu) => {
    setExpanded(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const nav = (screen, params = {}) => {
    if (navigation) {
      navigation.navigate(screen, params);
    } else if (typeof window !== 'undefined' && window.navigationRef?.current) {
      window.navigationRef.current.navigate(screen, params);
    }
    if (onClose) onClose();
  };

  const displayName = (firstName && lastName)
    ? `${firstName} ${lastName}`
    : firstName || lastName || (username || '').split('@')[0] || 'User';

  const renderHeader = (icon, title, isExpanded, onPress) => (
    <TouchableOpacity style={styles.menuHeader} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuHeaderLeft}>
        <Text style={styles.menuHeaderIcon}>{icon}</Text>
        <Text style={styles.menuHeaderText}>{title}</Text>
      </View>
      <Text style={styles.caret}>{isExpanded ? '▼' : '▶'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Clinic branding */}
      <View style={styles.brandContainer}>
        <Text style={styles.brandText}>🏥 Cliniq-OX</Text>
        <Text style={styles.hospitalSubText} numberOfLines={1}>{profile?.name || 'Florence Healthcare'}</Text>
      </View>

      {/* User profile details */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
          <View style={styles.roleRow}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{role}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Menu List */}
      <ScrollView style={styles.menuScroll} contentContainerStyle={{ paddingBottom: 20 }}>
        
        {/* Clinical Menu */}
        {renderHeader('🏥', 'Clinical', expanded.clinical, () => toggle('clinical'))}
        {expanded.clinical && (
          <View style={styles.submenu}>
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('PatientsList')}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>Patients Registry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 1. Patients Menu */}
        {renderHeader('👤', 'Patients', expanded.patients, () => toggle('patients'))}
        {expanded.patients && (
          <View style={styles.submenu}>
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('PatientForm', { id: null })}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>Add Patient</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('PatientsList')}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>Search Patient</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 2. Schedule Menu */}
        {renderHeader('📅', 'Schedule', expanded.schedule, () => toggle('schedule'))}
        {expanded.schedule && (
          <View style={styles.submenu}>
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('Calendar', { filterType: 'ROUTINE' })}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>Routine Events</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('Calendar', { filterType: 'SURGERY' })}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>Surgery Queue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('FutureSurgeries')}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>Future Surgeries</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('Calendar', { filterType: 'SPECIAL' })}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>Special Events</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 3. Billing Menu */}
        {renderHeader('💳', 'Billing Module', expanded.billing, () => toggle('billing'))}
        {expanded.billing && (
          <View style={styles.submenu}>
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('EstimatesList')}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>Estimates</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('InvoicesList')}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>Invoices</Text>
            </TouchableOpacity>
            {role !== 'ADMIN' && (
              <>
                <TouchableOpacity style={styles.submenuItem} onPress={() => nav('ReceiptsList')}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.submenuText}>Receipts</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submenuItem} onPress={() => nav('RefundsList')}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.submenuText}>Refunds</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('AdvanceBalances')}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>Advance Payments</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('CreditNotesList')}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>Credit Notes</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 4. Configuration Menu */}
        {renderHeader('⚙️', 'Configuration', expanded.config, () => toggle('config'))}
        {expanded.config && (
          <View style={styles.submenu}>
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('OtRooms')}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>OT Master</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('Rooms')}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>Room Master</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('SurgeriesList')}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>Surgery Master</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('DiagnosisMaster')}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>Diagnosis Master</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('TemplatesList')}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>Estimate Templates</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('BillingDefaults')}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>Billing Defaults</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('HospitalProfile')}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>Hospital Profile</Text>
            </TouchableOpacity>
            {(role === 'DOCTOR' || role === 'ADMIN') && (
              <TouchableOpacity style={styles.submenuItem} onPress={() => nav('DiscountCodes')}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.submenuText}>My Discount Codes</Text>
              </TouchableOpacity>
            )}
            {role === 'ADMIN' && (
              <TouchableOpacity style={styles.submenuItem} onPress={() => nav('HospitalDiscountCodes')}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.submenuText}>Hospital Discount Codes</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('HospitalCharges')}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>Hospital Charges</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('PendingCharges')}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>Pending Charges</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('DocumentsList')}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>Documents Hub</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 5. Administration Menu */}
        {(role === 'ADMIN' || role === 'SUPER_ADMIN') && renderHeader('🛡️', 'Administration', expanded.admin, () => toggle('admin'))}
        {(role === 'ADMIN' || role === 'SUPER_ADMIN') && expanded.admin && (
          <View style={styles.submenu}>
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('AddStaff')}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>Staff Management</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submenuItem} onPress={() => nav('DataManagement')}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.submenuText}>Data Management</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Theme Switcher */}
      <View style={styles.themeRow}>
        {THEME_OPTIONS.map(opt => {
          const active = activeTheme === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.themeBtn, active && styles.themeBtnActive]}
              onPress={() => setTheme(opt.key)}
              title={opt.label}
            >
              <Text style={styles.themeEmoji}>{opt.icon}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Clear Test Data (ADMIN / SUPER_ADMIN only) ── */}
      {(role === 'ADMIN' || role === 'SUPER_ADMIN') && (
        <ClearDataButton onClose={onClose} />
      )}

      {/* Sign Out / Version */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.signOutBtn} onPress={logout}>
          <Text style={styles.signOutText}>👋 Sign Out</Text>
        </TouchableOpacity>
        <Text style={styles.versionText}>v1.3.0-EMR</Text>
      </View>
    </View>
  );
}

/* ─── Clear Test Data Button ─────────────────────────────────────────────────
   A self-contained component placed in the sidebar footer.
   Visible to ADMIN and SUPER_ADMIN only.
   Requires typing "CLEAR" to confirm before calling the backend.
──────────────────────────────────────────────────────────────────────────── */
function ClearDataButton({ onClose }) {
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [clearing, setClearing] = useState(false);

  const ready = confirmText.trim().toUpperCase() === 'CLEAR';

  const handleClear = async () => {
    if (!ready) return;
    setClearing(true);
    try {
      await api.post('/superadmin/clear-test-data', { confirmToken: 'CLEAR_CONFIRMED' });
      setShowModal(false);
      setConfirmText('');
      if (onClose) onClose();
      Alert.alert(
        '✅ Factory Reset Complete',
        'All configurations, catalog masters, patients, estimates, invoices, and staff logins have been reset. Active admin session preserved.'
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to factory reset.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <React.Fragment>
      {/* The red button in the sidebar */}
      <TouchableOpacity
        style={clearStyles.sidebarBtn}
        onPress={() => { setConfirmText(''); setShowModal(true); }}
      >
        <Text style={clearStyles.sidebarBtnText}>🗑️ System Factory Reset</Text>
      </TouchableOpacity>

      {/* Confirmation modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable style={clearStyles.overlay} onPress={() => setShowModal(false)}>
          <Pressable style={clearStyles.box} onPress={e => e.stopPropagation()}>
            <Text style={clearStyles.warningIcon}>⚠️</Text>
            <Text style={clearStyles.title}>Factory Reset System?</Text>
            <Text style={clearStyles.body}>
              Permanently deletes:{'\n'}
              Schedules • Patients • Estimates • Invoices{'\n'}
              Surgeries • Rooms & OTs • Staff Logins{'\n\n'}
              <Text style={{ color: '#ef4444', fontWeight: '800' }}>This cannot be undone.</Text>
            </Text>

            <Text style={clearStyles.label}>
              Type{' '}<Text style={{ color: '#ef4444', fontWeight: '900', letterSpacing: 2 }}>CLEAR</Text>{' '}to confirm:
            </Text>
            <TextInput
              style={clearStyles.input}
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="Type CLEAR"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="characters"
              autoFocus
            />

            <View style={clearStyles.actions}>
              <TouchableOpacity
                style={clearStyles.cancelBtn}
                onPress={() => setShowModal(false)}
                disabled={clearing}
              >
                <Text style={clearStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[clearStyles.confirmBtn, !ready && clearStyles.confirmBtnOff]}
                onPress={handleClear}
                disabled={!ready || clearing}
              >
                {clearing
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={clearStyles.confirmText}>🗑️ Factory Reset</Text>
                }
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </React.Fragment>
  );
}

const clearStyles = StyleSheet.create({
  sidebarBtn: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    alignItems: 'center',
  },
  sidebarBtnText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 13,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  box: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 22,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.4)',
    alignItems: 'center',
  },
  warningIcon: { fontSize: 36, marginBottom: 8 },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    padding: 11,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(239,68,68,0.5)',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 18,
  },
  actions: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  cancelText: { color: theme.colors.textMuted, fontWeight: '700', fontSize: 13 },
  confirmBtn: {
    flex: 1.4,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#ef4444',
  },
  confirmBtnOff: { backgroundColor: '#fca5a5', opacity: 0.55 },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 16,
    flexDirection: 'column',
    height: '100%',
  },
  brandContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  hospitalSubText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginHorizontal: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  roleRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleText: {
    color: theme.colors.primaryLight,
    fontSize: 9,
    fontWeight: '800',
  },
  menuScroll: {
    flex: 1,
    paddingHorizontal: 12,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginTop: 6,
    borderRadius: 8,
  },
  menuHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuHeaderIcon: {
    fontSize: 16,
  },
  menuHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  caret: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  submenu: {
    paddingLeft: 22,
    marginTop: 2,
    gap: 2,
  },
  submenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  bullet: {
    color: theme.colors.primary,
    marginRight: 6,
    fontSize: 12,
    fontWeight: '900',
  },
  submenuText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginBottom: 12,
  },
  themeBtn: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  themeEmoji: {
    fontSize: 15,
  },
  footer: {
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signOutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  signOutText: {
    color: theme.colors.danger,
    fontWeight: '700',
    fontSize: 12,
  },
  versionText: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
});
