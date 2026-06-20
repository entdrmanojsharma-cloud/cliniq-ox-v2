/* 
  Purpose: Define Settings screens (Hospital Profile View and configuration Editor form).
  Responsibility: Render settings fields, update database defaults, validate prefix lengths,
                  and allow the user to pick one of four UI themes with live preview.
*/

import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable
} from 'react-native';
import { useSettingsStore } from './store';
import { theme } from '../../shared/styles/theme';
import { useThemeStore, THEME_PALETTES } from '../../shared/styles/themeHelper';
import { useResponsive } from '../../shared/hooks/useResponsive';
import { useAuthStore } from '../auth/store';
import { api } from '../../shared/utils/api';

/* ─────────────────────────────────────────────────────────────
   Theme meta – labels, preview swatches, and contrast hint
───────────────────────────────────────────────────────────── */
const THEME_META = [
  {
    key: 'dark',
    label: '🌑  Dark Mode',
    description: 'Slate-indigo • easy on the eyes at night',
    bg: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
    accent: '#6366f1',
  },
  {
    key: 'light',
    label: '☀️  Light Mode',
    description: 'Clean white • high-contrast slate text',
    bg: '#f8fafc',
    surface: '#ffffff',
    text: '#0f172a',
    accent: '#4f46e5',
  },
  {
    key: 'ocean',
    label: '🌊  Ocean Breeze',
    description: 'Deep sky blue • cool and focused',
    bg: '#082f49',
    surface: '#0f172a',
    text: '#f0f9ff',
    accent: '#06b6d4',
  },
  {
    key: 'forest',
    label: '🌿  Forest Healing',
    description: 'Emerald green • calm and refreshing',
    bg: '#022c22',
    surface: '#064e3b',
    text: '#ecfdf5',
    accent: '#10b981',
  },
];

