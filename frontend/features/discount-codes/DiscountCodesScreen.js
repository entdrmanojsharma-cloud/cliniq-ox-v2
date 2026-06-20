import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import { api } from '../../shared/utils/api';
import { theme } from '../../shared/styles/theme';
import { useAuthStore } from '../auth/store';

export function DiscountCodesScreen({ navigation }) {
  const { role } = useAuthStore();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/discount-codes');
      setCodes(res || []);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load discount codes.');
    } finally {
      setLoading(false);
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

    // Admin requires a mandatory override/edit reason if modifying a DOCTOR's code
    const isDoctorCode = codes.find(c => c.id === selectedId)?.doctorId;
    if (isEditing && role === 'ADMIN' && isDoctorCode && !reason.trim()) {
      return Alert.alert('Reason Required', 'Editing a doctor code requires a mandatory override reason.');
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
        if (role === 'ADMIN' && reason.trim()) {
          payload.reason = reason.trim();
        }
        await api.put(`/discount-codes/${selectedId}`, payload);
        Alert.alert('Success', 'Discount code updated successfully.');
      } else {
        await api.post('/discount-codes', payload);
        Alert.alert('Success', 'Discount code created successfully.');
      }
      setModalVisible(false);
      fetchCodes();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save discount code.');
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
      Alert.alert('Error', err.message || 'Failed to toggle status.');
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
      <View style={styles.headerRow}>
        <Text style={theme.typography.title}>My Discount Codes</Text>
        <TouchableOpacity style={styles.createBtn} onPress={openCreateModal}>
          <Text style={styles.createBtnText}>+ Create Code</Text>
        </TouchableOpacity>
      </View>

      {loading && codes.length === 0 ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={codes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          onRefresh={fetchCodes}
          refreshing={loading}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardMain}>
                <View style={styles.codeRow}>
                  <Text style={styles.codeText}>{item.code}</Text>
                  <View style={[styles.badge, item.status === 'ACTIVE' ? styles.badgeActive : styles.badgeDisabled]}>
                    <Text style={styles.badgeText}>{item.status}</Text>
                  </View>
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
              <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>No discount codes created yet.</Text>
            </View>
          }
        />
      )}

      {/* Create / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{isEditing ? '✏️ Edit Discount Code' : '➕ Create Discount Code'}</Text>

              <Text style={styles.label}>Promo Code *</Text>
              <TextInput
                style={[styles.input, isEditing && styles.disabledInput]}
                value={code}
                onChangeText={setCode}
                placeholder="e.g. SURG50"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="characters"
                editable={!isEditing}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Doctor special discount code"
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

              {/* Show override reason field for Admin editing Doctor Code */}
              {isEditing && role === 'ADMIN' && codes.find(c => c.id === selectedId)?.doctorId && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.label, { color: theme.colors.warning }]}>Mandatory Override Reason *</Text>
                  <TextInput
                    style={[styles.input, { borderColor: theme.colors.warning }]}
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Enter reason for admin override..."
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  createBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, padding: 14, marginBottom: 12 },
  cardMain: { gap: 6 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeText: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeActive: { backgroundColor: theme.colors.success + '18' },
  badgeDisabled: { backgroundColor: theme.colors.danger + '18' },
  badgeText: { fontSize: 10, fontWeight: '800', color: theme.colors.text },
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
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 }
});
