import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Platform, Modal, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useEstimatesStore } from './store';
import { useInvoicesStore } from '../invoices/store';
import { useAuthStore } from '../auth/store';
import { theme } from '../../shared/styles/theme';
import { api } from '../../shared/utils/api';

export function EstimateDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { estimates, updateStatus } = useEstimatesStore();
  const [est, setEst] = useState(() => estimates.find(e => e.id === id));
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    let isMounted = true;
    const storeEst = estimates.find(e => e.id === id);
    if (storeEst) {
      setEst(storeEst);
    } else {
      setLoading(true);
      api.get(`/estimates/${id}`)
        .then(data => {
          if (isMounted && data) setEst(data);
        })
        .catch(err => {
          if (isMounted) Alert.alert('Error', 'Failed to load estimate');
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }
    return () => { isMounted = false; };
  }, [estimates, id]);

  const role = useAuthStore(state => state.role);
  const canApprove = ['DOCTOR', 'ADMIN', 'SUPER_ADMIN'].includes(role);

  const [remarksModalVisible, setRemarksModalVisible] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');
  const [remarks, setRemarks] = useState('');

  if (loading) return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  if (!est) return null;

  const handleStatusChange = async (newStatus, statusRemarks) => {
    try {
      await updateStatus(id, newStatus, statusRemarks);
      Alert.alert('Success', `Status updated to ${newStatus}`);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handlePrintPDF = async () => {
    try {
      const { token, hospitalId } = useAuthStore.getState();
      const { BASE_URL } = require('../../shared/utils/api');
      
      const response = await fetch(`${BASE_URL}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-hospital-id': hospitalId
        },
        body: JSON.stringify({ documentType: 'ESTIMATE', targetId: id })
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error?.message || 'Failed to generate PDF');
      }

      if (Platform.OS === 'web') {
        const htmlContent = await response.text();
        const html2pdf = (await import('html2pdf.js')).default || (await import('html2pdf.js'));
        
        const opt = {
          margin:       0.4,
          filename:     `Estimate-${est.estimateNumber || 'Document'}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        
        html2pdf().set(opt).from(htmlContent).save();
      } else {
        Alert.alert('Success', 'HTML fetched. Native PDF generation to be implemented.');
      }
    } catch (err) {
      Alert.alert('Print Failed', err.message);
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      const invoiceItems = [
        ...(est.estimateSurgeries || []).map(s => ({
          estimateSurgeryId: s.id,
          quantity: 1,
          rate: Number(s.finalAmount)
        })),
        ...(est.estimateItems || []).map(i => ({
          estimateItemId: i.id,
          quantity: Number(i.quantity),
          rate: Number(i.rate)
        }))
      ];

      const patientId = est.event?.patientId || est.event?.patient?.id;
      if (!patientId) {
        throw new Error('Associated patient record not found.');
      }

      const res = await useInvoicesStore.getState().createInvoice({
        estimateId: est.id,
        patientId,
        invoiceItems
      });

      Alert.alert('Success', 'Invoice generated successfully as DRAFT.', [
        { text: 'View Invoice', onPress: () => navigation.navigate('InvoiceDetail', { id: res.id }) },
        { text: 'Dismiss' }
      ]);
    } catch (err) {
      Alert.alert('Invoicing Failed', err.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={theme.typography.title}>Estimate: {est.estimateNumber}</Text>
      <View style={styles.detailCard}>
        <Text style={styles.detailLabel}>Status: <Text style={styles.detailValue}>{est.status}</Text></Text>
        <Text style={styles.detailLabel}>Billing: <Text style={styles.detailValue}>{est.billingStatus}</Text></Text>
        
        <Text style={styles.detailLabel}>
          Consultant Surgeon:{' '}
          <Text style={styles.detailValue}>
            {est.surgeon
              ? `Dr. ${est.surgeon.firstName} ${est.surgeon.lastName}`
              : est.event?.doctor
              ? `Dr. ${est.event.doctor.firstName} ${est.event.doctor.lastName}`
              : 'N/A'}
          </Text>
        </Text>

        {est.diagnoses && est.diagnoses.length > 0 ? (
          <Text style={styles.detailLabel}>
            Diagnoses: <Text style={styles.detailValue}>{est.diagnoses.join(', ')}</Text>
          </Text>
        ) : null}

        <Text style={styles.detailLabel}>Expected Duration: <Text style={styles.detailValue}>{est.expectedDurationMinutes} min</Text></Text>
        <Text style={styles.detailLabel}>Expected Stay: <Text style={styles.detailValue}>{est.expectedStayDays} days</Text></Text>
        <Text style={styles.detailLabel}>Subtotal: <Text style={styles.detailValue}>INR {Number(est.subtotal).toLocaleString()}</Text></Text>
        <Text style={styles.detailLabel}>Discount: <Text style={styles.detailValue}>INR {Number(est.discount).toLocaleString()}</Text></Text>
        <Text style={styles.detailLabel}>Taxable Amount: <Text style={styles.detailValue}>INR {Number(est.taxableAmount).toLocaleString()}</Text></Text>
        <Text style={styles.detailLabel}>GST (18%): <Text style={styles.detailValue}>INR {Number(est.gstAmount).toLocaleString()}</Text></Text>
        <Text style={styles.detailLabel}>Grand Total: <Text style={[styles.detailValue, {color: theme.colors.accent}]}>INR {Number(est.grandTotal).toLocaleString()}</Text></Text>
        
        {est.approvalRemark ? (
          <Text style={[styles.detailLabel, {marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.border}]}>
            Doctor Remarks: <Text style={styles.detailValue}>{est.approvalRemark}</Text>
          </Text>
        ) : null}

        {est.isPackage ? (
          <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
            <Text style={styles.detailLabel}>Package Name: <Text style={styles.detailValue}>{est.packageName}</Text></Text>
            <Text style={styles.detailLabel}>Package Price: <Text style={[styles.detailValue, {color: theme.colors.success}]}>INR {Number(est.packagePrice).toLocaleString()}</Text></Text>
            <Text style={styles.detailLabel}>Package Includes: <Text style={[styles.detailValue, {fontWeight: 'normal'}]}>{est.packageIncludes}</Text></Text>
          </View>
        ) : null}
      </View>
      <View style={styles.buttonGrid}>
        {/* Doctor and Admin approval actions */}
        {(est.status === 'DRAFT' || est.status === 'PENDING_APPROVAL' || est.status === 'REJECTED') && canApprove && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity 
              style={[styles.actionButton, { flex: 1, backgroundColor: theme.colors.success }]} 
              onPress={() => { setPendingStatus('APPROVED'); setRemarksModalVisible(true); }}
            >
              <Text style={styles.buttonText}>✓ Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { flex: 1, backgroundColor: theme.colors.danger }]} 
              onPress={() => { setPendingStatus('REJECTED'); setRemarksModalVisible(true); }}
            >
              <Text style={styles.buttonText}>✕ Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Non-doctor Submit for Approval flow */}
        {(est.status === 'DRAFT' || est.status === 'REJECTED') && !canApprove && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]} 
            onPress={() => handleStatusChange('PENDING_APPROVAL')}
          >
            <Text style={styles.buttonText}>📤 Submit for Doctor Approval</Text>
          </TouchableOpacity>
        )}

        {est.status === 'PENDING_APPROVAL' && !canApprove && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>⏳ Pending Doctor Approval</Text>
          </View>
        )}

        {est.status === 'APPROVED' && (
          <TouchableOpacity style={styles.actionButton} onPress={() => handleStatusChange('LOCKED')}>
            <Text style={styles.buttonText}>Lock Revision</Text>
          </TouchableOpacity>
        )}
        
        {est.status === 'LOCKED' && canApprove && (
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.warning }]} onPress={() => handleStatusChange('APPROVED')}>
            <Text style={[styles.buttonText, { color: '#000000' }]}>🔓 Unlock Revision</Text>
          </TouchableOpacity>
        )}
        
        {(est.status === 'APPROVED' || est.status === 'LOCKED') && (
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.primary }]} onPress={handlePrintPDF}>
            <Text style={styles.buttonText}>🖨️ Print Estimate PDF</Text>
          </TouchableOpacity>
        )}
        
        {(est.status === 'APPROVED' || est.status === 'LOCKED') && est.billingStatus !== 'FULLY_BILLED' && (
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.primaryLight }]} onPress={handleGenerateInvoice}>
            <Text style={styles.buttonText}>Generate Billing Invoice</Text>
          </TouchableOpacity>
        )}
        
        {est.status !== 'LOCKED' && est.billingStatus !== 'FULLY_BILLED' && (
          <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('EstimateForm', { id })}>
            <Text style={styles.buttonText}>Edit Draft</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Remarks Modal for Approval/Rejection */}
      <Modal
        visible={remarksModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRemarksModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRemarksModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {pendingStatus === 'APPROVED' ? 'Approve Estimate' : 'Reject Estimate'}
            </Text>
            
            <Text style={styles.modalLabel}>Remarks / Comments</Text>
            <TextInput
              style={styles.modalInput}
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Enter remarks (e.g. Clinical parameters verified...)"
              placeholderTextColor={theme.colors.textMuted}
              multiline
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalCancelBtn]} 
                onPress={() => { setRemarksModalVisible(false); setRemarks(''); }}
              >
                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.modalBtn, 
                  pendingStatus === 'APPROVED' ? styles.modalApproveBtn : styles.modalRejectBtn
                ]} 
                onPress={() => {
                  handleStatusChange(pendingStatus, remarks);
                  setRemarksModalVisible(false);
                  setRemarks('');
                }}
              >
                <Text style={styles.modalBtnTextConfirm}>
                  {pendingStatus === 'APPROVED' ? 'Confirm Approve' : 'Confirm Reject'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  loader: { marginVertical: theme.spacing.xl },
  detailCard: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: 8, marginVertical: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  detailLabel: { color: theme.colors.textMuted, fontSize: 14, marginVertical: theme.spacing.xs },
  detailValue: { color: theme.colors.text, fontWeight: '600' },
  buttonGrid: { gap: theme.spacing.xs, paddingBottom: 24 },
  actionButton: { backgroundColor: theme.colors.success, padding: theme.spacing.md, borderRadius: 8, alignItems: 'center' },
  editButton: { backgroundColor: theme.colors.primary, padding: theme.spacing.md, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontWeight: '700' },
  pendingBadge: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#f59e0b', padding: theme.spacing.md, borderRadius: 8, alignItems: 'center', marginVertical: theme.spacing.xs },
  pendingText: { color: '#d97706', fontWeight: '700' },
  
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 20, width: '100%', maxWidth: 440, borderWidth: 1, borderColor: theme.colors.border },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text, marginBottom: 12 },
  modalLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 4 },
  modalInput: { backgroundColor: theme.colors.background, color: theme.colors.text, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, minHeight: 80, textAlignVertical: 'top', marginBottom: 16, fontSize: 14 },
  modalButtonRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalCancelBtn: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border },
  modalApproveBtn: { backgroundColor: theme.colors.success },
  modalRejectBtn: { backgroundColor: theme.colors.danger },
  modalBtnTextCancel: { color: theme.colors.textMuted, fontWeight: '700' },
  modalBtnTextConfirm: { color: '#ffffff', fontWeight: '700' }
});
