/* 
  Purpose: Define Receipt screens (Transaction List, Detail View, and Payment Recorder Form).
  Responsibility: Render screens, handle navigation, and validate payment entries.
*/

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useReceiptsStore } from './store';
import { theme } from '../../shared/styles/theme';

const SkeletonCard = () => (
  <View style={[styles.card, { opacity: 0.15 }]}>
    <View style={{ flex: 1, gap: 6 }}>
      <View style={{ height: 16, width: 120, backgroundColor: theme.colors.textMuted, borderRadius: 4 }} />
      <View style={{ height: 12, width: 150, backgroundColor: theme.colors.textMuted, borderRadius: 4 }} />
      <View style={{ height: 12, width: 100, backgroundColor: theme.colors.textMuted, borderRadius: 4 }} />
    </View>
    <View style={{ height: 16, width: 40, backgroundColor: theme.colors.textMuted, borderRadius: 4 }} />
  </View>
);

const SkeletonList = () => (
  <View style={{ gap: 10, paddingBottom: 88 }}>
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
  </View>
);

export function ReceiptsListScreen({ navigation }) {
  const { receipts, fetchReceipts, loading, page, limit, total, search, setFilters } = useReceiptsStore();

  useEffect(() => {
    fetchReceipts();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchReceipts();
    });
    return unsubscribe;
  }, [navigation, page, search]);

  return (
    <View style={styles.container}>
      <Text style={theme.typography.title}>Payment Receipts</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by receipt number..."
        placeholderTextColor={theme.colors.textMuted}
        value={search}
        onChangeText={(val) => setFilters({ search: val, page: 1 })}
      />
      {loading && receipts.length === 0 ? (
        <SkeletonList />
      ) : (
        <FlatList
          data={receipts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 88 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => navigation.navigate('ReceiptDetail', { id: item.id })}
            >
              <View>
                <Text style={styles.cardTitle}>{item.receiptNumber}</Text>
                <Text style={theme.typography.caption}>Mode: {item.paymentMode} | Ref: {item.transactionRef || 'N/A'}</Text>
                <Text style={theme.typography.caption}>Amount: INR {Number(item.amount).toLocaleString()}</Text>
              </View>
              <Text style={styles.cardAction}>View</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No receipts registered.</Text>}
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
        onPress={() => navigation.navigate('ReceiptForm', { id: null })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export function ReceiptDetailScreen({ route }) {
  const { id } = route.params;
  const { receipts } = useReceiptsStore();
  const rec = receipts.find(r => r.id === id);

  if (!rec) return null;

  return (
    <ScrollView style={styles.container}>
      <Text style={theme.typography.title}>Receipt: {rec.receiptNumber}</Text>
      <View style={styles.detailCard}>
        <Text style={styles.detailLabel}>Patient ID: <Text style={styles.detailValue}>{rec.patientId}</Text></Text>
        <Text style={styles.detailLabel}>Amount Deposited: <Text style={[styles.detailValue, {color: theme.colors.success}]}>INR {Number(rec.amount).toLocaleString()}</Text></Text>
        <Text style={styles.detailLabel}>Payment Mode: <Text style={styles.detailValue}>{rec.paymentMode}</Text></Text>
        <Text style={styles.detailLabel}>Transaction Ref: <Text style={styles.detailValue}>{rec.transactionRef || 'N/A'}</Text></Text>
        <Text style={styles.detailLabel}>Date Recorded: <Text style={styles.detailValue}>{new Date(rec.createdAt).toLocaleString()}</Text></Text>
        <Text style={styles.detailLabel}>Status: <Text style={styles.detailValue}>{rec.status}</Text></Text>
        <Text style={styles.detailLabel}>Remarks: <Text style={styles.detailValue}>{rec.remarks || 'None'}</Text></Text>
      </View>
    </ScrollView>
  );
}

export function ReceiptFormScreen({ route, navigation }) {
  const { createReceipt } = useReceiptsStore();
  const { patientId: routePatientId, estimateId: routeEstimateId, defaultAmount: routeDefaultAmount } = route?.params || {};
  const [patientId, setPatientId] = useState(routePatientId || '');
  const [estimateId, setEstimateId] = useState(routeEstimateId || '');
  const [amount, setAmount] = useState(routeDefaultAmount ? String(routeDefaultAmount) : '');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [ref, setRef] = useState('');

  const handleSave = async () => {
    if (!patientId.trim()) return Alert.alert('Error', 'Patient ID required.');
    if (Number(amount) <= 0) return Alert.alert('Error', 'Positive deposit amount required.');

    try {
      await createReceipt({
        patientId,
        estimateId: estimateId || null,
        amount: Number(amount),
        paymentMode,
        transactionRef: ref || null
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Deposit Failed', err.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={theme.typography.title}>Record Deposit</Text>
      <View style={styles.form}>
        <Text style={styles.label}>Patient ID *</Text>
        <TextInput style={styles.input} value={patientId} onChangeText={setPatientId} placeholder="Patient UUID" placeholderTextColor={theme.colors.textMuted} />
        
        <Text style={styles.label}>Estimate ID (Optional)</Text>
        <TextInput style={styles.input} value={estimateId} onChangeText={setEstimateId} placeholder="Estimate UUID" placeholderTextColor={theme.colors.textMuted} />

        <Text style={styles.label}>Amount (INR) *</Text>
        <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="5000" placeholderTextColor={theme.colors.textMuted} />

        <Text style={styles.label}>Payment Mode *</Text>
        <View style={styles.toggleRow}>
          {['UPI', 'CARD', 'CASH', 'NEFT'].map(m => (
            <TouchableOpacity key={m} style={[styles.toggleButton, paymentMode === m && styles.toggleButtonActive]} onPress={() => setPaymentMode(m)}>
              <Text style={styles.toggleText}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Transaction Reference No</Text>
        <TextInput style={styles.input} value={ref} onChangeText={setRef} placeholder="TXN123456" placeholderTextColor={theme.colors.textMuted} />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Confirm Deposit</Text>
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
