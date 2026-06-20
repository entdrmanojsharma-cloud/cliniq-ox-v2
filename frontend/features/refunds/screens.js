/* 
  Purpose: Define Refund screens (Payout List, Detail View, and Refund Creation Form).
  Responsibility: Render screens, handle navigation, and validate payout limits.
*/

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useRefundsStore } from './store';
import { theme } from '../../shared/styles/theme';

export function RefundsListScreen({ navigation }) {
  const { refunds, fetchRefunds, loading, page, limit, total, search, setFilters } = useRefundsStore();

  useEffect(() => {
    fetchRefunds();
  }, [page, search]);

  return (
    <View style={styles.container}>
      <Text style={theme.typography.title}>Processed Refunds</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by refund number..."
        placeholderTextColor={theme.colors.textMuted}
        value={search}
        onChangeText={(val) => setFilters({ search: val, page: 1 })}
      />
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={refunds}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 88 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => navigation.navigate('RefundDetail', { id: item.id })}
            >
              <View>
                <Text style={styles.cardTitle}>{item.refundNumber}</Text>
                <Text style={theme.typography.caption}>Status: {item.status} | Mode: {item.paymentMode}</Text>
                <Text style={theme.typography.caption}>Amount: INR {Number(item.amount).toLocaleString()}</Text>
              </View>
              <Text style={styles.cardAction}>View</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No refunds recorded.</Text>}
        />
      )}
      <View style={styles.pagination}>
        <TouchableOpacity onPress={() => setFilters({ page: page - 1 })} disabled={page === 1} style={styles.pageButton}>
          <Text style={styles.pageButtonText}>Prev</Text>
        </TouchableOpacity>
        <Text style={theme.typography.body}>Page {page} of {Math.ceil(total / limit) || 1}</Text>
        <TouchableOpacity onPress={() => setFilters({ page: page + 1 })} disabled={page * limit >= total} style={styles.pageButton}>
          <Text style={styles.pageButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('RefundForm', { id: null })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export function RefundDetailScreen({ route }) {
  const { id } = route.params;
  const { refunds } = useRefundsStore();
  const ref = refunds.find(r => r.id === id);

  if (!ref) return null;

  return (
    <ScrollView style={styles.container}>
      <Text style={theme.typography.title}>Refund: {ref.refundNumber}</Text>
      <View style={styles.detailCard}>
        <Text style={styles.detailLabel}>Patient ID: <Text style={styles.detailValue}>{ref.patientId}</Text></Text>
        <Text style={styles.detailLabel}>Amount Refunded: <Text style={[styles.detailValue, {color: theme.colors.danger}]}>INR {Number(ref.amount).toLocaleString()}</Text></Text>
        <Text style={styles.detailLabel}>Payment Mode: <Text style={styles.detailValue}>{ref.paymentMode}</Text></Text>
        <Text style={styles.detailLabel}>Transaction Ref: <Text style={styles.detailValue}>{ref.transactionRef || 'N/A'}</Text></Text>
        <Text style={styles.detailLabel}>Date Settled: <Text style={styles.detailValue}>{new Date(ref.createdAt).toLocaleString()}</Text></Text>
        <Text style={styles.detailLabel}>Reason: <Text style={styles.detailValue}>{ref.reason || 'None'}</Text></Text>
      </View>
    </ScrollView>
  );
}

export function RefundFormScreen({ navigation }) {
  const { createRefund } = useRefundsStore();
  const [patientId, setPatientId] = useState('');
  const [estimateId, setEstimateId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [reason, setReason] = useState('');

  const handleSave = async () => {
    if (!patientId.trim()) return Alert.alert('Error', 'Patient ID required.');
    if (Number(amount) <= 0) return Alert.alert('Error', 'Positive refund amount required.');

    try {
      await createRefund({
        patientId,
        estimateId: estimateId || null,
        amount: Number(amount),
        paymentMode,
        reason: reason || null
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Refund Failed', err.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={theme.typography.title}>Issue Payout Refund</Text>
      <View style={styles.form}>
        <Text style={styles.label}>Patient ID *</Text>
        <TextInput style={styles.input} value={patientId} onChangeText={setPatientId} placeholder="Patient UUID" placeholderTextColor={theme.colors.textMuted} />
        
        <Text style={styles.label}>Estimate ID (Optional)</Text>
        <TextInput style={styles.input} value={estimateId} onChangeText={setEstimateId} placeholder="Estimate UUID" placeholderTextColor={theme.colors.textMuted} />

        <Text style={styles.label}>Amount (INR) *</Text>
        <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="3000" placeholderTextColor={theme.colors.textMuted} />

        <Text style={styles.label}>Refund Mode *</Text>
        <View style={styles.toggleRow}>
          {['BANK_TRANSFER', 'UPI', 'CASH'].map(m => (
            <TouchableOpacity key={m} style={[styles.toggleButton, paymentMode === m && styles.toggleButtonActive]} onPress={() => setPaymentMode(m)}>
              <Text style={styles.toggleText}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Reason *</Text>
        <TextInput style={styles.input} value={reason} onChangeText={setReason} placeholder="Excess surgery deposit refund" placeholderTextColor={theme.colors.textMuted} />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Process Payout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  searchInput: { backgroundColor: theme.colors.surface, color: theme.colors.text, padding: theme.spacing.sm, borderRadius: 8, marginVertical: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border },
  loader: { marginVertical: theme.spacing.xl },
  card: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: 8, marginVertical: theme.spacing.xs, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  cardTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  cardAction: { color: theme.colors.primaryLight, fontWeight: '600' },
  emptyText: { color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing.xl },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.md, paddingRight: 80 },
  pageButton: { backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: 6 },
  pageButtonText: { color: theme.colors.text, fontWeight: '600' },
  fab: { position: 'absolute', bottom: theme.spacing.xl, right: theme.spacing.xl, backgroundColor: theme.colors.primary, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  fabText: { fontSize: 28, color: '#ffffff', fontWeight: 'bold' },
  detailCard: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: 8, marginVertical: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  detailLabel: { color: theme.colors.textMuted, fontSize: 14, marginVertical: theme.spacing.xs },
  detailValue: { color: theme.colors.text, fontWeight: '600' },
  form: { marginVertical: theme.spacing.md },
  label: { color: theme.colors.text, marginVertical: theme.spacing.xs, fontWeight: '600' },
  input: { backgroundColor: theme.colors.surface, color: theme.colors.text, padding: theme.spacing.md, borderRadius: 8, borderColor: theme.colors.border, borderWidth: 1, marginVertical: theme.spacing.xs },
  toggleRow: { flexDirection: 'row', gap: theme.spacing.xs, marginVertical: theme.spacing.xs },
  toggleButton: { flex: 1, backgroundColor: theme.colors.surface, padding: theme.spacing.sm, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  toggleButtonActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  toggleText: { color: theme.colors.text, fontSize: 10, fontWeight: '600' },
  saveButton: { backgroundColor: theme.colors.success, padding: theme.spacing.md, borderRadius: 8, alignItems: 'center', marginVertical: theme.spacing.lg },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' }
});