/* ─────────────────────────────────────────────────────────────
   ThemeCard – individual selectable theme tile
───────────────────────────────────────────────────────────── */
function ThemeCard({ meta, isActive, onPress, compact }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        cardStyles.card,
        compact && cardStyles.cardCompact,
        { borderColor: isActive ? meta.accent : theme.colors.border, borderWidth: isActive ? 2.5 : 1 },
      ]}
      accessibilityLabel={`Select ${meta.label} theme`}
    >
      {/* Mini preview window */}
      <View style={[cardStyles.preview, compact && cardStyles.previewCompact, { backgroundColor: meta.bg }]}>
        <View style={[cardStyles.previewSurface, { backgroundColor: meta.surface }]}>
          <View style={[cardStyles.previewBar, { backgroundColor: meta.accent }]} />
          <View style={[cardStyles.previewLine, { backgroundColor: meta.text, opacity: 0.9 }]} />
          <View style={[cardStyles.previewLine, { backgroundColor: meta.text, opacity: 0.55, width: '60%' }]} />
        </View>
      </View>

      {/* Label row */}
      <View style={[cardStyles.labelRow, compact && cardStyles.labelRowCompact]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[cardStyles.label, { color: theme.colors.text }, compact && cardStyles.labelCompact]} numberOfLines={1}>
            {meta.label}
          </Text>
          {!compact && (
            <Text style={[cardStyles.description, { color: theme.colors.textMuted }]}>{meta.description}</Text>
          )}
        </View>
        {isActive && (
          <View style={[cardStyles.activeBadge, { backgroundColor: meta.accent }]}>
            <Text style={cardStyles.activeBadgeText}>{compact ? '✓' : '✓ Active'}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardCompact: {
    marginBottom: 0,
    borderRadius: 10,
  },
  preview: {
    height: 72,
    padding: 10,
    justifyContent: 'center',
  },
  previewCompact: {
    height: 54,
    padding: 8,
  },
  previewSurface: {
    borderRadius: 6,
    padding: 8,
    gap: 4,
  },
  previewBar: {
    height: 7,
    borderRadius: 4,
    width: '40%',
    marginBottom: 3,
  },
  previewLine: {
    height: 5,
    borderRadius: 3,
    width: '80%',
    marginBottom: 2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    minHeight: 44,
  },
  labelRowCompact: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 40,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  labelCompact: {
    fontSize: 12,
    marginBottom: 0,
  },
  description: {
    fontSize: 11,
    fontWeight: '400',
  },
  activeBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

/* ─────────────────────────────────────────────────────────────
   Main Settings Screen
───────────────────────────────────────────────────────────── */
export function HospitalProfileScreen() {
  const { profile, fetchProfile, updateProfile, loading } = useSettingsStore();
  const { activeTheme, setTheme } = useThemeStore();
  const { isMobile, isTablet, width } = useResponsive();
  const { role } = useAuthStore();

  // 2-col grid for theme cards on tablet+, single col on mobile
  const themeGridCols = isMobile ? 1 : 2;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gstRate, setGstRate] = useState('18.00');
  const [estPrefix, setEstPrefix] = useState('EST');
  const [invPrefix, setInvPrefix] = useState('INV');

  // ── Clear Test Data state ──
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setGstRate(profile.defaultGstRate ? String(profile.defaultGstRate) : '18.00');
      setEstPrefix(profile.estimatePrefix || 'EST');
      setInvPrefix(profile.invoicePrefix || 'INV');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Hospital name is required.');
    if (estPrefix.length > 10 || invPrefix.length > 10) {
      return Alert.alert('Error', 'Prefix parameters must not exceed 10 characters.');
    }
    try {
      await updateProfile({
        name,
        phone,
        defaultGstRate: Number(gstRate),
        estimatePrefix: estPrefix,
        invoicePrefix: invPrefix
      });
      Alert.alert('Success', 'Profile settings updated.');
    } catch (err) {
      Alert.alert('Save Failed', err.message);
    }
  };

  const handleClearData = async () => {
    if (clearConfirmText.trim().toUpperCase() !== 'CLEAR') {
      Alert.alert('Wrong Input', 'Please type CLEAR exactly to confirm.');
      return;
    }
    setClearing(true);
    try {
      await api.post('/superadmin/clear-test-data', { confirmToken: 'CLEAR_CONFIRMED' });
      setShowClearModal(false);
      setClearConfirmText('');
      Alert.alert(
        '✅ Done!',
        'All test data has been wiped.\n\nPatients, estimates, events, invoices, and billing records have been removed.\n\nMaster data (users, rooms, surgeries, charges) is intact.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to clear data.');
    } finally {
      setClearing(false);
    }
  };

  if (loading && !profile) {
    return <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, isMobile && styles.contentContainerMobile]}
    >
      {/* ── Hospital Settings ── */}
      <Text style={[styles.pageTitle, isMobile && styles.pageTitleMobile]}>⚙️  Hospital Settings</Text>

      {profile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏥  Profile</Text>

          <Text style={styles.label}>Hospital Name *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={theme.colors.textMuted} />

          <Text style={styles.label}>Phone Contact</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={theme.colors.textMuted} />

          <Text style={styles.label}>Default GST Rate (%)</Text>
          <TextInput style={styles.input} value={gstRate} onChangeText={setGstRate} keyboardType="numeric" placeholderTextColor={theme.colors.textMuted} />

          <Text style={styles.label}>Estimate Number Prefix</Text>
          <TextInput style={styles.input} value={estPrefix} onChangeText={setEstPrefix} placeholderTextColor={theme.colors.textMuted} />

          <Text style={styles.label}>Invoice Number Prefix</Text>
          <TextInput style={styles.input} value={invPrefix} onChangeText={setInvPrefix} placeholderTextColor={theme.colors.textMuted} />

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Configurations</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Theme Settings ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎨  App Theme</Text>
        <Text style={styles.sectionSubtitle}>
          Choose an interface colour palette. Changes apply instantly across the whole app.
        </Text>

        {/* Contrast notice */}
        <View style={styles.contrastBanner}>
          <Text style={styles.contrastBannerText}>
            ✅  All themes are tuned for WCAG AA contrast — text is always easy to read.
          </Text>
        </View>

        {/* 2-col grid on tablet+, stacked on mobile */}
        <View style={[
          styles.themeGrid,
          themeGridCols === 2 && styles.themeGridTwo
        ]}>
          {THEME_META.map((meta) => (
            <View key={meta.key} style={themeGridCols === 2 ? styles.themeGridItem : styles.themeGridItemFull}>
              <ThemeCard
                meta={meta}
                isActive={activeTheme === meta.key}
                onPress={() => setTheme(meta.key)}
                compact={themeGridCols === 2}
              />
            </View>
          ))}
        </View>
      </View>

      {/* ── Testing Tools (ADMIN / SUPER_ADMIN only) ── */}
      {(role === 'ADMIN' || role === 'SUPER_ADMIN') && (
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>🧪  Testing Tools</Text>
          <Text style={styles.sectionSubtitle}>
            Use these during development and QA only. These actions cannot be undone.
          </Text>

          <View style={styles.dangerCard}>
            <View style={styles.dangerCardHeader}>
              <Text style={styles.dangerCardIcon}>🗑️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.dangerCardTitle}>Clear All Test Data</Text>
                <Text style={styles.dangerCardSubtitle}>Wipes all patient records for a clean end-to-end test run</Text>
              </View>
            </View>

            <View style={styles.keepDeleteGrid}>
              <View style={styles.keepBox}>
                <Text style={styles.keepBoxTitle}>✅ Kept</Text>
                <Text style={styles.keepBoxItem}>• Users & Accounts</Text>
                <Text style={styles.keepBoxItem}>• Hospital Profile</Text>
                <Text style={styles.keepBoxItem}>• Surgeries Master</Text>
                <Text style={styles.keepBoxItem}>• Rooms & OT Rooms</Text>
                <Text style={styles.keepBoxItem}>• Hospital Charges</Text>
                <Text style={styles.keepBoxItem}>• Billing Defaults</Text>
                <Text style={styles.keepBoxItem}>• Estimate Templates</Text>
              </View>
              <View style={styles.deleteBox}>
                <Text style={styles.deleteBoxTitle}>🗑️ Deleted</Text>
                <Text style={styles.deleteBoxItem}>• All Patients</Text>
                <Text style={styles.deleteBoxItem}>• Calendar Events</Text>
                <Text style={styles.deleteBoxItem}>• All Estimates</Text>
                <Text style={styles.deleteBoxItem}>• All Invoices</Text>
                <Text style={styles.deleteBoxItem}>• Receipts & Refunds</Text>
                <Text style={styles.deleteBoxItem}>• Discount Codes</Text>
                <Text style={styles.deleteBoxItem}>• Audit Logs</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => { setClearConfirmText(''); setShowClearModal(true); }}
            >
              <Text style={styles.clearBtnText}>🗑️  Clear All Test Data</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Confirmation Modal ── */}
      <Modal
        visible={showClearModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowClearModal(false)}>
          <Pressable style={styles.modalBox} onPress={e => e.stopPropagation()}>
            <View style={styles.modalWarningBadge}>
              <Text style={styles.modalWarningIcon}>⚠️</Text>
            </View>
            <Text style={styles.modalTitle}>Confirm Data Wipe</Text>
            <Text style={styles.modalBody}>
              This will permanently delete all patients, estimates, calendar events, invoices, and billing records for your hospital.
              {`\n\n`}
              <Text style={{ fontWeight: '800', color: '#ef4444' }}>This cannot be undone.</Text>
            </Text>

            <Text style={styles.modalLabel}>
              Type <Text style={{ fontWeight: '900', color: '#ef4444', letterSpacing: 2 }}>CLEAR</Text> to confirm:
            </Text>
            <TextInput
              style={styles.modalInput}
              value={clearConfirmText}
              onChangeText={setClearConfirmText}
              placeholder="Type CLEAR here"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="characters"
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowClearModal(false)}
                disabled={clearing}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  clearConfirmText.trim().toUpperCase() !== 'CLEAR' && styles.modalConfirmBtnDisabled
                ]}
                onPress={handleClearData}
                disabled={clearing || clearConfirmText.trim().toUpperCase() !== 'CLEAR'}
              >
                {clearing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>🗑️ Yes, Clear Everything</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </ScrollView>
  );
}

