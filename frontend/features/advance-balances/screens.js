/* 
  Purpose: Define Advance Balances screens (Search List and Detailed Ledger Statement).
  Responsibility: Render balance cards, display ledger entries, and filter search input.
*/

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useAdvanceBalancesStore } from './store';
import { theme } from '../../shared/styles/theme';

export function AdvanceBalancesScreen({ navigation }) {
  const { balanceDetails, ledgerEntries, fetchBalanceDetails, fetchLedgerHistory, loading } = useAdvanceBalancesStore();
  const [patientId, setPatientId] = useState('');
  const [estimateId, setEstimateId] = useState('');

  const handleQuery = () => {
    if (!patientId.trim()) {
      return Alert.alert('Validation Error', 'Patient ID is required.');
    }
    fetchBalanceDetails(patientId, estimateId || null);
    fetchLedgerHistory(patientId, estimateId || null);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={theme.typography.title}>Patient Advance Pool</Text>
      
      <View style={styles.searchBox}>
        <Text style={styles.label}>Patient UUID *</Text>
        <TextInput 
          style={styles.input} 
          value={patientId} 
          onChangeText={setPatientId} 
          placeholder="Enter Patient ID..." 
          placeholderTextColor={theme.colors.textMuted} 
        />
        <Text style={styles.label}>Estimate ID (Optional)</Text>
        <TextInput 
          style={styles.input} 
          value={estimateId} 
          onChangeText={setEstimateId} 
          placeholder="Enter Estimate ID..." 
          placeholderTextColor={theme.colors.textMuted} 
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleQuery}>
          <Text style={styles.searchButtonText}>Retrieve Statement</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />}

      {balanceDetails && !loading && (
        <View>
          <Text style={styles.sectionTitle}>Balance Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Deposited</Text>
              <Text style={[styles.summaryVal, { color: theme.colors.success }]}>
                INR {Number(balanceDetails.totalDeposited).toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Allocated</Text>
              <Text style={[styles.summaryVal, { color: theme.colors.primaryLight }]}>
                INR {Number(balanceDetails.totalAllocated).toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Refunded</Text>
              <Text style={[styles.summaryVal, { color: theme.colors.danger }]}>
                INR {Number(balanceDetails.totalRefunded).toLocaleString()}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelBold}>Available Advance Balance</Text>
              <Text style={styles.summaryValBold}>
                INR {Number(balanceDetails.currentBalance).toLocaleString()}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Ledger Audit Trail</Text>
          {ledgerEntries.length === 0 ? (
            <Text style={styles.emptyText}>No ledger entries recorded.</Text>
          ) : (
            ledgerEntries.map((item) => (
              <View key={item.id} style={styles.ledgerItem}>
                <View>
                  <Text style={styles.ledgerType}>{item.type}</Text>
                  <Text style={theme.typography.caption}>Ref: {item.referenceId}</Text>
                  <Text style={theme.typography.caption}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
                <Text style={[
                  styles.ledgerAmount,
                  item.type === 'DEPOSIT' ? styles.depositColor : styles.deductColor
                ]}>
                  {item.type === 'DEPOSIT' ? '+' : '-'} INR {Number(item.amount).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  searchBox: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, marginVertical: theme.spacing.sm },
  label: { color: theme.colors.text, fontWeight: '600', marginBottom: 4 },
  input: { backgroundColor: theme.colors.background, color: theme.colors.text, padding: theme.spacing.sm, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.sm },
  searchButton: { backgroundColor: theme.colors.primary, padding: theme.spacing.md, borderRadius: 8, alignItems: 'center' },
  searchButtonText: { color: '#ffffff', fontWeight: '700' },
  loader: { marginVertical: theme.spacing.xl },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  summaryCard: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { color: theme.colors.textMuted },
  summaryVal: { fontWeight: '600' },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 8 },
  summaryLabelBold: { color: theme.colors.text, fontWeight: '700' },
  summaryValBold: { color: theme.colors.accent, fontWeight: '700' },
  ledgerItem: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: 6, marginVertical: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  ledgerType: { color: theme.colors.text, fontWeight: '600', fontSize: 14 },
  ledgerAmount: { fontWeight: '700' },
  depositColor: { color: theme.colors.success },
  deductColor: { color: theme.colors.danger },
  emptyText: { color: theme.colors.textMuted, textAlign: 'center', marginVertical: theme.spacing.md }
});
