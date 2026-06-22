import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Modal, Pressable
} from 'react-native';
import { useAuthStore } from '../auth/store';
import { theme } from '../../shared/styles/theme';

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
const getBaseUrl = () => {
  let url = process.env.EXPO_PUBLIC_API_URL;
  if (url && !url.endsWith('/api/v1')) {
    url = `${url}/api/v1`;
  }
  return url || 'http://localhost:3000/api/v1';
};

/* ─────────────────────────────────────────────────────────────
   Tab definitions
───────────────────────────────────────────────────────────── */
const TABS = [
  { key: 'hospitals',  label: '🏥 Hospitals'       },
  { key: 'create',     label: '➕ Create Hospital'  },
  { key: 'resets',     label: '🔑 Password Resets'  },
  { key: 'backup',     label: '📂 Backup / Restore' },
];

export function SuperAdminDashboardScreen() {
  const { token, logout, username } = useAuthStore();
  const BASE_URL = getBaseUrl();

  /* ── Global state ── */
  const [activeTab, setActiveTab]               = useState('hospitals');
  const [hospitals, setHospitals]               = useState([]);
  const [resetRequests, setResetRequests]       = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [loadingResets, setLoadingResets]       = useState(false);

  /* ── Create Hospital form ── */
  const [hospitalCode,    setHospitalCode]    = useState('');
  const [hospitalName,    setHospitalName]    = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [hospitalPhone,   setHospitalPhone]   = useState('');
  const [hospitalEmail,   setHospitalEmail]   = useState('');
  const [hospitalGst,     setHospitalGst]     = useState('');
  const [adminUsername,   setAdminUsername]   = useState('');
  const [adminPassword,   setAdminPassword]   = useState('');
  const [adminFirstName,  setAdminFirstName]  = useState('');
  const [adminLastName,   setAdminLastName]   = useState('');
  const [submittingHospital, setSubmittingHospital] = useState(false);

  /* ── Backup / Restore ── */
  const [restoreJson,       setRestoreJson]       = useState('');
  const [submittingRestore, setSubmittingRestore] = useState(false);

  /* ── Temp-password approval modal ── */
  const [tempModal,             setTempModal]             = useState(false);
  const [generatedTempPassword, setGeneratedTempPassword] = useState('');
  const [affectedAdminUsername, setAffectedAdminUsername] = useState('');

  /* ── Hospital Settings modal ── */
  const [settingsModal,    setSettingsModal]    = useState(false);
  const [settingsHospital, setSettingsHospital] = useState(null);
  const [showPassword,     setShowPassword]     = useState(false);
  const [isEditingHospital, setIsEditingHospital] = useState(false);
  const [editName,    setEditName]    = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone,   setEditPhone]   = useState('');
  const [editEmail,   setEditEmail]   = useState('');
  const [editGst,     setEditGst]     = useState('');
  const [savingHospital, setSavingHospital] = useState(false);

  /* ── Load data on mount ── */
  useEffect(() => {
    fetchHospitals();
    fetchResetRequests();
  }, []);

  /* ═══════════════════════════════════════════════════════
     API Calls
  ═══════════════════════════════════════════════════════ */
  const fetchHospitals = async () => {
    setLoadingHospitals(true);
    try {
      const res  = await fetch(`${BASE_URL}/superadmin/hospitals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok) setHospitals(json.data.hospitals || []);
      else Alert.alert('Error', json.error?.message || 'Failed to fetch hospitals');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoadingHospitals(false);
    }
  };

  const fetchResetRequests = async () => {
    setLoadingResets(true);
    try {
      const res  = await fetch(`${BASE_URL}/superadmin/pending-resets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok) setResetRequests(json.data.requests || []);
      else Alert.alert('Error', json.error?.message || 'Failed to fetch reset tickets');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoadingResets(false);
    }
  };

  const handleCreateHospital = async () => {
    if (!hospitalCode.trim() || !hospitalName.trim() || !hospitalPhone.trim() ||
        !hospitalEmail.trim() || !adminUsername.trim() || !adminPassword.trim() ||
        !adminFirstName.trim()) {
      return Alert.alert('Validation Error', 'Please fill in all mandatory fields.');
    }
    setSubmittingHospital(true);
    try {
      const res  = await fetch(`${BASE_URL}/superadmin/hospitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          code: hospitalCode.trim(), name: hospitalName.trim(),
          address: hospitalAddress.trim(), phone: hospitalPhone.trim(),
          email: hospitalEmail.trim(), gstNumber: hospitalGst.trim() || null,
          adminUsername: adminUsername.trim(), adminPassword,
          adminFirstName: adminFirstName.trim(), adminLastName: adminLastName.trim()
        })
      });
      const json = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Hospital & Admin User created successfully!');
        setHospitalCode(''); setHospitalName(''); setHospitalAddress('');
        setHospitalPhone(''); setHospitalEmail(''); setHospitalGst('');
        setAdminUsername(''); setAdminPassword('');
        setAdminFirstName(''); setAdminLastName('');
        fetchHospitals();
        setActiveTab('hospitals');
      } else {
        Alert.alert('Error', json.error?.message || 'Failed to create hospital');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmittingHospital(false);
    }
  };

  const handleToggleActive = async (hospitalId, currentIsActive) => {
    try {
      const res  = await fetch(`${BASE_URL}/superadmin/hospitals/${hospitalId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !currentIsActive })
      });
      const json = await res.json();
      if (res.ok) {
        Alert.alert('Updated', `Hospital set to ${!currentIsActive ? 'Active' : 'Inactive'}.`);
        fetchHospitals();
      } else {
        Alert.alert('Error', json.error?.message || 'Failed to update status');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDeleteHospital = (hospitalId, name) => {
    Alert.alert(
      'Delete Hospital',
      `Delete "${name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              const res  = await fetch(`${BASE_URL}/superadmin/hospitals/${hospitalId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
              });
              const json = await res.json();
              if (res.ok) { Alert.alert('Deleted', 'Hospital soft-deleted.'); fetchHospitals(); }
              else Alert.alert('Error', json.error?.message || 'Delete failed');
            } catch (err) { Alert.alert('Error', err.message); }
          }
        }
      ]
    );
  };

  const handleResolveReset = async (requestId, action, reqUsername) => {
    try {
      const res  = await fetch(`${BASE_URL}/superadmin/resolve-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId, action })
      });
      const json = await res.json();
      if (res.ok) {
        if (action === 'APPROVE') {
          setAffectedAdminUsername(reqUsername);
          setGeneratedTempPassword(json.data.tempPassword);
          setTempModal(true);
        } else {
          Alert.alert('Done', 'Reset request rejected.');
        }
        fetchResetRequests();
      } else {
        Alert.alert('Error', json.error?.message || 'Failed to resolve request');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const res = await fetch(`${BASE_URL}/superadmin/backup`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Backup failed');
      }
      const json = await res.json();
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `cliniqox_backup_${Date.now()}.json`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        Alert.alert('Success', 'Backup downloaded.');
      } else {
        setRestoreJson(JSON.stringify(json, null, 2));
        Alert.alert('Backup Ready', 'JSON loaded into the restore field below. Copy to save.');
      }
    } catch (err) {
      Alert.alert('Backup Error', err.message);
    }
  };

  const handleRestoreDatabase = async () => {
    if (!restoreJson.trim()) return Alert.alert('Error', 'Paste backup JSON first.');
    let parsed;
    try { parsed = JSON.parse(restoreJson); } catch {
      return Alert.alert('Parse Error', 'Invalid JSON.');
    }
    Alert.alert(
      'Confirm Restore',
      'WARNING: This will OVERWRITE all current data. This is irreversible.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore Now', style: 'destructive',
          onPress: async () => {
            setSubmittingRestore(true);
            try {
              const res  = await fetch(`${BASE_URL}/superadmin/restore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(parsed)
              });
              const json = await res.json();
              if (res.ok) {
                Alert.alert('Success', 'Database restored.'); setRestoreJson('');
                fetchHospitals(); fetchResetRequests();
              } else {
                Alert.alert('Failed', json.error?.message || 'Restore failed.');
              }
            } catch (err) { Alert.alert('Error', err.message); }
            finally { setSubmittingRestore(false); }
          }
        }
      ]
    );
  };

  /* ═══════════════════════════════════════════════════════
     Open Settings Modal
  ═══════════════════════════════════════════════════════ */
  const openSettings = (h) => {
    setSettingsHospital(h);
    setShowPassword(false);
    setIsEditingHospital(false);
    setEditName(h.name || '');
    setEditAddress(h.address || '');
    setEditPhone(h.phone || '');
    setEditEmail(h.email || '');
    setEditGst(h.gstNumber || '');
    setSettingsModal(true);
  };

  const handleSaveHospital = async () => {
    if (!settingsHospital) return;
    setSavingHospital(true);
    try {
      const res = await fetch(`${BASE_URL}/superadmin/hospitals/${settingsHospital.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editName.trim(),
          address: editAddress.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim(),
          gstNumber: editGst.trim() || null
        })
      });
      const json = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Hospital details updated!');
        setIsEditingHospital(false);
        fetchHospitals();
        // Update local settingsHospital with new values
        setSettingsHospital(prev => ({
          ...prev,
          name: editName.trim(),
          address: editAddress.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim(),
          gstNumber: editGst.trim() || null
        }));
      } else {
        Alert.alert('Error', json.error?.message || 'Failed to update hospital');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingHospital(false);
    }
  };

  /* ═══════════════════════════════════════════════════════
     Render helpers
  ═══════════════════════════════════════════════════════ */
  const adminUser = (h) => h.users?.find(u => u.role === 'ADMIN') || h.users?.[0];

  /* ═══════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════ */
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>⚕️ Super Admin</Text>
          <Text style={styles.headerSub}>Logged in as: {username || 'superadmin'}</Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={logout}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* ── Tab Bar ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ══════════════════════════════════════════════════
          TAB: Hospitals
      ══════════════════════════════════════════════════ */}
      {activeTab === 'hospitals' && (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>🏥 All Hospitals ({hospitals.length})</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={fetchHospitals}>
              <Text style={styles.refreshBtnText}>↻ Refresh</Text>
            </TouchableOpacity>
          </View>

          {loadingHospitals ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: 30 }} />
          ) : hospitals.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🏥</Text>
              <Text style={styles.emptyText}>No hospitals registered yet.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setActiveTab('create')}>
                <Text style={styles.emptyBtnText}>Create First Hospital</Text>
              </TouchableOpacity>
            </View>
          ) : (
            hospitals.map((h) => {
              const admin = adminUser(h);
              return (
                <View key={h.id} style={styles.hospitalCard}>
                  {/* Card top row */}
                  <View style={styles.cardTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.hospitalName}>{h.name}</Text>
                      <Text style={styles.hospitalCode}>Code: {h.code}</Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      h.isActive ? styles.badgeActive : styles.badgeInactive
                    ]}>
                      <Text style={[
                        styles.statusBadgeText,
                        { color: h.isActive ? '#10b981' : '#f59e0b' }
                      ]}>
                        {h.isActive ? '● Active' : '○ Inactive'}
                      </Text>
                    </View>
                  </View>

                  {/* Details */}
                  <View style={styles.cardMeta}>
                    <Text style={styles.metaItem}>📞 {h.phone}</Text>
                    <Text style={styles.metaItem}>✉️ {h.email}</Text>
                    {h.gstNumber && <Text style={styles.metaItem}>🧾 GST: {h.gstNumber}</Text>}
                  </View>

                  {/* Action buttons */}
                  <View style={styles.actionRow}>
                    {/* Settings / Credentials */}
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnSettings]}
                      onPress={() => openSettings(h)}
                    >
                      <Text style={styles.actionBtnText}>⚙️ Settings</Text>
                    </TouchableOpacity>

                    {/* Toggle active */}
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        h.isActive ? styles.btnWarning : styles.btnPrimary
                      ]}
                      onPress={() => handleToggleActive(h.id, h.isActive)}
                    >
                      <Text style={styles.actionBtnText}>
                        {h.isActive ? 'Deactivate' : 'Activate'}
                      </Text>
                    </TouchableOpacity>

                    {/* Delete */}
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnDanger]}
                      onPress={() => handleDeleteHospital(h.id, h.name)}
                    >
                      <Text style={styles.actionBtnText}>🗑 Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: Create Hospital
      ══════════════════════════════════════════════════ */}
      {activeTab === 'create' && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>🏢 Create New Hospital Tenant</Text>

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Hospital Code * (Unique, Uppercase)</Text>
              <TextInput style={styles.input} placeholder="e.g. CITYH" placeholderTextColor="#64748b"
                value={hospitalCode} onChangeText={setHospitalCode} autoCapitalize="characters" />
            </View>
            <View style={{ flex: 2 }}>
              <Text style={styles.label}>Hospital Name *</Text>
              <TextInput style={styles.input} placeholder="e.g. City Hospital & Labs" placeholderTextColor="#64748b"
                value={hospitalName} onChangeText={setHospitalName} />
            </View>
          </View>

          <Text style={styles.label}>Address</Text>
          <TextInput style={[styles.input, { minHeight: 60 }]} placeholder="Street, City, State"
            placeholderTextColor="#64748b" multiline value={hospitalAddress} onChangeText={setHospitalAddress} />

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Phone *</Text>
              <TextInput style={styles.input} placeholder="+91 99887 76655" placeholderTextColor="#64748b"
                value={hospitalPhone} onChangeText={setHospitalPhone} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>GST Number</Text>
              <TextInput style={styles.input} placeholder="29ABCDE1234F1Z5" placeholderTextColor="#64748b"
                value={hospitalGst} onChangeText={setHospitalGst} autoCapitalize="characters" />
            </View>
          </View>

          <Text style={styles.label}>Contact Email *</Text>
          <TextInput style={styles.input} placeholder="contact@hospital.com" placeholderTextColor="#64748b"
            value={hospitalEmail} onChangeText={setHospitalEmail}
            keyboardType="email-address" autoCapitalize="none" />

          <View style={styles.sectionDivider}>
            <Text style={styles.sectionDividerText}>👤 Initial Admin Login Credentials</Text>
          </View>

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Admin First Name *</Text>
              <TextInput style={styles.input} placeholder="e.g. Florence" placeholderTextColor="#64748b"
                value={adminFirstName} onChangeText={setAdminFirstName} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Admin Last Name</Text>
              <TextInput style={styles.input} placeholder="e.g. Smith" placeholderTextColor="#64748b"
                value={adminLastName} onChangeText={setAdminLastName} />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Admin Username *</Text>
              <TextInput style={styles.input} placeholder="e.g. city_admin" placeholderTextColor="#64748b"
                value={adminUsername} onChangeText={setAdminUsername} autoCapitalize="none" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Admin Password *</Text>
              <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="#64748b"
                secureTextEntry value={adminPassword} onChangeText={setAdminPassword} autoCapitalize="none" />
            </View>
          </View>

          {submittingHospital ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 16 }} />
          ) : (
            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateHospital}>
              <Text style={styles.submitBtnText}>✓ Create Hospital & Register Admin</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: Password Resets
      ══════════════════════════════════════════════════ */}
      {activeTab === 'resets' && (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>🔑 Password Recovery Tickets ({resetRequests.length})</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={fetchResetRequests}>
              <Text style={styles.refreshBtnText}>↻ Refresh</Text>
            </TouchableOpacity>
          </View>

          {loadingResets ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: 30 }} />
          ) : resetRequests.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyText}>No pending recovery requests.</Text>
            </View>
          ) : (
            resetRequests.map((req) => (
              <View key={req.id} style={styles.resetCard}>
                <Text style={styles.resetId}>Request #{req.id.substring(0, 8)}…</Text>
                <Text style={styles.metaItem}>
                  Username: <Text style={{ color: '#f59e0b', fontWeight: '700' }}>{req.username}</Text>
                </Text>
                <Text style={styles.metaItem}>Requested: {new Date(req.requestedAt).toLocaleString()}</Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.actionBtn, styles.btnSuccess]}
                    onPress={() => handleResolveReset(req.id, 'APPROVE', req.username)}>
                    <Text style={styles.actionBtnText}>✓ Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.btnDanger]}
                    onPress={() => handleResolveReset(req.id, 'REJECT', req.username)}>
                    <Text style={styles.actionBtnText}>✗ Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: Backup / Restore
      ══════════════════════════════════════════════════ */}
      {activeTab === 'backup' && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>📂 System Backup & Restore</Text>
          <Text style={styles.panelSub}>
            Export all system data to a JSON file, or restore from a previously generated backup.
          </Text>

          {/* Computer-only notice */}
          <View style={styles.webOnlyBanner}>
            <Text style={styles.webOnlyIcon}>💻</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.webOnlyTitle}>Computer / Web Only</Text>
              <Text style={styles.webOnlyDesc}>
                Backup & Restore is designed for use on a computer browser only.
                File downloads and JSON paste do not work reliably on mobile devices.
              </Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.colors.success }]}
            onPress={handleDownloadBackup}>
            <Text style={styles.submitBtnText}>📥 Export & Download Full Backup</Text>
          </TouchableOpacity>

          <View style={styles.sectionDivider}>
            <Text style={styles.sectionDividerText}>⚠️ Restore from Backup JSON</Text>
          </View>

          <Text style={styles.label}>Paste Backup JSON Here</Text>
          <TextInput
            style={styles.restoreArea}
            placeholder="Paste JSON content here…"
            placeholderTextColor="#64748b"
            multiline
            value={restoreJson}
            onChangeText={setRestoreJson}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {submittingRestore ? (
            <ActivityIndicator size="large" color={theme.colors.danger} style={{ marginTop: 14 }} />
          ) : (
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.colors.danger }]}
              onPress={handleRestoreDatabase}>
              <Text style={styles.submitBtnText}>⚠️ Restore Database from JSON</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: Temp Password (after reset approval)
      ══════════════════════════════════════════════════ */}
      <Modal visible={tempModal} transparent animationType="fade" onRequestClose={() => setTempModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setTempModal(false)}>
          <Pressable style={styles.modalCard} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>✅ Reset Approved!</Text>
            <Text style={styles.modalSub}>
              Temp password for: <Text style={{ color: theme.colors.text, fontWeight: '800' }}>{affectedAdminUsername}</Text>
            </Text>
            <View style={styles.credBox}>
              <Text style={styles.credValue}>{generatedTempPassword}</Text>
            </View>
            <Text style={[styles.modalSub, { fontSize: 11, color: '#f59e0b', marginTop: 8 }]}>
              Share this with the admin. They must change it on next login.
            </Text>
            <TouchableOpacity style={styles.submitBtn} onPress={() => setTempModal(false)}>
              <Text style={styles.submitBtnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ══════════════════════════════════════════════════
          MODAL: Hospital Settings / Credentials
      ══════════════════════════════════════════════════ */}
      <Modal visible={settingsModal} transparent animationType="slide" onRequestClose={() => setSettingsModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setSettingsModal(false)}>
          <Pressable style={styles.modalCard} onPress={e => e.stopPropagation()}>
            {settingsHospital && (() => {
              const admin = adminUser(settingsHospital);
              return (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.modalTitle}>⚙️ Hospital Settings</Text>
                    {!isEditingHospital && (
                      <TouchableOpacity
                        style={{ backgroundColor: theme.colors.primary + '20', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: theme.colors.primary + '40' }}
                        onPress={() => setIsEditingHospital(true)}
                      >
                        <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 12 }}>✏️ Edit</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Hospital info */}
                  <View style={styles.infoBlock}>
                    {isEditingHospital ? (
                      <>
                        <Text style={styles.editFieldLabel}>Hospital Name *</Text>
                        <TextInput style={styles.editFieldInput} value={editName} onChangeText={setEditName} placeholder="Hospital Name" placeholderTextColor="#64748b" />

                        <Text style={styles.editFieldLabel}>Address</Text>
                        <TextInput style={[styles.editFieldInput, { minHeight: 50 }]} value={editAddress} onChangeText={setEditAddress} placeholder="Address" placeholderTextColor="#64748b" multiline />

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.editFieldLabel}>Phone *</Text>
                            <TextInput style={styles.editFieldInput} value={editPhone} onChangeText={setEditPhone} placeholder="Phone" placeholderTextColor="#64748b" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.editFieldLabel}>GST Number</Text>
                            <TextInput style={styles.editFieldInput} value={editGst} onChangeText={setEditGst} placeholder="GST Number" placeholderTextColor="#64748b" autoCapitalize="characters" />
                          </View>
                        </View>

                        <Text style={styles.editFieldLabel}>Email *</Text>
                        <TextInput style={styles.editFieldInput} value={editEmail} onChangeText={setEditEmail} placeholder="Email" placeholderTextColor="#64748b" keyboardType="email-address" autoCapitalize="none" />

                        <Text style={[styles.infoRow, { marginTop: 8 }]}>
                          <Text style={styles.infoLabel}>Code:  </Text>
                          <Text style={styles.infoValue}>{settingsHospital.code}</Text>
                        </Text>
                        <Text style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Status: </Text>
                          <Text style={{ fontWeight: '700', color: settingsHospital.isActive ? '#10b981' : '#f59e0b' }}>
                            {settingsHospital.isActive ? 'Active' : 'Inactive'}
                          </Text>
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Name:  </Text>
                          <Text style={styles.infoValue}>{settingsHospital.name}</Text>
                        </Text>
                        <Text style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Code:  </Text>
                          <Text style={styles.infoValue}>{settingsHospital.code}</Text>
                        </Text>
                        <Text style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Phone: </Text>
                          <Text style={styles.infoValue}>{settingsHospital.phone}</Text>
                        </Text>
                        <Text style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Email: </Text>
                          <Text style={styles.infoValue}>{settingsHospital.email}</Text>
                        </Text>
                        <Text style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Status: </Text>
                          <Text style={{ fontWeight: '700', color: settingsHospital.isActive ? '#10b981' : '#f59e0b' }}>
                            {settingsHospital.isActive ? 'Active' : 'Inactive'}
                          </Text>
                        </Text>
                        {settingsHospital.address ? (
                          <Text style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Address: </Text>
                            <Text style={styles.infoValue}>{settingsHospital.address}</Text>
                          </Text>
                        ) : null}
                        {settingsHospital.gstNumber && (
                          <Text style={styles.infoRow}>
                            <Text style={styles.infoLabel}>GST:   </Text>
                            <Text style={styles.infoValue}>{settingsHospital.gstNumber}</Text>
                          </Text>
                        )}
                      </>
                    )}
                  </View>

                  {/* Credentials section */}
                  <View style={styles.credSection}>
                    <Text style={styles.credSectionTitle}>🔑 Admin Credentials</Text>

                    {admin ? (
                      <>
                        {(admin.firstName || admin.lastName) && (
                          <View style={styles.credRow}>
                            <Text style={styles.credLabel}>Name</Text>
                            <View style={styles.credValueBox}>
                              <Text style={styles.credValueText}>
                                {`${admin.firstName || ''} ${admin.lastName || ''}`.trim()}
                              </Text>
                            </View>
                          </View>
                        )}
                        <View style={styles.credRow}>
                          <Text style={styles.credLabel}>Username</Text>
                          <View style={styles.credValueBox}>
                            <Text style={styles.credValueText}>{admin.username}</Text>
                          </View>
                        </View>

                        <View style={styles.credRow}>
                          <Text style={styles.credLabel}>Password</Text>
                          <View style={[styles.credValueBox, { flex: 1 }]}>
                            <Text style={styles.credValueText}>
                              {showPassword
                                ? (admin.plainPassword || '(not stored)')
                                : '••••••••••••'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.revealBtn}
                            onPress={() => setShowPassword(p => !p)}
                          >
                            <Text style={styles.revealBtnText}>
                              {showPassword ? '🙈 Hide' : '👁 Show'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <Text style={styles.noAdminText}>No admin user found for this hospital.</Text>
                    )}
                  </View>

                  {/* Action buttons */}
                  {isEditingHospital ? (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                      <TouchableOpacity
                        style={[styles.submitBtn, { flex: 1, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border }]}
                        onPress={() => {
                          setIsEditingHospital(false);
                          setEditName(settingsHospital.name || '');
                          setEditAddress(settingsHospital.address || '');
                          setEditPhone(settingsHospital.phone || '');
                          setEditEmail(settingsHospital.email || '');
                          setEditGst(settingsHospital.gstNumber || '');
                        }}
                      >
                        <Text style={[styles.submitBtnText, { color: theme.colors.textMuted }]}>Cancel</Text>
                      </TouchableOpacity>
                      {savingHospital ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} style={{ flex: 2, marginVertical: 12 }} />
                      ) : (
                        <TouchableOpacity
                          style={[styles.submitBtn, { flex: 2 }]}
                          onPress={handleSaveHospital}
                        >
                          <Text style={styles.submitBtnText}>💾 Save Changes</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <TouchableOpacity style={[styles.submitBtn, { marginTop: 8 }]}
                      onPress={() => setSettingsModal(false)}>
                      <Text style={styles.submitBtnText}>Close</Text>
                    </TouchableOpacity>
                  )}
                </>
              );
            })()}
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
  content: {
    padding: 20,
    paddingBottom: 80,
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  signOutBtn: {
    backgroundColor: theme.colors.danger,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  signOutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  /* Tab Bar */
  tabBar: {
    marginBottom: 16,
  },
  tabBarContent: {
    gap: 8,
    paddingVertical: 2,
  },
  tab: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '800',
  },

  /* Panel */
  panel: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 12,
  },
  panelSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 16,
    lineHeight: 18,
  },
  refreshBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  refreshBtnText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },

  /* Hospital Card */
  hospitalCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  hospitalName: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 2,
  },
  hospitalCode: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginLeft: 8,
  },
  badgeActive: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderColor: 'rgba(16,185,129,0.25)',
  },
  badgeInactive: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderColor: 'rgba(245,158,11,0.25)',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardMeta: {
    gap: 3,
    marginBottom: 12,
  },
  metaItem: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },

  /* Action row */
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  btnSettings: { backgroundColor: '#6366f1' },
  btnPrimary:  { backgroundColor: theme.colors.primary },
  btnWarning:  { backgroundColor: '#f59e0b' },
  btnDanger:   { backgroundColor: theme.colors.danger },
  btnSuccess:  { backgroundColor: '#10b981' },

  /* Empty state */
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14, marginBottom: 16 },
  emptyBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  /* Form */
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginTop: 6,
    marginBottom: 4,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    color: theme.colors.text,
    fontSize: 14,
    marginBottom: 4,
  },
  sectionDivider: {
    marginVertical: 18,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 14,
  },
  sectionDividerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f59e0b',
  },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  /* Restore area */
  restoreArea: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    color: theme.colors.text,
    fontSize: 12,
    minHeight: 120,
    fontFamily: 'monospace',
    textAlignVertical: 'top',
    marginBottom: 4,
  },

  /* Reset card */
  resetCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resetId: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 4,
  },

  /* Modals */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  credBox: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.success,
    marginVertical: 8,
  },
  credValue: {
    fontSize: 24,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: theme.colors.success,
    letterSpacing: 2,
  },

  /* Settings modal */
  infoBlock: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  infoRow: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  infoLabel: {
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  infoValue: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  credSection: {
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.25)',
    marginBottom: 12,
    gap: 10,
  },
  credSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  credRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  credLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    width: 72,
  },
  credValueBox: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  credValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
  revealBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  revealBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  noAdminText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  /* Web-only banner */
  webOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  webOnlyIcon: {
    fontSize: 28,
    marginTop: 2,
  },
  webOnlyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f59e0b',
    marginBottom: 4,
  },
  webOnlyDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },

  /* Edit fields in settings modal */
  editFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginBottom: 4,
    marginTop: 10,
  },
  editFieldInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    color: theme.colors.text,
    fontSize: 14,
  },
});
