/* 
  Purpose: Define Billing Defaults Configuration Screen.
  Responsibility: Render form for all 16 billing default charges, handle fetching and saving, and gate editing for non-ADMIN users.
*/

import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useSettingsStore } from './store';
import { useAuthStore } from '../auth/store';
import { theme } from '../../shared/styles/theme';
import { useResponsive } from '../../shared/hooks/useResponsive';

export function BillingDefaultsScreen() {
  const { role } = useAuthStore();
  const { billingDefaults, fetchBillingDefaults, updateBillingDefaults, loading } = useSettingsStore();
  const { isMobile } = useResponsive();

  const isAdmin = role === 'ADMIN';

  // State for all 16 billing defaults
  const [otCharges, setOtCharges] = useState('0.00');
  const [gaCharges, setGaCharges] = useState('0.00');
  const [laCharges, setLaCharges] = useState('0.00');
  const [sedationCharges, setSedationCharges] = useState('0.00');
  const [assistantSurgeonCharges, setAssistantSurgeonCharges] = useState('0.00');
  const [surgeonCharges, setSurgeonCharges] = useState('0.00');
  const [roomCharges, setRoomCharges] = useState('0.00');
  const [icuCharges, setIcuCharges] = useState('0.00');
  const [wardCharges, setWardCharges] = useState('0.00');
  const [nursingCharges, setNursingCharges] = useState('0.00');
  const [monitoringCharges, setMonitoringCharges] = useState('0.00');
  const [dressingCharges, setDressingCharges] = useState('0.00');
  const [consumableCharges, setConsumableCharges] = useState('0.00');
  const [equipmentCharges, setEquipmentCharges] = useState('0.00');
  const [admissionCharges, setAdmissionCharges] = useState('0.00');
  const [registrationCharges, setRegistrationCharges] = useState('0.00');

  useEffect(() => {
    fetchBillingDefaults().catch(err => {
      Alert.alert('Error', 'Failed to fetch billing defaults.');
    });
  }, []);

  useEffect(() => {
    if (billingDefaults) {
      setOtCharges(String(billingDefaults.otCharges || '0.00'));
      setGaCharges(String(billingDefaults.gaCharges || '0.00'));
      setLaCharges(String(billingDefaults.laCharges || '0.00'));
      setSedationCharges(String(billingDefaults.sedationCharges || '0.00'));
      setAssistantSurgeonCharges(String(billingDefaults.assistantSurgeonCharges || '0.00'));
      setSurgeonCharges(String(billingDefaults.surgeonCharges || '0.00'));
      setRoomCharges(String(billingDefaults.roomCharges || '0.00'));
      setIcuCharges(String(billingDefaults.icuCharges || '0.00'));
      setWardCharges(String(billingDefaults.wardCharges || '0.00'));
      setNursingCharges(String(billingDefaults.nursingCharges || '0.00'));
      setMonitoringCharges(String(billingDefaults.monitoringCharges || '0.00'));
      setDressingCharges(String(billingDefaults.dressingCharges || '0.00'));
      setConsumableCharges(String(billingDefaults.consumableCharges || '0.00'));
      setEquipmentCharges(String(billingDefaults.equipmentCharges || '0.00'));
      setAdmissionCharges(String(billingDefaults.admissionCharges || '0.00'));
      setRegistrationCharges(String(billingDefaults.registrationCharges || '0.00'));
    }
  }, [billingDefaults]);

  const handleSave = async () => {
    if (!isAdmin) {
      return Alert.alert('Access Denied', 'Only ADMIN users are authorized to update billing defaults.');
    }

    const payload = {
      otCharges: Number(otCharges) || 0,
      gaCharges: Number(gaCharges) || 0,
      laCharges: Number(laCharges) || 0,
      sedationCharges: Number(sedationCharges) || 0,
      assistantSurgeonCharges: Number(assistantSurgeonCharges) || 0,
      surgeonCharges: Number(surgeonCharges) || 0,
      roomCharges: Number(roomCharges) || 0,
      icuCharges: Number(icuCharges) || 0,
      wardCharges: Number(wardCharges) || 0,
      nursingCharges: Number(nursingCharges) || 0,
      monitoringCharges: Number(monitoringCharges) || 0,
      dressingCharges: Number(dressingCharges) || 0,
      consumableCharges: Number(consumableCharges) || 0,
      equipmentCharges: Number(equipmentCharges) || 0,
      admissionCharges: Number(admissionCharges) || 0,
      registrationCharges: Number(registrationCharges) || 0
    };

    try {
      await updateBillingDefaults(payload);
      Alert.alert('Success', 'Billing default rates saved successfully.');
    } catch (err) {
      Alert.alert('Save Failed', err.message || 'Unable to update defaults.');
    }
  };

  if (loading && !billingDefaults) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const renderField = (label, value, onChangeText) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, !isAdmin && styles.disabledInput]}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        editable={isAdmin}
        placeholder="0.00"
        placeholderTextColor={theme.colors.textMuted}
      />
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, isMobile && styles.contentContainerMobile]}
    >
      <Text style={[styles.pageTitle, isMobile && styles.pageTitleMobile]}>💸  Billing Defaults Configuration</Text>
      
      {!isAdmin && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            🔒 Read-Only: Only hospital administrators can edit these default billing rates.
          </Text>
        </View>
      )}

      {/* 1. Room & Stay Charges */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛏️  Room & Stay Defaults</Text>
        <Text style={styles.sectionSubtitle}>Default charges applied per stay day or registration event.</Text>
        <View style={styles.grid}>
          {renderField('Room Charge (Daily)', roomCharges, setRoomCharges)}
          {renderField('ICU Charge (Daily)', icuCharges, setIcuCharges)}
          {renderField('Ward Charge (Daily)', wardCharges, setWardCharges)}
          {renderField('Nursing Charge (Daily)', nursingCharges, setNursingCharges)}
          {renderField('Admission Fee', admissionCharges, setAdmissionCharges)}
          {renderField('Registration Fee', registrationCharges, setRegistrationCharges)}
        </View>
      </View>

      {/* 2. OT & Anaesthesia */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎭  OT & Anaesthesia Defaults</Text>
        <Text style={styles.sectionSubtitle}>Standard baseline charges for operation theater services.</Text>
        <View style={styles.grid}>
          {renderField('OT Charges', otCharges, setOtCharges)}
          {renderField('General Anaesthesia (GA)', gaCharges, setGaCharges)}
          {renderField('Local Anaesthesia (LA)', laCharges, setLaCharges)}
          {renderField('Sedation', sedationCharges, setSedationCharges)}
        </View>
      </View>

      {/* 3. Surgical Team */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🩺  Surgical Team Defaults</Text>
        <Text style={styles.sectionSubtitle}>Standard surgeon and surgical assistant professional fees.</Text>
        <View style={styles.grid}>
          {renderField('Lead Surgeon Fee', surgeonCharges, setSurgeonCharges)}
          {renderField('Assistant Surgeon Fee', assistantSurgeonCharges, setAssistantSurgeonCharges)}
        </View>
      </View>

      {/* 4. Other Services */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📦  Other Service & Supplies Defaults</Text>
        <Text style={styles.sectionSubtitle}>Consumables, clinical equipment, dressing, and patient monitoring rates.</Text>
        <View style={styles.grid}>
          {renderField('Patient Monitoring', monitoringCharges, setMonitoringCharges)}
          {renderField('Clinical Dressing', dressingCharges, setDressingCharges)}
          {renderField('Medical Consumables', consumableCharges, setConsumableCharges)}
          {renderField('Surgical Equipment', equipmentCharges, setEquipmentCharges)}
        </View>
      </View>

      {isAdmin && (
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Default Rates</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  contentContainerMobile: {
    padding: 12,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  pageTitleMobile: {
    fontSize: 18,
    marginBottom: 14,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 14,
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  fieldContainer: {
    width: '48%',
    minWidth: 140,
    marginBottom: 8,
  },
  label: {
    color: theme.colors.text,
    marginBottom: 6,
    fontWeight: '600',
    fontSize: 12,
  },
  input: {
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    padding: 10,
    borderRadius: 8,
    borderColor: theme.colors.border,
    borderWidth: 1,
    fontSize: 13,
  },
  disabledInput: {
    opacity: 0.65,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  warningBanner: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  warningText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: theme.colors.success,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