/* ─────────────────────────────────────────────────────────────
   Styles
───────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  contentContainerMobile: {
    padding: 12,
    paddingBottom: 32,
  },
  loader: { marginVertical: 40 },

  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  pageTitleMobile: {
    fontSize: 18,
    marginBottom: 14,
  },

  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 14,
    lineHeight: 18,
  },

  label: {
    color: theme.colors.text,
    marginTop: 10,
    marginBottom: 4,
    fontWeight: '600',
    fontSize: 13,
  },
  input: {
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    padding: theme.spacing.md,
    borderRadius: 8,
    borderColor: theme.colors.border,
    borderWidth: 1,
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: theme.colors.success,
    padding: theme.spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 18,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  contrastBanner: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  contrastBannerText: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 17,
  },

  // Theme grid
  themeGrid: {
    flexDirection: 'column',
    gap: 10,
  },
  themeGridTwo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeGridItem: {
    width: '48%',
    flexShrink: 0,
  },
  themeGridItemFull: {
    width: '100%',
  },

  // ── Danger / Testing section ───────────────────────────────────────────────
  dangerSection: {
    borderColor: 'rgba(239,68,68,0.35)',
    borderWidth: 1.5,
  },
  dangerCard: {
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    padding: 14,
    marginTop: 8,
  },
  dangerCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  dangerCardIcon: { fontSize: 22 },
  dangerCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  dangerCardSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  // Keep / Delete 2-col grid
  keepDeleteGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  keepBox: {
    flex: 1,
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
    padding: 10,
    gap: 4,
  },
  keepBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10b981',
    marginBottom: 4,
  },
  keepBoxItem: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  deleteBox: {
    flex: 1,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    padding: 10,
    gap: 4,
  },
  deleteBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ef4444',
    marginBottom: 4,
  },
  deleteBoxItem: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },

  clearBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
  },
  clearBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3,
  },

  // ── Confirmation Modal ─────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  modalWarningBadge: {
    alignItems: 'center',
    marginBottom: 12,
  },
  modalWarningIcon: {
    fontSize: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  modalBody: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(239,68,68,0.5)',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  modalCancelText: {
    color: theme.colors.textMuted,
    fontWeight: '700',
    fontSize: 14,
  },
  modalConfirmBtn: {
    flex: 1.5,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#ef4444',
  },
  modalConfirmBtnDisabled: {
    backgroundColor: '#fca5a5',
    opacity: 0.6,
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
});

