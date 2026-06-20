/* 
  Purpose: Define Credit Note screens (Reversals List, Detail View, and Credit Note Form).
  Responsibility: Render screens, handle navigation, and validate input parameters.
*/

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useCreditNotesStore } from './store';
import { theme } from '../../shared/styles/theme';

export function CreditNotesListScreen({ navigation }) {
  const { creditNotes, fetchCreditNotes, loading, page, limit, total, search, setFilters } = useCreditNotesStore();

  useEffect(() => {
    fetchCreditNotes();
  }, [page, search]);

  return (
    <View style={styles.container}>
      <Text style={theme.typography.title}>Credit Notes</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by credit note number..."
        placeholderTextColor={theme.colors.textMuted}
        value={search}
        onChangeText={(val) => setFilters({ search: val, page: 1 })}
      />
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={creditNotes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => navigation.navigate('CreditNoteDetail', { id: item.id })}
            >
              <View>
                <Text style={styles.cardTitle}>{item.creditNoteNumber}</Text>
                <Text style={theme.typography.caption}>Reason: {item.reason}</Text>
                <Text style={theme.typography.caption}>Credit Total: INR {Number(item.grandTotal).toLocaleString()}</Text>
              </View>
              <Text style={styles.cardAction}>View</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No credit notes processed.</Text>}
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
    </View>
  );
}

export function CreditNoteDetailScreen({ route }) {
  const { id } = route.params;
  const { creditNotes } = useCreditNotesStore();
  const cn = creditNotes.find(c => c.id === id);

  if (!cn) return null;

  return (
    <ScrollView style={styles.container}>
      <Text style={theme.typography.title}>Credit Note: {cn.creditNoteNumber}</Text>
      <View style={styles.detailCard}>
        <Text style={styles.detailLabel}>Invoice ID: <Text style={styles.detailValue}>{cn.invoiceId}</Text></Text>
        <Text style={styles.detailLabel}>Credit Subtotal: <Text style={styles.detailValue}>INR {Number(cn.subtotal).toLocaleString()}</Text></Text>
        <Text style={styles.detailLabel}>Credit GST Amount: <Text style={styles.detailValue}>INR {Number(cn.gstAmount).toLocaleString()}</Text></Text>
        <Text style={styles.detailLabel}>Credit Grand Total: <Text style={[styles.detailValue, {color: theme.colors.success}]}>INR {Number(cn.grandTotal).toLocaleString()}</Text></Text>
        <Text style={styles.detailLabel}>Reason: <Text style={styles.detailValue}>{cn.reason}</Text></Text>
        <Text style={styles.detailLabel}>Date Issued: <Text style={styles.detailValue}>{new Date(cn.createdAt).toLocaleString()}</Text></Text>
      </View>
    </ScrollView>
  );
}

import { api } from '../../shared/utils/api';

export function CreditNoteFormScreen({ route, navigation }) {
  const { invoiceId } = route.params;
  const { createCreditNote } = useCreditNotesStore();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [qty, setQty] = useState('1');

  useEffect(() => {
    async function loadInvoice() {
      try {
        const data = await api.get(`/invoices/${invoiceId}`);
        setInvoice(data);
      } catch (err) {
        Alert.alert('Error loading invoice', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadInvoice();
  }, [invoiceId]);

  const handleSave = async () => {
    if (!reason.trim()) return Alert.alert('Error', 'Reason for credit note required.');
    if (!selectedItemId.trim()) return Alert.alert('Error', 'Please select an invoice item.');

    try {
      await createCreditNote({
        invoiceId,
        reason,
        creditNoteItems: [
          { invoiceItemId: selectedItemId, quantity: Number(qty) }
        ]
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Credit Note Issue Failed', err.message);
    }
  };

  if (loading) return <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />;
  if (!invoice) return <Text style={styles.emptyText}>Invoice not found.</Text>;

  return (
    <ScrollView style={styles.container}>
      <Text style={theme.typography.title}>Issue Credit Note</Text>
      <View style={styles.form}>
        <Text style={styles.label}>Invoice</Text>
        <Text style={styles.selectedLabel}>{invoice.invoiceNumber} (Total: INR {Number(invoice.grandTotal).toLocaleString()})</Text>
        
        <Text style={styles.label}>Select Item to Credit *</Text>
        {(invoice.invoiceItems || []).map(item => (
          <TouchableOpacity 
            key={item.id} 
            style={[styles.selectItem, selectedItemId === item.id && styles.selectItemActive]} 
            onPress={() => setSelectedItemId(item.id)}
          >
            <Text style={styles.selectItemText}>
              {item.description} (Rate: INR {Number(item.rate).toLocaleString()} | Qty: {item.quantity})
            </Text>
          </TouchableOpacity>
        ))}

        <Text style={[styles.label, { marginTop: 12 }]}>Quantity to Credit *</Text>
        <TextInput style={styles.input} value={qty} onChangeText={setQty} keyboardType="numeric" placeholder="1" placeholderTextColor={theme.colors.textMuted} />

        <Text style={styles.label}>Reason for Reversal *</Text>
        <TextInput style={styles.input} value={reason} onChangeText={setReason} placeholder="Service fee discount correction" placeholderTextColor={theme.colors.textMuted} />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Process Reversal</Text>
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
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.md },
  pageButton: { backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: 6 },
  pageButtonText: { color: theme.colors.text, fontWeight: '600' },
  detailCard: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: 8, marginVertical: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  detailLabel: { color: theme.colors.textMuted, fontSize: 14, marginVertical: theme.spacing.xs },
  detailValue: { color: theme.colors.text, fontWeight: '600' },
  form: { marginVertical: theme.spacing.md },
  label: { color: theme.colors.text, marginVertical: theme.spacing.xs, fontWeight: '600' },
  input: { backgroundColor: theme.colors.surface, color: theme.colors.text, padding: theme.spacing.md, borderRadius: 8, borderColor: theme.colors.border, borderWidth: 1, marginVertical: theme.spacing.xs },
  disabledInput: { color: theme.colors.textMuted, backgroundColor: theme.colors.background },
  saveButton: { backgroundColor: theme.colors.success, padding: theme.spacing.md, borderRadius: 8, alignItems: 'center', marginVertical: theme.spacing.lg },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  selectItem: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: 8, marginVertical: 4, borderWidth: 1, borderColor: theme.colors.border },
  selectItemActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.primary + '10' },
  selectItemText: { color: theme.colors.text, fontWeight: '500' },
  selectedLabel: { color: theme.colors.text, fontWeight: '600', marginBottom: 12 }
});
