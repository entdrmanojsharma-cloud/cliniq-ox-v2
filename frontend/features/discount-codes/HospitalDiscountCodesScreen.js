import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import { api } from '../../shared/utils/api';
import { theme } from '../../shared/styles/theme';
import { useAuthStore } from '../auth/store';

export function HospitalDiscountCodesScreen({ navigation }) {
  const { role } = useAuthStore();
  const [activeTab, setActiveTab] = useState('CODES'); // CODES, REQUESTS, AUDITS
  
  // Codes list states
  const [codes, setCodes] = useState([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // Form states
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState('PERCENTAGE'); // PERCENTAGE, FIXED_AMOUNT
  const [value, setValue] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [reason, setReason] = useState(''); // mandatory reason for Admin edit
  const [submitting, setSubmitting] = useState(false);

  // Access requests states
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Audits states
  const [applicationLogs, setApplicationLogs] = useState([]);
  const [editLogs, setEditLogs] = useState([]);
  const [loadingAudits, setLoadingAudits] = useState(false);

  useEffect(() => {
    if (activeTab === 'CODES') fetchCodes();
    if (activeTab === 'REQUESTS') fetchRequests();
    if (activeTab === 'AUDITS') fetchAudits();
  }, [activeTab]);

  const fetchCodes = async () => {
    setLoadingCodes(true);
    try {
      const res = await api.get('/discount-codes');
      setCodes(res || []);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load codes.');
    } finally {
      setLoadingCodes(false);
    }
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await api.get('/discount-codes/access-requests');
      setRequests(res || []);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load requests.');
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchAudits = async () => {
    setLoadingAudits(true);
    try {
      const res = await api.get('/discount-codes/audits');
      setApplicationLogs(res?.applicationLogs || []);
      setEditLogs(res?.editLogs || []);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load audits.');
    } finally {
      setLoadingAudits(false);
    }
  };

  const handleApproveRequest = async (id) => {
    try {
      await api.patch(`/discount-codes/access-requests/${id}/approve`);
      Alert.alert('Success', 'Access request approved.');
      fetchRequests();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to approve.');
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      await api.patch(`/discount-codes/access-requests/${id}/reject`);
      Alert.alert('Success', 'Access request rejected.');
      fetchRequests();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to reject.');
    }
  };

  const getTodayISO = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getYearLaterISO = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  };

  const resetForm = () => {
    setCode('');
    setDescription('');
    setDiscountType('PERCENTAGE');
    setValue('');
    setValidFrom(getTodayISO());
    setValidTo(getYearLaterISO());
    setUsageLimit('100');
    setReason('');
    setSelectedId(null);
    setIsEditing(false);
  };

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    resetForm();
    setSelectedId(item.id);
    setCode(item.code);
    setDescription(item.description || '');
    setDiscountType(item.discountType);
    setValue(String(item.value));
    setValidFrom(item.validFrom ? item.validFrom.split('T')[0] : getTodayISO());
    setValidTo(item.validTo ? item.validTo.split('T')[0] : getYearLaterISO());
    setUsageLimit(String(item.usageLimit));
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!code.trim()) return Alert.alert('Error', 'Discount code is required.');
    if (!value || isNaN(value) || Number(value) <= 0) return Alert.alert('Error', 'Please enter a valid positive discount value.');
    if (!usageLimit || isNaN(usageLimit) || Number(usageLimit) <= 0) return Alert.alert('Error', 'Please enter a valid positive usage limit.');
    if (!validFrom || !validTo) return Alert.alert('Error', 'Validity dates are required.');

    if (isEditing && !reason.trim()) {
      return Alert.alert('Reason Required', 'Admin update requires a mandatory reason.');
    }

    setSubmitting(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        description: description.trim(),
        discountType,
        value: Number(value),
        validFrom: new Date(validFrom).toISOString(),
        validTo: new Date(validTo).toISOString(),
        usageLimit: parseInt(usageLimit, 10),
      };

      if (isEditing) {
        payload.reason = reason.trim();
        await api.put(`/discount-codes/${selectedId}`, payload);
        Alert.alert('Success', 'Discount code updated successfully.');
      } else {
        await api.post('/discount-codes', payload);
        Alert.alert('Success', 'Discount code created successfully.');
      }
      setModalVisible(false);
      fetchCodes();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const newStatus = item.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await api.patch(`/discount-codes/${item.id}/toggle`, { status: newStatus });
      fetchCodes();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to toggle.');
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this discount code?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/discount-codes/${id}`);
              fetchCodes();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete.');
            }
          }
        }
      ]
    );
  };

  const fmtDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  return (
    <View style={styles.container}>
      <Text style={theme.typography.title}>Hospital Discount Settings</Text>

      {/* Tabs Row */}
      <View style={styles.tabsRow}>
        {[
          { id: 'CODES', label: '🎟️ Codes' },
          { id: 'REQUESTS', label: '🔑 Requests' },
          { id: 'AUDITS', label: '📝 Audit Logs' }
        ].map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabBtn, activeTab === t.id && styles.tabBtnActive]}
            onPress={() => setActiveTab(t.id)}
          >
            <Text style={[styles.tabBtnText, activeTab === t.id && styles.tabBtnTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'CODES' && (
        <View style={{ flex: 1 }}>
          <View style={styles.tabHeaderRow}>
            <Text style={styles.tabTitle}>All Discount Codes</Text>
            <TouchableOpacity style={styles.createBtn} onPress={openCreateModal}>
              <Text style={styles.createBtnText}>+ Create Hospital Code</Text>
            </TouchableOpacity>
          </View>

          {loadingCodes && codes.length === 0 ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={codes}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 40 }}
              onRefresh={fetchCodes}
              refreshing={loadingCodes}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={styles.cardMain}>
                    <View style={styles.codeRow}>
                      <Text style={styles.codeText}>{item.code}</Text>
                      <View style={[styles.badge, item.status === 'ACTIVE' ? styles.badgeActive : styles.badgeDisabled]}>
                        <Text style={styles.badgeText}>{item.status}</Text>
                      </View>
                      {item.doctorId ? (
                        <View style={[styles.badge, { backgroundColor: theme.colors.primary + '18' }]}>
                          <Text style={[styles.badgeText, { color: theme.colors.primaryLight }]}>DOCTOR CODE</Text>
                        </View>
                      ) : (
                        <View style={[styles.badge, { backgroundColor: theme.colors.success + '18' }]}>
                          <Text style={[styles.badgeText, { color: theme.colors.success }]}>HOSPITAL CODE</Text>
                        </View>
                      )}
                    </View>
                    {item.description ? <Text style={styles.descText}>{item.description}</Text> : null}
                    
                    <Text style={styles.detailText}>
                      Benefit: <Text style={{ color: theme.colors.success, fontWeight: '700' }}>
                        {item.discountType === 'PERCENTAGE' ? `${item.value}%` : `₹${item.value}`}
                      </Text>
                    </Text>
                    
                    <Text style={styles.detailText}>
                      Validity: {fmtDate(item.validFrom)} to {fmtDate(item.validTo)}
                    </Text>

                    <Text style={styles.detailText}>
                      Usage: <Text style={{ fontWeight: '700', color: theme.colors.text }}>{item.usageCount}</Text> / {item.usageLimit}
                    </Text>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)}>
                      <Text style={styles.actionBtnText}>✏️ Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: item.status === 'ACTIVE' ? theme.colors.warning + '20' : theme.colors.success + '20' }]} onPress={() => handleToggleStatus(item)}>
                      <Text style={[styles.actionBtnText, { color: item.status === 'ACTIVE' ? theme.colors.warning : theme.colors.success }]}>
                        {item.status === 'ACTIVE' ? '🚫 Disable' : '✓ Enable'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.danger + '20' }]} onPress={() => handleDelete(item.id)}>
                      <Text style={[styles.actionBtnText, { color: theme.colors.danger }]}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', marginTop: 50 }}>
                  <Text style={{ color: theme.colors.textMuted }}>No codes configured yet.</Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {activeTab === 'REQUESTS' && (
        <View style={{ flex: 1 }}>
          <Text style={styles.tabTitle}>Staff Access Requests (Discovery)</Text>
          {loadingRequests && requests.length === 0 ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={requests}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 40 }}
              onRefresh={fetchRequests}
              refreshing={loadingRequests}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={styles.cardMain}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.text }}>
                      👤 Staff: {item.requestedByName}
                    </Text>
                    <Text style={styles.detailText}>
                      Requested: {new Date(item.createdAt).toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.detailText}>
                      Status: <Text style={{
                        fontWeight: '800',
                        color: item.status === 'APPROVED' ? theme.colors.success : item.status === 'REJECTED' ? theme.colors.danger : theme.colors.warning
                      }}>{item.status}</Text>
                    </Text>
                    {item.status === 'APPROVED' && (
                      <Text style={[styles.detailText, { fontStyle: 'italic' }]}>
                        Approved by: {item.approvedByName}
                      </Text>
                    )}
                  </View>

                  {item.status === 'PENDING' && (
                    <View style={styles.cardActions}>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.success + '20' }]} onPress={() => handleApproveRequest(item.id)}>
                        <Text style={[styles.actionBtnText, { color: theme.colors.success }]}>✓ Approve Access</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.danger + '20' }]} onPress={() => handleRejectRequest(item.id)}>
                        <Text style={[styles.actionBtnText, { color: theme.colors.danger }]}>✕ Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', marginTop: 50 }}>
                  <Text style={{ color: theme.colors.textMuted }}>No access requests found.</Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {activeTab === 'AUDITS' && (
        <View style={{ flex: 1 }}>
          <Text style={styles.tabTitle}>Security and Audits (Immutable)</Text>
          {loadingAudits ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
              
              <Text style={styles.sectionHeading}>🏷️ Promo Code Application Logs</Text>
              {applicationLogs.length === 0 ? (
                <Text style={styles.emptyText}>No codes applied yet.</Text>
              ) : (
                applicationLogs.map(log => (
                  <View key={log.id} style={styles.auditCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.colors.text }}>{log.codeApplied}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.success }}>{fmtDate(log.appliedAt)}</Text>
                    </View>
                    <Text style={styles.auditText}>Est #: {log.estimateNumber} | Patient: {log.patientName}</Text>
                    <Text style={styles.auditText}>Benefit: ₹{Number(log.discountAmount).toLocaleString()} | Applied By: {log.appliedByName}</Text>
                    {log.doctorName && <Text style={styles.auditText}>Doctor owner: {log.doctorName}</Text>}
                  </View>
                ))
              )}

              <Text style={[styles.sectionHeading, { marginTop: 24 }]}>✏️ Configuration Edit Logs</Text>
              {editLogs.length === 0 ? (
                <Text style={styles.emptyText}>No edits logged yet.</Text>
              ) : (
                editLogs.map(log => (
                  <View key={log.id} style={[styles.auditCard, { borderColor: theme.colors.warning + '40' }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.colors.warning }}>{log.codeName}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textMuted }}>{fmtDate(log.editedAt)}</Text>
                    </View>
                    <Text style={styles.auditText}>Edited By: {log.editedByName}</Text>
                    <Text style={[styles.auditText, { color: theme.colors.warning, fontWeight: '600', marginTop: 4 }]}>
                      Reason: "{log.reason}"
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* Code Editor Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{isEditing ? '✏️ Edit Discount Code' : '➕ Create Hospital Discount Code'}</Text>

              <Text style={styles.label}>Promo Code *</Text>
              <TextInput
                style={[styles.input, isEditing && styles.disabledInput]}
                value={code}
                onChangeText={setCode}
                placeholder="e.g. HOSP10"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="characters"
                editable={!isEditing}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Hospital standard discount"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={styles.label}>Discount Type *</Text>
              <View style={styles.typeRow}>
                {['PERCENTAGE', 'FIXED_AMOUNT'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeBtn, discountType === type && styles.typeBtnActive]}
                    onPress={() => setDiscountType(type)}
                  >
                    <Text style={[styles.typeBtnText, discountType === type && styles.typeBtnTextActive]}>
                      {type === 'PERCENTAGE' ? '% Percentage' : '₹ Fixed Amount'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Discount Value *</Text>
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={setValue}
                placeholder="e.g. 5 for 5% or 500 for ₹500"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Usage Limit (Max Uses) *</Text>
              <TextInput
                style={styles.input}
                value={usageLimit}
                onChangeText={setUsageLimit}
                placeholder="e.g. 100"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Valid From (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.input}
                value={validFrom}
                onChangeText={setValidFrom}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={styles.label}>Valid To (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.input}
                value={validTo}
                onChangeText={setValidTo}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textMuted}
              />

              {/* Reason for Admin Edit (Mandatory) */}
              {isEditing && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.label, { color: theme.colors.warning }]}>Mandatory Change Reason *</Text>
                  <TextInput
                    style={[styles.input, { borderColor: theme.colors.warning }]}
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Enter reason for code configuration change..."
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  tabsRow: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: 10, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: theme.colors.primary },
  tabBtnText: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '600' },
  tabBtnTextActive: { color: '#fff', fontWeight: '800' },
  tabHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  tabTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text, marginBottom: 12 },
  createBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, padding: 14, marginBottom: 12 },
  cardMain: { gap: 6 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  codeText: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeActive: { backgroundColor: theme.colors.success + '18' },
  badgeDisabled: { backgroundColor: theme.colors.danger + '18' },
  badgeText: { fontSize: 9, fontWeight: '800', color: theme.colors.text },
  descText: { fontSize: 13, color: theme.colors.textMuted },
  detailText: { fontSize: 12, color: theme.colors.textMuted },
  cardActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10, marginTop: 10 },
  actionBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)' },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: theme.colors.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' },
  modalScroll: { paddingVertical: 40, paddingHorizontal: 20 },
  modalContent: { backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text, marginBottom: 15 },
  label: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted, marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: theme.colors.background, color: theme.colors.text, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border, fontSize: 14 },
  disabledInput: { opacity: 0.6 },
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  typeBtnActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '18' },
  typeBtnText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  typeBtnTextActive: { color: theme.colors.primary, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 20 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  cancelBtnText: { color: theme.colors.textMuted, fontWeight: '700', fontSize: 13 },
  saveBtn: { backgroundColor: theme.colors.success, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sectionHeading: { fontSize: 14, fontWeight: '800', color: theme.colors.text, marginVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 6 },
  auditCard: { backgroundColor: theme.colors.surface, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, padding: 10, marginBottom: 8 },
  auditText: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  emptyText: { color: theme.colors.textMuted, fontSize: 12, fontStyle: 'italic', marginVertical: 10, textAlign: 'center' }
});
