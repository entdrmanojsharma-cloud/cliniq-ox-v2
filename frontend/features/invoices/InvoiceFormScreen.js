import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useInvoicesStore } from './store';
import { api } from '../../shared/utils/api';
import { theme } from '../../shared/styles/theme';

export function InvoiceFormScreen({ route, navigation }) {
  const { createInvoice, updateInvoice } = useInvoicesStore();
  const { id } = route?.params || {};
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [patientId, setPatientId] = useState('');
  const [estimateId, setEstimateId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [estimate, setEstimate] = useState(null);

  // Load existing invoice if in Edit mode
  useEffect(() => {
    if (isEdit) {
      const loadInvoice = async () => {
        try {
          const invData = await api.get(`/invoices/${id}`);
          setPatientId(invData.patientId);
          setEstimateId(invData.estimateId || '');
          setInvoiceNumber(invData.invoiceNumber);
          setInvoiceItems(invData.invoiceItems.map(item => ({
            estimateItemId: item.estimateItemId,
            estimateSurgeryId: item.estimateSurgeryId,
            description: item.description,
            rate: Number(item.rate),
            quantity: item.quantity
          })));
        } catch (err) {
          Alert.alert('Load Error', err.message);
        } finally {
          setLoading(false);
        }
      };
      loadInvoice();
    }
  }, [id, isEdit]);

  // Load estimate items when estimateId changes or is loaded
  useEffect(() => {
    const loadEstimate = async () => {
      if (!estimateId || estimateId.length < 36) {
        setEstimate(null);
        return;
      }
      try {
        const estData = await api.get(`/estimates/${estimateId}`);
        setEstimate(estData);
      } catch (err) {
        console.log('Error loading estimate:', err.message);
        setEstimate(null);
      }
    };
    loadEstimate();
  }, [estimateId]);

  const handleSave = async () => {
    if (!patientId.trim()) return Alert.alert('Error', 'Patient ID is required.');
    if (invoiceItems.length === 0) return Alert.alert('Error', 'At least one invoice item is required.');

    // Validate that all items have positive quantity and non-negative rate
    for (const item of invoiceItems) {
      if (item.quantity <= 0) {
        return Alert.alert('Error', `Quantity for "${item.description}" must be positive.`);
      }
      if (item.rate < 0) {
        return Alert.alert('Error', `Rate for "${item.description}" cannot be negative.`);
      }
    }

    try {
      const payload = {
        patientId,
        estimateId: estimateId || null,
        invoiceItems: invoiceItems.map(item => ({
          estimateItemId: item.estimateItemId,
          estimateSurgeryId: item.estimateSurgeryId,
          rate: Number(item.rate),
          quantity: Number(item.quantity)
        }))
      };

      if (isEdit) {
        await updateInvoice(id, payload);
        Alert.alert('Success', 'Invoice updated successfully.');
      } else {
        await createInvoice(payload);
        Alert.alert('Success', 'Invoice created successfully.');
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert(isEdit ? 'Update Failed' : 'Create Failed', err.message);
    }
  };

  const updateItemProp = (index, prop, value) => {
    const updated = [...invoiceItems];
    if (prop === 'quantity') {
      updated[index][prop] = parseInt(value, 10) || 0;
    } else if (prop === 'rate') {
      updated[index][prop] = parseFloat(value) || 0;
    }
    setInvoiceItems(updated);
  };

  const deleteItem = (index) => {
    const updated = invoiceItems.filter((_, idx) => idx !== index);
    setInvoiceItems(updated);
  };

  const addItemFromEstimate = (estItem, isSurgery = false) => {
    const exists = invoiceItems.some(item => 
      isSurgery ? item.estimateSurgeryId === estItem.id : item.estimateItemId === estItem.id
    );
    if (exists) {
      return Alert.alert('Already Added', 'This item is already in the invoice.');
    }

    const newItem = {
      estimateItemId: isSurgery ? null : estItem.id,
      estimateSurgeryId: isSurgery ? estItem.id : null,
      description: isSurgery ? estItem.surgery?.surgeryName : estItem.description,
      rate: isSurgery ? Number(estItem.surgeryCost) : Number(estItem.rate),
      quantity: isSurgery ? 1 : Number(estItem.quantity)
    };

    setInvoiceItems([...invoiceItems, newItem]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Calculate totals for preview
  const subtotal = invoiceItems.reduce((sum, item) => sum + (item.rate * item.quantity), 0);
  const gstRate = estimate ? Number(estimate.gstRate || 18) : 18;
  const gstAmount = subtotal * (gstRate / 100);
  const grandTotal = subtotal + gstAmount;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={theme.typography.title}>
        {isEdit ? `Edit Invoice: ${invoiceNumber}` : 'New Invoice (Draft)'}
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Invoice Details</Text>
        <Text style={styles.label}>Patient ID *</Text>
        <TextInput 
          style={[styles.input, isEdit && styles.inputDisabled]} 
          value={patientId} 
          onChangeText={setPatientId} 
          editable={!isEdit} 
          placeholder="Patient UUID" 
          placeholderTextColor={theme.colors.textMuted} 
        />
        
        <Text style={styles.label}>Linked Estimate ID (Optional)</Text>
        <TextInput 
          style={[styles.input, isEdit && styles.inputDisabled]} 
          value={estimateId} 
          onChangeText={setEstimateId} 
          editable={!isEdit} 
          placeholder="Estimate UUID" 
          placeholderTextColor={theme.colors.textMuted} 
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Invoice Items</Text>
        {invoiceItems.length === 0 ? (
          <Text style={styles.emptyText}>No items added to invoice yet.</Text>
        ) : (
          invoiceItems.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemDescription}>{item.description}</Text>
                <TouchableOpacity onPress={() => deleteItem(idx)} style={styles.deleteButton}>
                  <Text style={styles.deleteButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.itemInputs}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Rate (INR)</Text>
                  <TextInput 
                    style={styles.smallInput} 
                    value={String(item.rate)} 
                    onChangeText={(val) => updateItemProp(idx, 'rate', val)} 
                    keyboardType="numeric" 
                  />
                </View>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Quantity</Text>
                  <TextInput 
                    style={styles.smallInput} 
                    value={String(item.quantity)} 
                    onChangeText={(val) => updateItemProp(idx, 'quantity', val)} 
                    keyboardType="numeric" 
                  />
                </View>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Amount</Text>
                  <Text style={styles.amountText}>
                    INR {(item.rate * item.quantity).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {estimate && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Items from Estimate</Text>
          
          {/* Estimate Surgeries */}
          {estimate.estimateSurgeries?.length > 0 && (
            <View style={styles.estSubSection}>
              <Text style={styles.subTitle}>Surgeries</Text>
              {estimate.estimateSurgeries.map((surg) => {
                const isAdded = invoiceItems.some(item => item.estimateSurgeryId === surg.id);
                return (
                  <View key={surg.id} style={styles.estItemRow}>
                    <View style={styles.estItemDetails}>
                      <Text style={styles.estItemName}>{surg.surgery?.surgeryName || 'Surgery'}</Text>
                      <Text style={styles.estItemMeta}>Cost: INR {Number(surg.surgeryCost).toLocaleString()}</Text>
                    </View>
                    <TouchableOpacity 
                      style={[styles.addButton, isAdded && styles.addButtonDisabled]} 
                      onPress={() => !isAdded && addItemFromEstimate(surg, true)}
                      disabled={isAdded}
                    >
                      <Text style={styles.addButtonText}>{isAdded ? 'Added' : '+ Add'}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Estimate Items */}
          {estimate.estimateItems?.length > 0 && (
            <View style={styles.estSubSection}>
              <Text style={styles.subTitle}>Line Items</Text>
              {estimate.estimateItems.map((item) => {
                const isAdded = invoiceItems.some(ii => ii.estimateItemId === item.id);
                return (
                  <View key={item.id} style={styles.estItemRow}>
                    <View style={styles.estItemDetails}>
                      <Text style={styles.estItemName}>{item.description}</Text>
                      <Text style={styles.estItemMeta}>Rate: INR {Number(item.rate).toLocaleString()} | Qty: {item.quantity}</Text>
                    </View>
                    <TouchableOpacity 
                      style={[styles.addButton, isAdded && styles.addButtonDisabled]} 
                      onPress={() => !isAdded && addItemFromEstimate(item, false)}
                      disabled={isAdded}
                    >
                      <Text style={styles.addButtonText}>{isAdded ? 'Added' : '+ Add'}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {invoiceItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Totals Preview</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>INR {subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>GST ({gstRate}%):</Text>
            <Text style={styles.totalValue}>INR {gstAmount.toLocaleString()}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { fontWeight: '700', color: theme.colors.accent }]}>Grand Total:</Text>
            <Text style={[styles.totalValue, { fontWeight: '700', color: theme.colors.accent }]}>
              INR {grandTotal.toLocaleString()}
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>
          {isEdit ? 'Save Changes' : 'Create Invoice'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  center: { justifyContent: 'center', alignItems: 'center' },
  section: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: 8, marginVertical: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 6 },
  label: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 8 },
  input: { backgroundColor: theme.colors.background, color: theme.colors.text, padding: theme.spacing.sm, borderRadius: 6, borderColor: theme.colors.border, borderWidth: 1, marginTop: 4 },
  inputDisabled: { backgroundColor: '#1e293b70', color: theme.colors.textMuted, borderColor: '#33415550' },
  emptyText: { color: theme.colors.textMuted, textAlign: 'center', marginVertical: 12 },
  itemRow: { borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingVertical: 12 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemDescription: { color: theme.colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  deleteButton: { padding: 4, width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.danger + '20', justifyContent: 'center', alignItems: 'center' },
  deleteButtonText: { color: theme.colors.danger, fontWeight: '700', fontSize: 14 },
  itemInputs: { flexDirection: 'row', gap: 12 },
  inputCol: { flex: 1 },
  inputLabel: { color: theme.colors.textMuted, fontSize: 11, marginBottom: 4 },
  smallInput: { backgroundColor: theme.colors.background, color: theme.colors.text, padding: 6, borderRadius: 4, borderColor: theme.colors.border, borderWidth: 1, fontSize: 13 },
  amountText: { color: theme.colors.text, fontSize: 13, fontWeight: '600', paddingTop: 8 },
  estSubSection: { marginTop: 12 },
  subTitle: { color: theme.colors.accent, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  estItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border + '50' },
  estItemDetails: { flex: 1 },
  estItemName: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
  estItemMeta: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
  addButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  addButtonDisabled: { backgroundColor: theme.colors.border, opacity: 0.5 },
  addButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { color: theme.colors.textMuted, fontSize: 13 },
  totalValue: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
  saveButton: { backgroundColor: theme.colors.success, padding: theme.spacing.md, borderRadius: 8, alignItems: 'center', marginVertical: theme.spacing.lg, marginBottom: 48 },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' }
});
