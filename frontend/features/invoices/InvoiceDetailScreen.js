import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { useInvoicesStore } from './store';
import { api } from '../../shared/utils/api';
import { theme } from '../../shared/styles/theme';
import { useAuthStore } from '../auth/store';

export function InvoiceDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { finalizeInvoice, cancelInvoice, allocatePayment } = useInvoicesStore();
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState('');
  const [allocationAmount, setAllocationAmount] = useState('');

  const handlePrintDocument = async (documentType, targetId) => {
    try {
      const { token, hospitalId } = useAuthStore.getState();
      const getDynamicBaseUrl = () => {
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined' && window.location) {
            return `http://${window.location.hostname}:3000/api/v1`;
          }
          return 'http://localhost:3000/api/v1';
        }
        return 'http://192.168.0.124:3000/api/v1';
      };
      const baseUrl = getDynamicBaseUrl();
      
      const response = await fetch(`${baseUrl}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-hospital-id': hospitalId
        },
        body: JSON.stringify({ documentType, targetId })
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error?.message || `Failed to generate PDF for ${documentType}`);
      }

      if (Platform.OS === 'web') {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        Alert.alert('Success', `${documentType} PDF generated successfully on server.`);
      }
    } catch (err) {
      Alert.alert('Print Failed', err.message);
    }
  };

  const loadInvoiceData = async () => {
    try {
      const data = await api.get(`/invoices/${id}`);
      setInv(data);
      if (data.status === 'FINALIZED' && data.paymentStatus !== 'PAID') {
        const recData = await api.get(`/receipts?patientId=${data.patientId}`);
        setReceipts(recData.receipts || []);
      }
    } catch (err) {
      Alert.alert('Load Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoiceData();
  }, [id]);

  const handleFinalize = async () => {
    try {
      await finalizeInvoice(id);
      Alert.alert('Success', 'Invoice finalized successfully.');
      loadInvoiceData();
    } catch (err) {
      Alert.alert('Finalize Failed', err.message);
    }
  };

  const handleCancel = async () => {
    Alert.alert('Cancel Invoice', 'Are you sure you want to cancel this invoice? Any payments will be refunded to patient ledger.', [
      { text: 'No' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          try {
            await cancelInvoice(id);
            Alert.alert('Success', 'Invoice cancelled.');
            loadInvoiceData();
          } catch (err) {
            Alert.alert('Cancel Failed', err.message);
          }
        }}
    ]);
  };

  const handleAllocate = async () => {
    if (!selectedReceiptId) return Alert.alert('Error', 'Please select a deposit receipt.');
    if (Number(allocationAmount) <= 0) return Alert.alert('Error', 'Positive allocation amount is required.');

    try {
      await allocatePayment({
        invoiceId: id,
        receiptId: selectedReceiptId,
        amountAllocated: Number(allocationAmount)
      });
      Alert.alert('Success', 'Payment allocated successfully.');
      setAllocationAmount('');
      setSelectedReceiptId('');
      loadInvoiceData();
    } catch (err) {
      Alert.alert('Allocation Failed', err.message);
    }
  };

  if (loading) return <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />;
  if (!inv) return <Text style={styles.emptyText}>Invoice not found.</Text>;

  const totalAllocated = (inv.allocations || []).reduce((sum, a) => sum + Number(a.amountAllocated), 0);
  const totalCredited = (inv.creditNotes || []).reduce((sum, c) => sum + Number(c.grandTotal), 0);
  const outstandingAmount = Number(inv.grandTotal) - totalAllocated - totalCredited;

  return (
    <ScrollView style={styles.container}>
      <Text style={theme.typography.title}>Invoice: {inv.invoiceNumber}</Text>
      <View style={styles.detailCard}>
        <Text style={styles.detailLabel}>Status: <Text style={styles.detailValue}>{inv.status}</Text></Text>
        <Text style={styles.detailLabel}>Payment Status: <Text style={styles.detailValue}>{inv.paymentStatus}</Text></Text>
        <Text style={styles.detailLabel}>Patient: <Text style={styles.detailValue}>{inv.patient?.name || inv.patientId}</Text></Text>
        <Text style={styles.detailLabel}>Subtotal: <Text style={styles.detailValue}>INR {Number(inv.subtotal).toLocaleString()}</Text></Text>
        <Text style={styles.detailLabel}>GST: <Text style={styles.detailValue}>INR {Number(inv.gstAmount).toLocaleString()}</Text></Text>
        <Text style={styles.detailLabel}>Grand Total: <Text style={[styles.detailValue, {color: theme.colors.accent}]}>INR {Number(inv.grandTotal).toLocaleString()}</Text></Text>
        <Text style={styles.detailLabel}>Remaining Due: <Text style={[styles.detailValue, {color: theme.colors.danger}]}>INR {Number(outstandingAmount).toLocaleString()}</Text></Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ledger & Allocations</Text>
        {(inv.allocations || []).map((alloc, idx) => (
          <View key={idx} style={styles.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listItemText}>Allocated from receipt {alloc.receipt?.receiptNumber || alloc.receiptId}</Text>
              <Text style={styles.listAmount}>+ INR {Number(alloc.amountAllocated).toLocaleString()}</Text>
            </View>
            <TouchableOpacity 
              style={styles.printBadge} 
              onPress={() => handlePrintDocument('RECEIPT', alloc.receiptId)}
            >
              <Text style={styles.printBadgeText}>Print Receipt</Text>
            </TouchableOpacity>
          </View>
        ))}
        {(inv.creditNotes || []).map((cn, idx) => (
          <View key={idx} style={styles.listItem}>
            <Text style={[styles.listItemText, { color: theme.colors.success }]}>Credit Note {cn.creditNoteNumber}</Text>
            <Text style={[styles.listAmount, { color: theme.colors.success }]}>+ INR {Number(cn.grandTotal).toLocaleString()}</Text>
          </View>
        ))}
      </View>

      {inv.status === 'FINALIZED' && inv.paymentStatus !== 'PAID' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allocate Advance Deposit</Text>
          {receipts.length === 0 ? (
            <Text style={styles.emptyText}>No available deposit receipts for this patient.</Text>
          ) : (
            <>
              {receipts.map(rec => (
                <TouchableOpacity 
                  key={rec.id} 
                  style={[styles.selectItem, selectedReceiptId === rec.id && styles.selectItemActive]} 
                  onPress={() => setSelectedReceiptId(rec.id)}
                >
                  <Text style={styles.selectItemText}>
                    {rec.receiptNumber} | Deposited: INR {Number(rec.amount).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
              <TextInput 
                style={styles.input} 
                value={allocationAmount} 
                onChangeText={setAllocationAmount} 
                keyboardType="numeric" 
                placeholder="Allocation Amount (INR)" 
                placeholderTextColor={theme.colors.textMuted} 
              />
              <TouchableOpacity style={styles.allocateButton} onPress={handleAllocate}>
                <Text style={styles.buttonText}>Confirm Allocation</Text>
              </TouchableOpacity>
            </>
          )}
          
          <TouchableOpacity 
            style={[styles.allocateButton, { backgroundColor: theme.colors.primaryLight, marginTop: 12 }]} 
            onPress={() => navigation.navigate('ReceiptForm', { patientId: inv.patientId, estimateId: inv.estimateId, defaultAmount: String(outstandingAmount) })}
          >
            <Text style={styles.buttonText}>Record New Patient Deposit</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.buttonList}>
        {inv.status === 'DRAFT' && (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.colors.primary, marginBottom: 8 }]} 
              onPress={() => navigation.navigate('InvoiceForm', { id: inv.id })}
            >
              <Text style={styles.buttonText}>Edit Invoice</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleFinalize}>
              <Text style={styles.buttonText}>Finalize Invoice</Text>
            </TouchableOpacity>
          </>
        )}
        {inv.status !== 'CANCELLED' && (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.colors.accent, marginBottom: 8 }]} 
              onPress={() => handlePrintDocument('INVOICE', inv.id)}
            >
              <Text style={styles.buttonText}>Print Invoice</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.buttonText}>Cancel Invoice</Text>
            </TouchableOpacity>
          </>
        )}
        {inv.status === 'FINALIZED' && (
          <TouchableOpacity style={styles.creditNoteButton} onPress={() => navigation.navigate('CreditNoteForm', { invoiceId: id })}>
            <Text style={styles.buttonText}>Issue Credit Note</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  loader: { marginVertical: theme.spacing.xl },
  detailCard: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: 8, marginVertical: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  detailLabel: { color: theme.colors.textMuted, fontSize: 14, marginVertical: theme.spacing.xs },
  detailValue: { color: theme.colors.text, fontWeight: '600' },
  section: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: 8, marginVertical: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  listItemText: { color: theme.colors.text, fontSize: 13 },
  listAmount: { color: theme.colors.accent, fontWeight: '600' },
  selectItem: { backgroundColor: theme.colors.background, padding: theme.spacing.sm, borderRadius: 6, marginVertical: 4, borderWidth: 1, borderColor: theme.colors.border },
  selectItemActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.primary + '10' },
  selectItemText: { color: theme.colors.text, fontSize: 13 },
  input: { backgroundColor: theme.colors.background, color: theme.colors.text, padding: theme.spacing.md, borderRadius: 8, borderColor: theme.colors.border, borderWidth: 1, marginVertical: theme.spacing.xs },
  buttonList: { gap: theme.spacing.sm, marginVertical: theme.spacing.md, paddingBottom: 32 },
  actionButton: { backgroundColor: theme.colors.success, padding: theme.spacing.md, borderRadius: 8, alignItems: 'center' },
  allocateButton: { backgroundColor: theme.colors.primary, padding: theme.spacing.md, borderRadius: 8, alignItems: 'center', marginVertical: theme.spacing.xs },
  cancelButton: { backgroundColor: theme.colors.danger, padding: theme.spacing.md, borderRadius: 8, alignItems: 'center' },
  creditNoteButton: { backgroundColor: '#8b5cf6', padding: theme.spacing.md, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontWeight: '700' },
  emptyText: { color: theme.colors.textMuted, textAlign: 'center', marginVertical: 8 },
  printBadge: { backgroundColor: theme.colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  printBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '700' }
});
