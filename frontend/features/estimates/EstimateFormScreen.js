/**
 * EstimateFormScreen.js  — Complete redesign
 * Sections: A(Event Banner) → B(Diagnosis) → C(Surgeries) → D(Duration) →
 *           E(Stay) → F(Surgeons) → G(Anaesthesia) → H(OT) →
 *           I(Consumables) → J(Quick Presets) → K(Investigations) →
 *           L(Medicines) → M(Additional) → N(Global Discount) → O(Notes)
 * Sticky bottom: EstimateTotalBar with live total + Save
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, Platform, Modal, Pressable
} from 'react-native';
import { useEstimatesStore } from './store';
import { useAuthStore } from '../auth/store';
import { useSettingsStore } from '../settings/store';
import { useMasterDataStore } from '../master-data/store';
import { api } from '../../shared/utils/api';
import { theme } from '../../shared/styles/theme';
import { SurgeryPicker } from './components/SurgeryPicker';
import { LineItemRow } from './components/LineItemRow';
import { DateDropdown } from '../../shared/components/DateDropdown';
import { EstimateTotalBar } from './components/EstimateTotalBar';
import { SearchableDropdown } from '../../shared/components/SearchableDropdown';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  }) + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function SectionHeader({ icon, title }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionIcon}>{icon}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function FormLabel({ text, required }) {
  return (
    <Text style={styles.label}>
      {text}{required && <Text style={{ color: theme.colors.danger }}> *</Text>}
    </Text>
  );
}

function emptyItem(group = 'CUSTOM') {
  let chargeCategory = 'CUSTOM';
  let mappedGroup = group;
  if (group === 'INVESTIGATION') {
    mappedGroup = 'CUSTOM';
    chargeCategory = 'Investigation';
  } else if (group === 'MEDICINE') {
    mappedGroup = 'OT_MEDICATION';
    chargeCategory = 'Medicine';
  } else if (group === 'CONSUMABLE') {
    chargeCategory = 'Consumable';
  } else if (group === 'ADDITIONAL') {
    chargeCategory = 'Additional';
  }
  return { description: '', quantity: '1', rate: '0', discountType: 'FIXED_AMOUNT', discountValue: '0', itemGroup: mappedGroup, chargeCategory };
}

const STAY_OPTIONS = [
  { label: 'Day Care (0 Days)', value: 0 },
  { label: '1 Day', value: 1 },
  { label: '2 Days', value: 2 },
  { label: '3 Days', value: 3 },
  { label: '4 Days', value: 4 },
  { label: '5 Days', value: 5 },
  { label: 'Custom', value: -1 },
];

const ANAESTHESIA_TYPES = ['LA (Local)', 'GA (General)', 'Spinal', 'Sedation', 'Other'];

// ── Custom Dropdown for Stay Days and Units ──
function DaysDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const options = [
    { label: '0 Days (Day Care)', value: 0 },
    { label: '1 Day', value: 1 },
    { label: '2 Days', value: 2 },
    { label: '3 Days', value: 3 },
    { label: '4 Days', value: 4 },
    { label: '5 Days', value: 5 },
    { label: '6 Days', value: 6 },
    { label: '7 Days', value: 7 },
    { label: '10 Days', value: 10 },
    { label: '14 Days', value: 14 },
    { label: '21 Days', value: 21 },
    { label: '30 Days', value: 30 },
  ];

  return (
    <View>
      <TouchableOpacity style={tableStyles.tableInput} onPress={() => setOpen(true)}>
        <Text style={{ color: '#333', fontSize: 13 }}>
          {(() => {
            const found = options.find(o => o.value === value);
            return found ? found.label : `${value} Days`;
          })()}
        </Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity activeOpacity={1} 
          style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }} 
          onPress={() => setOpen(false)}
        >
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 8,
            width: 200,
            maxHeight: 300,
            elevation: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          }}>
            <Text style={{ fontWeight: '700', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee', textAlign: 'center' }}>Select Days</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={{ padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#eee' }}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Text style={{ color: '#333', fontSize: 14, textAlign: 'center' }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Custom Table Checkbox ──
function TableCheckbox({ checked, onChange }) {
  return (
    <TouchableOpacity
      style={[tableStyles.checkboxSquare, checked && tableStyles.checkboxSquareChecked]}
      onPress={() => onChange(!checked)}
    >
      {checked && <Text style={tableStyles.checkboxTick}>✓</Text>}
    </TouchableOpacity>
  );
}

const DISCOUNT_OPTIONS = [
  { label: '0%', value: '0' },
  { label: '1%', value: '1' },
  { label: '2%', value: '2' },
  { label: '3%', value: '3' },
  { label: '4%', value: '4' },
  { label: '5%', value: '5' },
  { label: '6%', value: '6' },
  { label: '7%', value: '7' },
  { label: '8%', value: '8' },
  { label: '9%', value: '9' },
  { label: '10%', value: '10' }
];

function DiscountPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={{ width: 85 }}>
      <TouchableOpacity style={tableStyles.tableInput} onPress={() => setOpen(true)}>
        <Text style={{ color: '#333', fontSize: 13 }}>{value || 0}%</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity activeOpacity={1} 
          style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }} 
          onPress={() => setOpen(false)}
        >
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 8,
            width: 200,
            maxHeight: 300,
            elevation: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          }}>
            <Text style={{ fontWeight: '700', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee', textAlign: 'center' }}>Select Discount</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {DISCOUNT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={{ padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#eee' }}
                  onPress={() => {
                    onChange(Number(opt.value));
                    setOpen(false);
                  }}
                >
                  <Text style={{ color: '#333', fontSize: 14, textAlign: 'center' }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Custom Item Table Cell (List of sub-items inside details cell) ──
function ItemTableCell({ items, setItems, placeholderDescription, emptyItemCategory, emptyItemGroup }) {
  const updateItem = (index, key, val) => {
    setItems(prev => {
      const a = [...prev];
      a[index] = { ...a[index], [key]: val };
      return a;
    });
  };

  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems(prev => [...prev, {
      description: '',
      quantity: '1',
      rate: '0',
      discountType: 'PERCENTAGE',
      discountValue: '0',
      itemGroup: emptyItemGroup,
      chargeCategory: emptyItemCategory
    }]);
  };

  return (
    <View style={tableStyles.itemCellContainer}>
      {items.map((item, idx) => {
        const qty = Number(item.quantity || 1);
        const rate = Number(item.rate || 0);
        const raw = qty * rate;
        const discVal = Number(item.discountValue || 0);
        const net = raw * (1 - discVal / 100);

        return (
          <View key={idx} style={{ borderBottomWidth: 0.5, borderBottomColor: '#eee', paddingBottom: 8, marginBottom: 8 }}>
            <View style={[tableStyles.itemCellRow, { marginBottom: 4 }]}>
              <TextInput
                style={[tableStyles.tableInput, { flex: 1 }]}
                value={item.description}
                onChangeText={(v) => updateItem(idx, 'description', v)}
                placeholder={placeholderDescription}
                placeholderTextColor={theme.colors.textMuted}
              />
              <TouchableOpacity onPress={() => removeItem(idx)} style={tableStyles.itemCellRemove}>
                <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>Qty:</Text>
              <TextInput
                style={[tableStyles.tableInput, { width: 45, textAlign: 'center' }]}
                value={String(item.quantity)}
                onChangeText={(v) => updateItem(idx, 'quantity', v)}
                keyboardType="numeric"
              />
              <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>Rate:</Text>
              <TextInput
                style={[tableStyles.tableInput, { width: 70 }]}
                value={String(item.rate)}
                onChangeText={(v) => updateItem(idx, 'rate', v)}
                keyboardType="numeric"
              />
              <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>Disc:</Text>
              <DiscountPicker
                value={Number(item.discountValue || 0)}
                onChange={(val) => {
                  updateItem(idx, 'discountType', 'PERCENTAGE');
                  updateItem(idx, 'discountValue', String(val));
                }}
              />
              <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginLeft: 'auto', fontWeight: '700' }}>
                Net: ₹{net.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </View>
          </View>
        );
      })}
      <TouchableOpacity style={tableStyles.itemCellAddBtn} onPress={addItem}>
        <Text style={tableStyles.itemCellAddBtnText}>+ Add Row</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Package Inclusion Paragraph Generator ──
function generatePackageInclusionNote(days, anaesthesiaType) {
  const isGA = anaesthesiaType === 'GA';
  const anesthesiaText = isGA 
    ? 'Anesthesia charges are included wherever applicable based on the type of anesthesia administered (General, Regional, or Local Anesthesia). ' 
    : '';

  return `The above estimate includes room charges for ${days} days (Room Category: General), nursing care charges for the admitted period, operation theatre (OT) charges for an expected duration of 2 hours, surgeon's professional fees, routine post-operative ward care, monitoring charges, basic dressing materials, and discharge summary. ${anesthesiaText}Standard OT medications, consumables, and surgical supplies required for the procedure are included (included in OT charges / included in room charges, as applicable). The package also covers routine inpatient care during the included hospital stay period of ${days} days.`;
}

export function EstimateFormScreen({ route, navigation }) {
  const { id, eventId: routeEventId } = route.params || {};
  const { role } = useAuthStore();
  const { estimates, createEstimate, updateEstimate } = useEstimatesStore();
  const { diagnosisMasters, fetchDiagnosisMasters } = useMasterDataStore();
  const existing = estimates.find(e => e.id === id) || {};

  // ── Section A: linked event ──
  const [selectedEventId, setSelectedEventId] = useState(routeEventId || existing.eventId || '');
  const [eventInfo, setEventInfo] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [allEvents, setAllEvents] = useState([]);
  const [eventSearch, setEventSearch] = useState('');
  const [eventDateSearch, setEventDateSearch] = useState('');
  const [eventPhoneSearch, setEventPhoneSearch] = useState('');
  const [showEventDropdown, setShowEventDropdown] = useState(false);

  // ── Section B: diagnoses ──
  const [selectedDiagnoses, setSelectedDiagnoses] = useState(existing.diagnoses || (existing.diagnosis ? [existing.diagnosis] : []));
  const [customDiagText, setCustomDiagText] = useState('');

  // ── Section C: surgeries ──
  const [surgeries, setSurgeries] = useState(
    (existing.estimateSurgeries || []).map(s => ({
      surgeryId: s.surgeryId,
      surgeryName: s.surgery?.surgeryName || '',
      surgeryCost: String(s.surgeryCost || 0),
      discountType: s.discountType || 'PERCENTAGE',
      discountValue: String(s.discountValue || 0),
      durationMinutes: s.durationMinutes || 0
    }))
  );

  // ── Section D: duration ──
  const [durationHours, setDurationHours] = useState('2');
  const [durationMins, setDurationMins] = useState('0');

  // ── Section E: stay ──
  const [stayOption, setStayOption] = useState(3);       // 0-5 or -1 for custom
  const [customStayDays, setCustomStayDays] = useState('');
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(existing.roomId || '');
  const [roomDailyRate, setRoomDailyRate] = useState(String(existing.roomDailyRate || 0));
  const [roomSearch, setRoomSearch] = useState(existing.room?.roomName || '');
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);
  const [nursingDailyRate, setNursingDailyRate] = useState(String(existing.nursingDailyRate || 0));

  // ── Section F: surgeons ──
  const [allDoctors, setAllDoctors] = useState([]);
  // primaryDoctorObj: the full doctor object (or null)
  const [primaryDoctorObj, setPrimaryDoctorObj] = useState(null);
  const [primaryDoctor, setPrimaryDoctor] = useState(existing.primaryDoctor || '');
  // assistantSurgeons: array of doctor-name strings (kept for backward compat with API)
  const [assistantSurgeons, setAssistantSurgeons] = useState(
    existing.assistantSurgeons ? JSON.parse(JSON.stringify(existing.assistantSurgeons)) : []
  );
  
  // NEW: Global Assistant Surgeon for the Estimate
  const [assistantSurgeonObj, setAssistantSurgeonObj] = useState(null);
  const [assistantSurgeonName, setAssistantSurgeonName] = useState('');
  const [assistantSurgeonFee, setAssistantSurgeonFee] = useState('0');
  const [assistantSurgeonDiscountValue, setAssistantSurgeonDiscountValue] = useState(0);

  // ── Section G: anaesthesia ──
  const [anaesthesiaType, setAnaesthesiaType] = useState(existing.actualAnaesthesiaCharge ? 'GA (General)' : 'GA (General)');
  const [anaesthesiaPricingMode, setAnaesthesiaPricingMode] = useState('FIXED');
  const [anaesthesiaCost, setAnaesthesiaCost] = useState('0');
  const [anaesthesiaUnits, setAnaesthesiaUnits] = useState('1');
  const [anaesthesiaFirstHourCost, setAnaesthesiaFirstHourCost] = useState('0');
  const [anaesthesiaConsecutiveCost, setAnaesthesiaConsecutiveCost] = useState('0');

  const getAnaesthesiaTotal = () => {
    if (anaesthesiaPricingMode === 'FIXED') return Number(anaesthesiaCost) || 0;
    if (anaesthesiaPricingMode === 'PER_UNIT') return (Number(anaesthesiaCost) || 0) * (Number(anaesthesiaUnits) || 0);
    if (anaesthesiaPricingMode === 'FIRST_HR') {
      const units = Number(anaesthesiaUnits) || 0;
      if (units === 0) return 0;
      return (Number(anaesthesiaFirstHourCost) || 0) + Math.max(0, units - 1) * (Number(anaesthesiaConsecutiveCost) || 0);
    }
    return 0;
  };

  // ── Section H: OT ──
  const [otRooms, setOtRooms] = useState([]);
  const [selectedOtRoomId, setSelectedOtRoomId] = useState(existing.otRoomId || '');
  const [otCost, setOtCost] = useState(String(existing.actualOtCharge || 0));
  const [otUnits, setOtUnits] = useState('1');

  // ── ICU/HDU States ──
  const [icuDays, setIcuDays] = useState(existing.icuDays ? String(existing.icuDays) : '0');
  const [icuDailyRate, setIcuDailyRate] = useState(existing.icuDailyRate ? String(existing.icuDailyRate) : '0');

  // ── Section I: consumables ──
  const [consumables, setConsumables] = useState(
    (existing.estimateItems || []).filter(i => i.itemGroup === 'CONSUMABLE' && i.chargeCategory !== 'Implant').map(i => ({
      description: i.description, quantity: String(i.quantity), rate: String(i.rate),
      discountType: i.discountType, discountValue: String(i.discountValue), itemGroup: 'CONSUMABLE',
      chargeCategory: i.chargeCategory || 'Consumable'
    }))
  );

  const [implants, setImplants] = useState(
    (existing.estimateItems || []).filter(i => i.chargeCategory === 'Implant').map(i => ({
      description: i.description, quantity: String(i.quantity), rate: String(i.rate),
      discountType: i.discountType, discountValue: String(i.discountValue), itemGroup: 'CONSUMABLE',
      chargeCategory: 'Implant'
    }))
  );

  // ── Section K: investigations ──
  const [investigations, setInvestigations] = useState(
    (existing.estimateItems || []).filter(i => i.itemGroup === 'INVESTIGATION' || (i.itemGroup === 'CUSTOM' && i.chargeCategory === 'Investigation')).map(i => ({
      description: i.description, quantity: String(i.quantity), rate: String(i.rate),
      discountType: i.discountType, discountValue: String(i.discountValue), itemGroup: 'CUSTOM',
      chargeCategory: 'Investigation'
    }))
  );

  // ── Section L: medicines ──
  const [medicines, setMedicines] = useState(
    (existing.estimateItems || []).filter(i => i.itemGroup === 'MEDICINE' || i.itemGroup === 'OT_MEDICATION').map(i => ({
      description: i.description, quantity: String(i.quantity), rate: String(i.rate),
      discountType: i.discountType, discountValue: String(i.discountValue), itemGroup: 'OT_MEDICATION',
      chargeCategory: i.chargeCategory || 'Medicine'
    }))
  );

  // ── Section M: additional ──
  const [additionalItems, setAdditionalItems] = useState(
    (existing.estimateItems || []).filter(i => !['CONSUMABLE', 'INVESTIGATION', 'MEDICINE', 'OT_MEDICATION', 'ANAESTHESIA'].includes(i.itemGroup) && !(i.itemGroup === 'CUSTOM' && i.chargeCategory === 'Investigation') && i.chargeCategory !== 'Implant').map(i => ({
      description: i.description, quantity: String(i.quantity), rate: String(i.rate),
      discountType: i.discountType, discountValue: String(i.discountValue), itemGroup: i.itemGroup || 'ADDITIONAL',
      chargeCategory: i.chargeCategory || 'Additional'
    }))
  );

  // ── Discount Code state ──
  const [discountCode, setDiscountCode] = useState(existing.discountCode || '');
  const [appliedDiscountCode, setAppliedDiscountCode] = useState(existing.discountCode || null);
  const [appliedCodeObj, setAppliedCodeObj] = useState(null);
  const [discountCodeError, setDiscountCodeError] = useState('');
  const [applyingCode, setApplyingCode] = useState(false);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [revealedCodes, setRevealedCodes] = useState([]);
  const [showCodeRevealModal, setShowCodeRevealModal] = useState(false);
  const [accessRequestStatus, setAccessRequestStatus] = useState(null); // 'PENDING', 'APPROVED', etc.

  // Itemized discount values (0 to 10%)
  const [roomDiscountValue, setRoomDiscountValue] = useState(existing.roomDiscountValue ? String(existing.roomDiscountValue) : '0');
  const [nursingDiscountValue, setNursingDiscountValue] = useState(existing.nursingDiscountValue ? String(existing.nursingDiscountValue) : '0');
  const [anaesthesiaDiscountValue, setAnaesthesiaDiscountValue] = useState(existing.anaesthesiaDiscountValue ? String(existing.anaesthesiaDiscountValue) : '0');
  const [icuDiscountValue, setIcuDiscountValue] = useState(existing.icuDiscountValue ? String(existing.icuDiscountValue) : '0');
  const [otDiscountValue, setOtDiscountValue] = useState(existing.otDiscountValue ? String(existing.otDiscountValue) : '0');

  const [gstRate, setGstRate] = useState(existing.gstRate !== undefined && existing.gstRate !== null ? String(existing.gstRate) : '0');

  // ── Section O: notes ──
  const [notes, setNotes] = useState(existing.notes || '');
  const [inclusions, setInclusions] = useState(existing.inclusions || '');
  const [exclusions, setExclusions] = useState(existing.exclusions || '');

  // ── Checkbox Enable/Disable States ──
  const [enableAnaesthesia, setEnableAnaesthesia] = useState(
    existing.id ? (Number(existing.actualAnaesthesiaCharge) > 0 || (existing.estimateItems || []).some(i => i.itemGroup === 'ANAESTHESIA')) : true
  );
  const [enableIcu, setEnableIcu] = useState(
    existing.id ? (existing.icuDays > 0 || Number(existing.icuDailyRate) > 0) : false
  );
  const [enableOt, setEnableOt] = useState(
    existing.id ? Number(existing.actualOtCharge) > 0 : true
  );
  const [enableInvestigations, setEnableInvestigations] = useState(
    existing.id ? (existing.estimateItems || []).some(i => i.itemGroup === 'INVESTIGATION' || i.chargeCategory === 'Investigation') : false
  );
  const [enableMedicines, setEnableMedicines] = useState(
    existing.id ? (existing.estimateItems || []).some(i => i.itemGroup === 'MEDICINE' || i.itemGroup === 'OT_MEDICATION' || i.chargeCategory === 'Medicine') : false
  );
  const [enableConsumables, setEnableConsumables] = useState(
    existing.id ? (existing.estimateItems || []).some(i => i.itemGroup === 'CONSUMABLE' && i.chargeCategory !== 'Implant') : true
  );
  const [enableImplants, setEnableImplants] = useState(
    existing.id ? (existing.estimateItems || []).some(i => i.chargeCategory === 'Implant') : false
  );
  const [enableMisc, setEnableMisc] = useState(
    existing.id ? (existing.estimateItems || []).some(i => !['CONSUMABLE', 'INVESTIGATION', 'MEDICINE', 'OT_MEDICATION', 'ANAESTHESIA'].includes(i.itemGroup) && i.chargeCategory !== 'Investigation' && i.chargeCategory !== 'Implant') : true
  );


  // ── Default Rate for Asst Surgeon loaded from settings ──
  const [defaultAsstSurgeonRate, setDefaultAsstSurgeonRate] = useState('0');

  // ── Fixed Package States ──
  const [isPackage, setIsPackage] = useState(existing.isPackage || false);
  const [packageName, setPackageName] = useState(existing.packageName || '');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [packagePrice, setPackagePrice] = useState(existing.packagePrice ? String(existing.packagePrice) : '');
  const [packageIncludes, setPackageIncludes] = useState(existing.packageIncludes || '');
  const [packageTemplateId, setPackageTemplateId] = useState(existing.packageTemplateId || '');
  const [allTemplates, setAllTemplates] = useState([]);
  const { billingDefaults, fetchBillingDefaults, profile, fetchProfile } = useSettingsStore();
  // Step 5A: Package-specific anaesthesia type + stay days
  const [packageAnaesthesiaType, setPackageAnaesthesiaType] = useState('GA');
  const [pkgStayOption, setPkgStayOption] = useState(3);
  const [pkgStayCustom, setPkgStayCustom] = useState('');
  const [generatingInclusion, setGeneratingInclusion] = useState(false);

  // --- Terms & Conditions Templates State ---
  const [termsTemplates, setTermsTemplates] = useState([]);
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isEditingModalVisible, setIsEditingModalVisible] = useState(false);

  useEffect(() => {
    const defaultTemplates = [
      {
        id: '1',
        name: 'Standard & Concise',
        content: `Terms & Conditions:
1. This is a tentative estimate for surgical procedures based on clinical findings. Actual billing may vary depending on patient condition, operating room time, and materials consumed.
2. Implants, special consumables, high-value medicines, and blood/blood products are billed on actuals and are not included in this estimate unless explicitly mentioned.
3. Standard stay duration is calculated as per the category selected. Extra stay due to clinical reasons will be charged extra.
4. In case of unexpected complications requiring ICU stay, ventilators, or multi-specialty consults, extra charges will apply on actuals.
5. Estimate is valid for 30 days from the date of issue.`
      },
      {
        id: '2',
        name: 'Insurance & Scheme Focused',
        content: `Terms & Conditions:
1. This estimate is subject to pre-authorization approval from the respective TPA / Insurance company / Government Scheme.
2. Co-payment, deductibles, non-medical expenses, and charges exceeding approved limits (as defined by your policy) must be cleared directly by the patient before discharge.
3. If a patient opts for a higher room category than their eligible category under the insurance policy, proportional upgrades will be applicable to all surgical, nursing, and visit fees as per hospital policy.
4. Government scheme (PMJAY) package rates cover only listed package inclusions. Any diagnostic tests, implants, or drugs outside the package code registry are payable by the patient.`
      },
      {
        id: '3',
        name: 'Combined Comprehensive (All Options)',
        content: `Terms & Conditions:
1. Tentative Estimate: This is a tentative estimate for surgical procedures based on clinical findings. Actual billing may vary depending on patient condition, operating room time, and materials consumed.
2. Exclusions on Actuals: Implants, special consumables, high-value medicines, emergency medicines, blood/blood products, and post-discharge take-home medications are billed on actuals and are not included in this estimate unless explicitly stated.
3. Stay Duration: Standard stay duration is calculated as per the category selected. Extra stay due to clinical reasons will be charged extra. Emergency admissions, ICU monitoring, and physiotherapy are billed separately.
4. Complications & Pre-existing Conditions: In case of unexpected complications requiring ICU stay, ventilators, or multi-specialty consults, extra charges will apply on actuals. The cost of managing pre-existing comorbidities (e.g., Diabetes, Hypertension, Cardiac conditions) during the stay is separate.
5. Surgeon Fees: Surgeon fee is estimated for in-house panel doctors. Fees for visiting external super-specialists, emergency calls, or night procedures will be charged additionally.
6. Insurance / TPA Coverage: This estimate is subject to pre-authorization approval from the respective TPA / Insurance company / Government Scheme. Co-payment, deductibles, non-medical expenses, and charges exceeding approved limits (as defined by your policy) must be cleared directly by the patient before discharge.
7. Room Category Upgrades: If a patient opts for a higher room category than their eligible category under the insurance policy, proportional upgrades will be applicable to all surgical, nursing, and visit fees as per hospital policy.
8. Government Schemes (PMJAY): Government scheme (PMJAY) package rates cover only listed package inclusions. Any diagnostic tests, implants, or drugs outside the package code registry are payable by the patient.
9. Validity: This estimate is valid for 30 days from the date of issue. All rates are subject to change without prior notice. Final bill settlements will strictly be processed based on actual service entries in the hospital management system.`
      }
    ];

    try {
      const stored = localStorage.getItem('cliniqox-terms-templates');
      if (stored) {
        setTermsTemplates(JSON.parse(stored));
      } else {
        setTermsTemplates(defaultTemplates);
        localStorage.setItem('cliniqox-terms-templates', JSON.stringify(defaultTemplates));
      }
    } catch (e) {
      setTermsTemplates(defaultTemplates);
    }
  }, []);

  // Auto-generate package inclusion note when package options change
  useEffect(() => {
    if (isPackage) {
      const days = pkgStayOption === -1 ? (Number(pkgStayCustom) || 0) : pkgStayOption;
      setPackageIncludes(generatePackageInclusionNote(days, packageAnaesthesiaType));
    }
  }, [isPackage, packageAnaesthesiaType, pkgStayOption, pkgStayCustom]);


  const saveTemplates = (updated) => {
    setTermsTemplates(updated);
    try {
      localStorage.setItem('cliniqox-terms-templates', JSON.stringify(updated));
    } catch (e) {
      console.log('Failed to save templates to localStorage', e);
    }
  };

  const handleApplyTemplate = (content, method) => {
    if (method === 'replace') {
      setNotes(content);
    } else {
      setNotes(prev => prev ? `${prev}\n\n${content}` : content);
    }
    setShowTemplatesDropdown(false);
  };

  const handleSaveTemplate = (id, name, content) => {
    if (!name.trim()) return Alert.alert('Error', 'Template name is required.');
    if (!content.trim()) return Alert.alert('Error', 'Template content is required.');

    let updated;
    if (id) {
      updated = termsTemplates.map(t => t.id === id ? { ...t, name, content } : t);
    } else {
      updated = [...termsTemplates, { id: String(Date.now()), name, content }];
    }
    saveTemplates(updated);
    setIsEditingModalVisible(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (id) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this template?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const updated = termsTemplates.filter(t => t.id !== id);
          saveTemplates(updated);
          setIsEditingModalVisible(false);
          setEditingTemplate(null);
        }
      }
    ]);
  };

  // Quick presets from hospital charges master
  const [chargePresets, setChargePresets] = useState([]);
  const [saving, setSaving] = useState(false);

  // ── Load event info ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedEventId) {
      loadEventInfoById(selectedEventId);
    }
    loadMasterData();
    fetchDiagnosisMasters();
  }, [selectedEventId]);

  const loadEventInfoById = async (targetEventId) => {
    setLoadingEvent(true);
    try {
      const event = await api.get(`/calendar/${targetEventId}`);
      if (!event) return;

      setEventInfo({
        patientName: event.patient?.name,
        patientUhid: event.patient?.uhid,
        doctorName: event.doctor ? `Dr. ${event.doctor.firstName} ${event.doctor.lastName}` : null,
        surgeryName: event.surgery?.surgeryName,
        surgeryCost: event.surgeryCost,
        startTime: event.startTime,
        otRoomName: event.otRoom?.roomName,
        otRoomId: event.otRoomId,
        durationMinutes: event.durationMinutes
      });

      if (event.doctor) {
        const docName = `Dr. ${event.doctor.firstName} ${event.doctor.lastName}`;
        setPrimaryDoctor(docName);
        setPrimaryDoctorObj(event.doctor);
      }

      if (event.diagnoses && event.diagnoses.length > 0) {
        setSelectedDiagnoses(event.diagnoses);
      }

      if (event.assistantSurgeon) {
        const asstName = `Dr. ${event.assistantSurgeon.firstName} ${event.assistantSurgeon.lastName}`;
        setAssistantSurgeonName(asstName);
        setAssistantSurgeonObj(event.assistantSurgeon);
        setAssistantSurgeonFee(defaultAsstSurgeonRate);
        setAssistantSurgeonDiscountValue(0);
      }

      if (event.durationMinutes) {
        setDurationHours(String(Math.floor(event.durationMinutes / 60)));
        setDurationMins(String(event.durationMinutes % 60));
        setOtUnits(String(event.durationMinutes / 60));
      }

      if (event.surgeryId && event.surgery) {
        setSurgeries([{
          surgeryId: event.surgeryId,
          surgeryName: event.surgery.surgeryName,
          surgeryCost: String(event.surgeryCost || event.surgery.defaultSurgeonFee || 0),
          discountType: 'PERCENTAGE',
          discountValue: '0',
          durationMinutes: event.durationMinutes || 0
        }]);
      }

      if (event.otRoomId) {
        setSelectedOtRoomId(event.otRoomId);
      }
    } catch (err) {
      console.log('Event load error:', err.message);
    } finally {
      setLoadingEvent(false);
    }
  };

  const loadMasterData = async () => {
    try {
      const [roomData, otData, chargesData, nursingData, anaesthData, doctorData, eventsData, templatesData, defaultsData, profileData] = await Promise.all([
        api.get('/rooms?limit=100').catch(() => ({ rooms: [] })),
        api.get('/ot-rooms?limit=30').catch(() => ({ otRooms: [] })),
        api.get('/hospital-charges?limit=100').catch(() => ({ charges: [] })),
        api.get('/hospital-charges?chargeCategory=NURSING&limit=5').catch(() => ({ charges: [] })),
        api.get('/hospital-charges?chargeCategory=ANAESTHESIA&limit=5').catch(() => ({ charges: [] })),
        api.get('/doctors?limit=100').catch(() => ({ doctors: [] })),
        api.get('/calendar?limit=100').catch(() => ({ events: [] })),
        api.get('/estimate-templates?limit=100').catch(() => ({ templates: [] })),
        fetchBillingDefaults().catch(() => null),
        fetchProfile().catch(() => null)
      ]);

      setRooms(roomData.rooms || []);
      setOtRooms(otData.otRooms || []);

      const fetchedDocs = doctorData.doctors || [];
      setAllDoctors(fetchedDocs);

      // Initialize GST rate if not editing
      if (!existing.id) {
        setGstRate(profileData?.defaultGstRate !== undefined ? String(profileData.defaultGstRate) : '0');
      } else {
        setGstRate(existing.gstRate !== undefined && existing.gstRate !== null ? String(existing.gstRate) : '0');
      }

      // Pre-populate primaryDoctorObj from existing estimates or fallback
      if (existing.surgeonId) {
        const docObj = fetchedDocs.find(d => d.id === existing.surgeonId);
        if (docObj) {
          setPrimaryDoctorObj(docObj);
        }
      } else if (existing.primaryDoctor) {
        const match = fetchedDocs.find(d => `Dr. ${d.firstName} ${d.lastName}`.toLowerCase() === existing.primaryDoctor.toLowerCase());
        if (match) {
          setPrimaryDoctorObj(match);
        }
      }

      setAllEvents(eventsData.events || []);
      setAllTemplates(templatesData.templates || []);

      // Quick charge presets
      const allCharges = chargesData.charges || [];
      setChargePresets(allCharges.slice(0, 8));

      // Auto-fill nursing rate
      const nursingCharge = (nursingData.charges || [])[0];
      if (nursingCharge && !existing.nursingDailyRate) {
        setNursingDailyRate(String(nursingCharge.defaultRate || 0));
      }

      // Auto-fill anaesthesia rate
      const anaesthCharge = (anaesthData.charges || [])[0];
      if (anaesthCharge && !existing.actualAnaesthesiaCharge) {
        setAnaesthesiaCost(String(anaesthCharge.defaultRate || 0));
      }

      // Populate billing defaults
      if (defaultsData) {
        setDefaultAsstSurgeonRate(String(defaultsData.assistantSurgeonCharges || '0.00'));
        if (!id) {
          setOtCost(String(defaultsData.otCharges || '0.00'));
          setNursingDailyRate(String(defaultsData.nursingCharges || '0.00'));
          setRoomDailyRate(String(defaultsData.roomCharges || '0.00'));
          setIcuDailyRate(String(defaultsData.icuCharges || '0.00'));
          setAnaesthesiaCost(String(defaultsData.gaCharges || '0.00'));
        }
      }

      if (defaultsData && !id) {
        const initialAdditions = [];
        if (Number(defaultsData.admissionCharges) > 0) {
          initialAdditions.push({
            description: 'Admission Fee',
            quantity: '1',
            rate: String(defaultsData.admissionCharges),
            discountType: 'FIXED_AMOUNT',
            discountValue: '0',
            itemGroup: 'ADDITIONAL',
            chargeCategory: 'Admission'
          });
        }
        if (Number(defaultsData.registrationCharges) > 0) {
          initialAdditions.push({
            description: 'Registration Fee',
            quantity: '1',
            rate: String(defaultsData.registrationCharges),
            discountType: 'FIXED_AMOUNT',
            discountValue: '0',
            itemGroup: 'ADDITIONAL',
            chargeCategory: 'Registration'
          });
        }
        if (Number(defaultsData.monitoringCharges) > 0) {
          initialAdditions.push({
            description: 'Monitoring Charges',
            quantity: '1',
            rate: String(defaultsData.monitoringCharges),
            discountType: 'FIXED_AMOUNT',
            discountValue: '0',
            itemGroup: 'ADDITIONAL',
            chargeCategory: 'Monitoring'
          });
        }
        if (Number(defaultsData.dressingCharges) > 0) {
          initialAdditions.push({
            description: 'Dressing Charges',
            quantity: '1',
            rate: String(defaultsData.dressingCharges),
            discountType: 'FIXED_AMOUNT',
            discountValue: '0',
            itemGroup: 'ADDITIONAL',
            chargeCategory: 'Dressing'
          });
        }
        if (Number(defaultsData.equipmentCharges) > 0) {
          initialAdditions.push({
            description: 'Equipment Charges',
            quantity: '1',
            rate: String(defaultsData.equipmentCharges),
            discountType: 'FIXED_AMOUNT',
            discountValue: '0',
            itemGroup: 'ADDITIONAL',
            chargeCategory: 'Equipment'
          });
        }
        if (initialAdditions.length > 0) {
          setAdditionalItems(initialAdditions);
        }

        if (Number(defaultsData.consumableCharges) > 0) {
          setConsumables([{
            description: 'Consumables Baseline',
            quantity: '1',
            rate: String(defaultsData.consumableCharges),
            discountType: 'FIXED_AMOUNT',
            discountValue: '0',
            itemGroup: 'CONSUMABLE',
            chargeCategory: 'Consumable'
          }]);
        }
      }
    } catch (err) {
      console.log('Master data load error:', err.message);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────────
  const stayDays = stayOption === -1 ? Number(customStayDays) || 0 : stayOption;
  const durationMinutes = (Number(durationHours) || 0) * 60 + (Number(durationMins) || 0);

  // Update otUnits when duration hours/minutes change
  useEffect(() => {
    setOtUnits(String(durationMinutes / 60));
  }, [durationMinutes]);

  // OT charge auto-calc based on selected OT Room rate
  useEffect(() => {
    if (selectedOtRoomId && otRooms.length > 0) {
      const room = otRooms.find(r => r.id === selectedOtRoomId);
      if (room) {
        setOtCost(String(room.defaultHourlyCharge || 0));
      }
    }
  }, [selectedOtRoomId, otRooms]);

  const handleOtRoomSelect = useCallback((room) => {
    setSelectedOtRoomId(room.id);
    setOtCost(String(room.defaultHourlyCharge || 0));
  }, []);

  // Update anaesthesia cost based on type and defaults
  useEffect(() => {
    if (!billingDefaults || id) return;
    if (anaesthesiaType.startsWith('LA')) {
      setAnaesthesiaCost(String(billingDefaults.laCharges || '0.00'));
    } else if (anaesthesiaType.startsWith('GA')) {
      setAnaesthesiaCost(String(billingDefaults.gaCharges || '0.00'));
    } else if (anaesthesiaType.startsWith('Sedation')) {
      setAnaesthesiaCost(String(billingDefaults.sedationCharges || '0.00'));
    }
  }, [anaesthesiaType, billingDefaults]);

  // Handle template selection and pre-fill details
  const handleTemplateSelect = async (temp) => {
    try {
      const details = await api.get(`/estimate-templates/${temp.id}`);
      if (!details) return;

      setPackageTemplateId(temp.id);

      if (details.templateType === 'FIXED_PACKAGE') {
        setIsPackage(true);
        setPackageName(details.templateName || '');
        setPackagePrice(details.packagePrice ? String(details.packagePrice) : '');
        setPackageIncludes(details.includedItems || details.packageIncludes || '');
      } else {
        setIsPackage(false);
      }

      // Pre-fill detailed items
      const newSurgeries = [];
      const newConsumables = [];
      const newInvestigations = [];
      const newMedicines = [];
      const newAdditional = [];

      for (const item of details.templateItems || []) {
        switch (item.itemType) {
          case 'SURGERY_FEE':
            newSurgeries.push({
              surgeryId: item.description,
              surgeryName: item.surgeryName || 'Surgery',
              surgeryCost: String(item.defaultRate || 0),
              discountType: item.discountType || 'PERCENTAGE',
              discountValue: String(item.discountValue || 0),
              durationMinutes: 0
            });
            break;
          case 'OT_CHARGE':
            setOtCost(String(item.defaultRate || 0));
            break;
          case 'ANAESTHESIA':
            setAnaesthesiaCost(String(item.defaultRate || 0));
            break;
          case 'ROOM_CHARGE':
            setRoomDailyRate(String(item.defaultRate || 0));
            break;
          case 'NURSING':
            setNursingDailyRate(String(item.defaultRate || 0));
            break;
          case 'ICU':
            break;
          case 'ADDITIONAL':
            const baseItem = {
              description: item.description,
              quantity: String(item.defaultQuantity || 1),
              rate: String(item.defaultRate || 0),
              discountType: item.discountType || 'FIXED_AMOUNT',
              discountValue: String(item.discountValue || 0),
              itemGroup: item.itemGroup || 'ADDITIONAL',
              chargeCategory: item.chargeCategory || 'Additional'
            };
            if (item.itemGroup === 'CONSUMABLE' || item.chargeCategory === 'Consumable') {
              newConsumables.push(baseItem);
            } else if (item.itemGroup === 'INVESTIGATION' || item.chargeCategory === 'Investigation') {
              newInvestigations.push(baseItem);
            } else if (item.itemGroup === 'MEDICINE' || item.itemGroup === 'OT_MEDICATION' || item.chargeCategory === 'Medicine') {
              newMedicines.push(baseItem);
            } else {
              newAdditional.push(baseItem);
            }
            break;
        }
      }

      if (newSurgeries.length > 0) setSurgeries(newSurgeries);
      if (newConsumables.length > 0) setConsumables(newConsumables);
      if (newInvestigations.length > 0) setInvestigations(newInvestigations);
      if (newMedicines.length > 0) setMedicines(newMedicines);
      if (newAdditional.length > 0) setAdditionalItems(newAdditional);

    } catch (err) {
      Alert.alert('Error', 'Failed to load template details.');
    }
  };

  // ── Line item helpers ─────────────────────────────────────────────────────────
  const updateItem = (setter) => (index, key, val) => {
    setter(prev => { const a = [...prev]; a[index] = { ...a[index], [key]: val }; return a; });
  };
  const removeItem = (setter) => (index) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  // Surgery management
  const handleAddSurgery = (surgery) => {
    setSurgeries(prev => [...prev, surgery]);
  };
  const removeSurgery = (index) => {
    setSurgeries(prev => prev.filter((_, i) => i !== index));
  };
  const updateSurgeryCost = (index, val) => {
    setSurgeries(prev => { const a = [...prev]; a[index] = { ...a[index], surgeryCost: val }; return a; });
  };
  const updateSurgeryDiscount = (index, key, val) => {
    setSurgeries(prev => { const a = [...prev]; a[index] = { ...a[index], [key]: val }; return a; });
  };

  // Load applied code details on load
  useEffect(() => {
    if (existing.discountCode) {
      api.post('/discount-codes/validate', { code: existing.discountCode })
        .then(res => {
          setAppliedCodeObj(res);
        })
        .catch(err => {
          console.warn('Failed to load applied code details:', err.message);
        });
    }
  }, [existing.discountCode]);

  // Check access request status on load for RECEPTIONIST
  useEffect(() => {
    if (role === 'RECEPTIONIST') {
      api.get('/discount-codes/access-requests/active')
        .then(res => {
          if (res) {
            setAccessRequestStatus(res.status);
          }
        })
        .catch(err => {
          console.warn('Failed to check access requests status:', err.message);
        });
    }
  }, [role]);

  const handleRequestCodeAccess = async () => {
    setLoadingAccess(true);
    try {
      const res = await api.post('/discount-codes/access-requests');
      Alert.alert('Request Sent', 'Your access request has been sent for Doctor/Admin approval.');
      setAccessRequestStatus('PENDING');
    } catch (err) {
      Alert.alert('Request Failed', err.message);
    } finally {
      setLoadingAccess(false);
    }
  };

  const loadRevealedCodes = async () => {
    try {
      const res = await api.get('/discount-codes/revealed');
      setRevealedCodes(res || []);
      setShowCodeRevealModal(true);
    } catch (err) {
      Alert.alert('Access Denied', err.message);
    }
  };

  const handleApplyCode = async () => {
    if (!discountCode.trim()) {
      setDiscountCodeError('Please enter a code');
      return;
    }
    setApplyingCode(true);
    setDiscountCodeError('');
    try {
      const res = await api.post('/discount-codes/validate', { code: discountCode });
      setAppliedDiscountCode(res.code);
      setAppliedCodeObj(res);
      setDiscountCodeError('');
      Alert.alert('Success', `Discount code "${res.code}" applied successfully!`);
    } catch (err) {
      setDiscountCodeError(err.message);
      setAppliedDiscountCode(null);
      setAppliedCodeObj(null);
    } finally {
      setApplyingCode(false);
    }
  };

  const handleClearCode = () => {
    setAppliedDiscountCode(null);
    setAppliedCodeObj(null);
    setDiscountCode('');
    setDiscountCodeError('');
  };

  // Add preset charge as line item (do not fill rate and quantity)
  const addPresetCharge = (preset) => {
    setAdditionalItems(prev => [...prev, {
      description: preset.chargeName,
      quantity: '',
      rate: '',
      discountType: 'PERCENTAGE',
      discountValue: '0',
      itemGroup: preset.chargeCategory || 'ADDITIONAL'
    }]);
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedEventId) return Alert.alert('Error', 'No calendar event linked. Please select a scheduled surgery event.');
    if (surgeries.length === 0) return Alert.alert('Error', 'Please select at least one surgery / procedure.');
    setSaving(true);
    try {
      const allItems = [];
      if (!isPackage) {
        if (enableInvestigations) {
          allItems.push(...investigations.map(i => ({ ...i, quantity: parseInt(i.quantity, 10) || 1, rate: Number(i.rate), discountType: 'PERCENTAGE', discountValue: Number(i.discountValue || 0), itemGroup: 'CUSTOM', chargeCategory: i.chargeCategory || 'Investigation' })));
        }
        if (enableMedicines) {
          allItems.push(...medicines.map(i => ({ ...i, quantity: parseInt(i.quantity, 10) || 1, rate: Number(i.rate), discountType: 'PERCENTAGE', discountValue: Number(i.discountValue || 0), itemGroup: 'OT_MEDICATION', chargeCategory: i.chargeCategory || 'Medicine' })));
        }
        if (enableConsumables) {
          allItems.push(...consumables.map(i => ({ ...i, quantity: parseInt(i.quantity, 10) || 1, rate: Number(i.rate), discountType: 'PERCENTAGE', discountValue: Number(i.discountValue || 0), itemGroup: 'CONSUMABLE', chargeCategory: i.chargeCategory || 'Consumable' })));
        }
        if (enableImplants) {
          allItems.push(...implants.map(i => ({ ...i, quantity: parseInt(i.quantity, 10) || 1, rate: Number(i.rate), discountType: 'PERCENTAGE', discountValue: Number(i.discountValue || 0), itemGroup: 'CONSUMABLE', chargeCategory: 'Implant' })));
        }
        if (enableMisc) {
          allItems.push(...additionalItems.map(i => ({ ...i, quantity: parseInt(i.quantity, 10) || 1, rate: Number(i.rate), discountType: 'PERCENTAGE', discountValue: Number(i.discountValue || 0), itemGroup: i.itemGroup || 'ADDITIONAL', chargeCategory: i.chargeCategory || 'Additional' })));
        }

        // Assistant Surgeon as item
        if (assistantSurgeonName?.trim()) {
          allItems.push({
            chargeCategory: 'Assistant Surgeon',
            description: `Assistant Surgeon - ${assistantSurgeonName}`,
            quantity: 1,
            rate: Number(assistantSurgeonFee) || 0,
            discountType: 'PERCENTAGE',
            discountValue: Number(assistantSurgeonDiscountValue || 0),
            itemGroup: 'CUSTOM'
          });
        }
      }



      const payload = {
        eventId: selectedEventId,
        expectedStayDays: isPackage ? stayDays : stayDays,
        expectedDurationMinutes: durationMinutes,
        roomId: selectedRoomId || null,
        roomDailyRate: Number(roomDailyRate) || 0,
        roomDiscountType: 'PERCENTAGE',
        roomDiscountValue: Number(roomDiscountValue) || 0,
        nursingDailyRate: Number(nursingDailyRate) || 0,
        nursingDiscountType: 'PERCENTAGE',
        nursingDiscountValue: Number(nursingDiscountValue) || 0,
        actualOtCharge: enableOt && !isPackage ? Number(otCost) * Number(otUnits) : 0,
        otDiscountType: 'PERCENTAGE',
        otDiscountValue: Number(otDiscountValue) || 0,
        actualAnaesthesiaCharge: enableAnaesthesia && !isPackage ? getAnaesthesiaTotal() : 0,
        anaesthesiaDiscountType: 'PERCENTAGE',
        anaesthesiaDiscountValue: Number(anaesthesiaDiscountValue) || 0,
        icuDays: enableIcu && !isPackage ? (Number(icuDays) || 0) : 0,
        icuDailyRate: enableIcu && !isPackage ? (Number(icuDailyRate) || 0) : 0,
        icuDiscountType: 'PERCENTAGE',
        icuDiscountValue: Number(icuDiscountValue) || 0,
        serviceDailyRate: 0,
        discountType: 'FIXED_AMOUNT',
        discountValue: 0,
        discountCode: appliedDiscountCode,
        gstRate: Number(gstRate) || 0,
        surgeries: surgeries.map((s, idx) => ({
          surgeryId: s.surgeryId,
          surgeryCost: isPackage ? 0 : (Number(s.surgeryCost) || 0),
          durationMinutes: s.durationMinutes || durationMinutes,
          discountType: 'PERCENTAGE',
          discountValue: Number(s.discountValue) || 0
        })),
        items: allItems.filter(i => i.description?.trim()),
        primaryDoctor,
        assistantSurgeons: assistantSurgeonName ? [assistantSurgeonName] : [],
        notes,
        inclusions,
        exclusions,
        surgeonId: primaryDoctorObj?.id || existing.surgeonId || null,
        scheduledDate: eventInfo?.startTime || existing.scheduledDate || null,
        surgeryName: eventInfo?.surgeryName || (surgeries[0]?.surgeryName) || existing.surgeryName || null,
        isPackage,
        packageName: isPackage ? packageName : null,
        packagePrice: isPackage ? (Number(packagePrice) || 0) : null,
        packageIncludes: isPackage ? packageIncludes : null,
        packageTemplateId: packageTemplateId || null,
        diagnoses: selectedDiagnoses
      };

      const saved = id ? await updateEstimate(id, payload) : await createEstimate(payload);
      const estimateId = saved?.id || id;

      if (isPackage && saveAsTemplate && packageName.trim()) {
        try {
          await api.post('/estimate-templates', {
            templateName: packageName.trim(),
            templateType: 'FIXED_PACKAGE',
            packagePrice: Number(packagePrice) || 0,
            packageNotes: packageIncludes || '',
            templateItems: surgeries.map(s => ({
              referenceId: s.surgeryId,
              itemCategory: 'SURGERY',
              itemName: s.surgeryName,
              quantity: 1,
              defaultRate: 0,
              discountValue: 0,
              discountType: 'PERCENTAGE'
            }))
          });
        } catch (err) {
          console.warn('Failed to save template', err);
        }
      }

      Alert.alert(
        'Success',
        id ? 'Estimate updated successfully.' : 'Estimate created successfully.',
        [
          {
            text: 'View Details',
            onPress: () => {
              if (estimateId) {
                navigation.replace('EstimateDetail', { id: estimateId });
              } else {
                navigation.goBack();
              }
            }
          }
        ],
        { cancelable: false }
      );
    } catch (err) {
      Alert.alert('Save Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Total bar data ────────────────────────────────────────────────────────────
  const totalBarData = {
    surgeries,
    investigations: enableInvestigations ? investigations : [],
    medicines: enableMedicines ? medicines : [],
    consumables: [
      ...(enableConsumables ? consumables : []),
      ...(enableImplants ? implants : [])
    ],
    additionalItems: [
      ...(enableMisc ? additionalItems : []),
      ...(assistantSurgeonName?.trim() ? [{
        description: `Assistant Surgeon - ${assistantSurgeonName}`,
        quantity: 1,
        rate: Number(assistantSurgeonFee) || 0,
        discountType: 'PERCENTAGE',
        discountValue: Number(assistantSurgeonDiscountValue || 0)
      }] : [])
    ],
    anaesthesiaCost: enableAnaesthesia ? Number(anaesthesiaCost) : 0,
    anaesthesiaUnits: enableAnaesthesia ? Number(anaesthesiaUnits) : 0,
    otCharge: enableOt ? Number(otCost) * Number(otUnits) : 0,
    roomDailyRate: Number(roomDailyRate),
    stayDays,
    nursingDailyRate: Number(nursingDailyRate),
    icuDays: enableIcu ? Number(icuDays) : 0,
    icuDailyRate: enableIcu ? Number(icuDailyRate) : 0,
    isPackage,
    packagePrice: Number(packagePrice) || 0,
    gstRate: Number(gstRate) || 0,
    roomDiscountValue: Number(roomDiscountValue) || 0,
    nursingDiscountValue: Number(nursingDiscountValue) || 0,
    anaesthesiaDiscountValue: Number(anaesthesiaDiscountValue) || 0,
    icuDiscountValue: Number(icuDiscountValue) || 0,
    otDiscountValue: Number(otDiscountValue) || 0,
    appliedCodeObj
  };

  // ── Calculate running totals for display ──
  const calcGrossAndDiscounts = () => {
    // Helper to calculate original (gross) amount and discount amount for custom items
    const calcCustom = (items) => {
      let gross = 0;
      let disc = 0;
      items.forEach(item => {
        const q = Number(item.quantity || 1);
        const r = Number(item.rate || 0);
        const itemGross = q * r;
        const itemDiscVal = Number(item.discountValue || 0);
        const itemDisc = itemGross * (itemDiscVal / 100);
        gross += itemGross;
        disc += itemDisc;
      });
      return { gross, disc };
    };

    // Surgeries original & discount
    let surgeriesGross = 0;
    let surgeriesDisc = 0;
    surgeries.forEach(s => {
      const cost = Number(s.surgeryCost || 0);
      const discVal = Number(s.discountValue || 0);
      surgeriesGross += cost;
      surgeriesDisc += cost * (discVal / 100);
    });

    // Room original & discount
    const roomGross = Number(stayDays) === 0 ? Number(roomDailyRate) : Number(roomDailyRate) * Number(stayDays);
    const roomDisc = roomGross * (Number(roomDiscountValue || 0) / 100);

    // Nursing original & discount
    const nursingGross = Number(nursingDailyRate) * Number(stayDays);
    const nursingDisc = nursingGross * (Number(nursingDiscountValue || 0) / 100);

    // ICU original & discount
    const icuGross = Number(icuDailyRate) * Number(icuDays);
    const icuDisc = icuGross * (Number(icuDiscountValue || 0) / 100);

    // Anaesthesia original & discount
    const anaesthesiaGross = enableAnaesthesia ? Number(anaesthesiaCost) * Number(anaesthesiaUnits) : 0;
    const anaesthesiaDisc = anaesthesiaGross * (Number(anaesthesiaDiscountValue || 0) / 100);

    // OT original & discount
    const otGross = enableOt ? Number(otCost) * Number(otUnits) : 0;
    const otDisc = otGross * (Number(otDiscountValue || 0) / 100);

    // Custom items gross & disc
    const investigationsRes = calcCustom(enableInvestigations ? investigations : []);
    const medicinesRes = calcCustom(enableMedicines ? medicines : []);
    const consumablesRes = calcCustom([
      ...(enableConsumables ? consumables : []),
      ...(enableImplants ? implants : [])
    ]);
    const additionalRes = calcCustom([
      ...(enableMisc ? additionalItems : []),
      ...(assistantSurgeonName?.trim() ? [{
        description: `Assistant Surgeon - ${assistantSurgeonName}`,
        quantity: 1,
        rate: Number(assistantSurgeonFee) || 0,
        discountType: 'PERCENTAGE',
        discountValue: Number(assistantSurgeonDiscountValue || 0)
      }] : [])
    ]);

    // Gross Subtotal
    const grossSubtotal = surgeriesGross + roomGross + nursingGross + icuGross + anaesthesiaGross + otGross +
      investigationsRes.gross + medicinesRes.gross + consumablesRes.gross + additionalRes.gross;

    // Item-level Discount
    const itemLevelDiscountTotal = surgeriesDisc + roomDisc + nursingDisc + icuDisc + anaesthesiaDisc + otDisc +
      investigationsRes.disc + medicinesRes.disc + consumablesRes.disc + additionalRes.disc;

    // Subtotal after item-level discounts
    const subtotalAfterItemDiscounts = Math.max(0, grossSubtotal - itemLevelDiscountTotal);

    // Taxable subtotal (if package, packagePrice overrides everything)
    const taxableSubtotal = isPackage ? (Number(packagePrice) || 0) : subtotalAfterItemDiscounts;

    // Discount Code Benefit
    let discountCodeBenefit = 0;
    if (appliedCodeObj) {
      if (appliedCodeObj.discountType === 'PERCENTAGE') {
        discountCodeBenefit = taxableSubtotal * (Number(appliedCodeObj.value) / 100);
      } else {
        discountCodeBenefit = Number(appliedCodeObj.value);
      }
      if (discountCodeBenefit > taxableSubtotal) {
        discountCodeBenefit = taxableSubtotal;
      }
    }

    // Total Discount
    const totalDiscount = isPackage ? discountCodeBenefit : (itemLevelDiscountTotal + discountCodeBenefit);

    // Taxable Amount (Gross minus total discounts)
    const taxableAmount = isPackage ? Math.max(0, (Number(packagePrice) || 0) - discountCodeBenefit) : Math.max(0, taxableSubtotal - discountCodeBenefit);
    const gstAmount = taxableAmount * (Number(gstRate) / 100);
    const grandTotal = taxableAmount + gstAmount;

    return {
      gross: isPackage ? Number(packagePrice) || 0 : grossSubtotal,
      discount: totalDiscount,
      net: taxableAmount,
      gst: gstAmount,
      grand: grandTotal
    };
  };

  const calculatedTotals = calcGrossAndDiscounts();

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* ── Linked Surgery Event Banner (compact) ── */}
        {selectedEventId && eventInfo && (
          <View style={styles.eventBanner}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={styles.eventBannerTitle}>📅 Linked Event</Text>
              {!routeEventId && (
                <TouchableOpacity onPress={() => { setSelectedEventId(''); setEventInfo(null); }} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.06)' }}>
                  <Text style={{ fontSize: 10, color: theme.colors.primary, fontWeight: '700' }}>Change</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Text style={{ fontSize: 12, color: theme.colors.text }}>👤 {eventInfo.patientName} ({eventInfo.patientUhid})</Text>
              {eventInfo.doctorName && <Text style={{ fontSize: 12, color: theme.colors.text }}>🩺 {eventInfo.doctorName}</Text>}
              <Text style={{ fontSize: 12, color: theme.colors.text }}>⏰ {fmtDate(eventInfo.startTime)}</Text>
            </View>
          </View>
        )}

        {/* ── Link Event Search if not linked ── */}
        {!selectedEventId && (
          <View style={styles.section}>
            <SectionHeader icon="📅" title="Link Scheduled Surgery Event *" />
            
            <FormLabel text="Patient Name / UHID / Event Title" />
            <TextInput
              style={styles.input}
              value={eventSearch}
              onChangeText={(v) => {
                setEventSearch(v);
                setShowEventDropdown(true);
              }}
              onFocus={() => setShowEventDropdown(true)}
              placeholder="Search by name, UHID, or title…"
              placeholderTextColor={theme.colors.textMuted}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <FormLabel text="Patient Phone Number" />
                <TextInput
                  style={styles.input}
                  value={eventPhoneSearch}
                  onChangeText={(v) => {
                    setEventPhoneSearch(v);
                    setShowEventDropdown(true);
                  }}
                  onFocus={() => setShowEventDropdown(true)}
                  placeholder="e.g. 9876543210"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <FormLabel text="Scheduled Date" />
                <DateDropdown
                  value={eventDateSearch}
                  onChange={(val) => {
                    setEventDateSearch(val);
                    setShowEventDropdown(true);
                  }}
                />
              </View>
            </View>

            {showEventDropdown && (
              <View style={styles.miniDropdown}>
                {allEvents
                  .filter(e => {
                    if (eventSearch) {
                      const searchLower = eventSearch.toLowerCase();
                      const matchText = (
                        e.title?.toLowerCase().includes(searchLower) ||
                        e.patient?.name?.toLowerCase().includes(searchLower) ||
                        e.patient?.uhid?.toLowerCase().includes(searchLower)
                      );
                      if (!matchText) return false;
                    }
                    if (eventPhoneSearch) {
                      const matchPhone = e.patient?.mobile?.includes(eventPhoneSearch);
                      if (!matchPhone) return false;
                    }
                    if (eventDateSearch) {
                      const eDate = e.startTime ? e.startTime.split('T')[0] : '';
                      if (eDate !== eventDateSearch) return false;
                    }
                    return true;
                  })
                  .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
                  .slice(0, 8)
                  .map(e => (
                    <TouchableOpacity
                      key={e.id}
                      style={styles.miniDropdownItem}
                      onPress={() => {
                        setSelectedEventId(e.id);
                        setShowEventDropdown(false);
                      }}
                    >
                      <View>
                        <Text style={styles.miniDropdownText}>
                          {e.title} – {e.patient?.name} ({e.patient?.uhid})
                        </Text>
                        <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
                          📞 {e.patient?.mobile || 'No Phone'} | 📅 {fmtDate(e.startTime)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
              </View>
            )}
          </View>
        )}

        {/* ── Diagnosis (Optional) ── */}
        <View style={styles.section}>
          <FormLabel text="Diagnosis (Optional)" />
          
          {/* Selected Diagnosis Chips */}
          {selectedDiagnoses.length > 0 && (
            <View style={styles.chipContainer}>
              {selectedDiagnoses.map((diag, index) => (
                <View key={index} style={styles.diagnosisChip}>
                  <Text style={styles.diagnosisChipText}>{diag}</Text>
                  <TouchableOpacity 
                    onPress={() => setSelectedDiagnoses(selectedDiagnoses.filter(d => d !== diag))} 
                    style={styles.diagnosisChipDelete}
                  >
                    <Text style={styles.diagnosisChipDeleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <SearchableDropdown
            items={diagnosisMasters}
            value={null}
            onSelect={(d) => {
              if (d && d.diagnosisName) {
                if (!selectedDiagnoses.includes(d.diagnosisName)) {
                  setSelectedDiagnoses([...selectedDiagnoses, d.diagnosisName]);
                }
              }
            }}
            placeholder="Search & add diagnosis ▼"
            keyExtractor={d => d.id || d.diagnosisName}
            renderItem={d => `${d.diagnosisName} (${d.icdCode || 'N/A'})`}
            renderSelected={d => `${d.diagnosisName} (${d.icdCode || 'N/A'})`}
            filterFn={(d, q) => `${d.diagnosisName} ${d.icdCode || ''}`.toLowerCase().includes(q.toLowerCase())}
          />

          {/* Add Custom Diagnosis input */}
          <View style={styles.customDiagRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginVertical: 0 }]}
              placeholder="Or type custom diagnosis..."
              placeholderTextColor={theme.colors.textMuted}
              value={customDiagText}
              onChangeText={setCustomDiagText}
            />
            <TouchableOpacity 
              style={styles.customDiagAddBtn} 
              onPress={() => {
                const txt = customDiagText.trim();
                if (txt) {
                  if (!selectedDiagnoses.includes(txt)) {
                    setSelectedDiagnoses([...selectedDiagnoses, txt]);
                  }
                  setCustomDiagText('');
                }
              }}
            >
              <Text style={styles.customDiagAddBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Template & Package Section ── */}
        <View style={styles.section}>
          <SectionHeader icon="📄" title="Template & Package Selection" />
          
          <FormLabel text="Select Estimate Template" />
          <SearchableDropdown
            items={allTemplates}
            value={packageTemplateId ? (allTemplates.find(t => t.id === packageTemplateId) || null) : null}
            onSelect={(temp) => {
              if (temp) {
                handleTemplateSelect(temp);
              } else {
                setPackageTemplateId('');
                setIsPackage(false);
                setPackagePrice('');
                setPackageName('');
                setPackageIncludes('');
                setSurgeries([]);
              }
            }}
            placeholder="Browse templates ▼"
            keyExtractor={t => t.id}
            renderItem={t => `${t.templateName} (${t.templateType || 'DETAILED'})`}
            renderSelected={t => `📄 ${t.templateName} (${t.templateType || 'DETAILED'})`}
            filterFn={(t, q) => (t.templateName || '').toLowerCase().includes(q.toLowerCase())}
          />

          <FormLabel text="Name Doctor/Surgeon *" />
          <SearchableDropdown
            items={allDoctors}
            value={primaryDoctorObj || (primaryDoctor ? { _manualEntry: true, displayName: primaryDoctor } : null)}
            onSelect={(d) => {
              if (!d) {
                setPrimaryDoctorObj(null);
                setPrimaryDoctor('');
              } else if (d._manualEntry) {
                setPrimaryDoctorObj(null);
                setPrimaryDoctor(d.displayName);
              } else {
                const name = `Dr. ${d.firstName} ${d.lastName}`;
                setPrimaryDoctorObj(d);
                setPrimaryDoctor(name);
              }
            }}
            placeholder="Search & select doctor from master ▼"
            keyExtractor={d => d.id || d.displayName}
            renderItem={d => d._manualEntry ? d.displayName : `Dr. ${d.firstName} ${d.lastName} (${d.specialty || ''})`}
            renderSelected={d => d._manualEntry ? `✏️ ${d.displayName}` : `🩺 Dr. ${d.firstName} ${d.lastName} (${d.specialty})`}
            filterFn={(d, q) => d._manualEntry
              ? d.displayName.toLowerCase().includes(q.toLowerCase())
              : `${d.firstName} ${d.lastName} ${d.specialty || ''}`.toLowerCase().includes(q.toLowerCase())
            }
            manualEntryLabel="Not in list? Type doctor name manually"
          />

          <FormLabel text="Name Assistant Surgeon (Optional)" />
          <SearchableDropdown
            items={allDoctors}
            value={assistantSurgeonObj || (assistantSurgeonName ? { _manualEntry: true, displayName: assistantSurgeonName } : null)}
            onSelect={(d) => {
              if (!d) {
                setAssistantSurgeonObj(null);
                setAssistantSurgeonName('');
              } else if (d._manualEntry) {
                setAssistantSurgeonObj(null);
                setAssistantSurgeonName(d.displayName);
              } else {
                const name = `Dr. ${d.firstName} ${d.lastName}`;
                setAssistantSurgeonObj(d);
                setAssistantSurgeonName(name);
              }
            }}
            placeholder="Search & select assistant surgeon ▼"
            keyExtractor={d => d.id || d.displayName}
            renderItem={d => d._manualEntry ? d.displayName : `Dr. ${d.firstName} ${d.lastName} (${d.specialty || ''})`}
            renderSelected={d => d._manualEntry ? `✏️ ${d.displayName}` : `🩺 Dr. ${d.firstName} ${d.lastName} (${d.specialty})`}
            filterFn={(d, q) => d._manualEntry
              ? d.displayName.toLowerCase().includes(q.toLowerCase())
              : `${d.firstName} ${d.lastName} ${d.specialty || ''}`.toLowerCase().includes(q.toLowerCase())
            }
            manualEntryLabel="Not in list? Type assistant name manually"
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
            <TableCheckbox checked={isPackage} onChange={setIsPackage} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text, marginLeft: 10 }}>
              Fixed Template (Y/N)
            </Text>
          </View>
        </View>

        {/* ── Table Layout (Fixed vs Itemized) ── */}
        {isPackage ? (
          /* ── Fixed Template (isPackage = Y) ── */
          <View style={tableStyles.table}>
            <View style={tableStyles.tableHeader}>
              <View style={[tableStyles.headerCell, { flex: 1 }]}><Text style={{ fontWeight: '700', fontSize: 13, color: '#333' }}>Package Feature</Text></View>
              <View style={[tableStyles.headerCell, { flex: 2 }]}><Text style={{ fontWeight: '700', fontSize: 13, color: '#333' }}>Inputs</Text></View>
            </View>

            <View style={tableStyles.tableRow}>
              <View style={tableStyles.cellLabel}><Text style={tableStyles.cellLabelText}>Surgeries *</Text></View>
              <View style={tableStyles.cellInputs}>
                {surgeries.length === 0 && <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginBottom: 6 }}>No surgeries added</Text>}
                {surgeries.map((s, idx) => {
                  return (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: '#f9fafb', padding: 8, borderRadius: 6 }}>
                      <Text style={{ flex: 1, fontWeight: '600', fontSize: 13, color: '#333' }}>{s.surgeryName}</Text>
                      <TouchableOpacity onPress={() => removeSurgery(idx)} style={{ paddingHorizontal: 8 }}>
                        <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
                <SurgeryPicker
                  role={role}
                  onSelect={(s) => setSurgeries([...surgeries, s])}
                  selectedSurgeries={surgeries}
                  placeholder="+ Add Surgery"
                />
              </View>
            </View>

            <View style={tableStyles.tableRow}>
              <View style={tableStyles.cellLabel}><Text style={tableStyles.cellLabelText}>Package Name *</Text></View>
              <View style={tableStyles.cellInputs}>
                <TextInput
                  style={tableStyles.tableInput}
                  value={packageName}
                  onChangeText={setPackageName}
                  placeholder="e.g. Gallbladder Removal Package"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            <View style={tableStyles.tableRow}>
              <View style={tableStyles.cellLabel}><Text style={tableStyles.cellLabelText}>Package Amount (₹) *</Text></View>
              <View style={tableStyles.cellInputs}>
                <TextInput
                  style={tableStyles.tableInput}
                  value={packagePrice}
                  onChangeText={setPackagePrice}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>


            <View style={tableStyles.tableRow}>
              <View style={tableStyles.cellLabel}><Text style={tableStyles.cellLabelText}>Expected Stay (Days) *</Text></View>
              <View style={tableStyles.cellInputs}>
                <TextInput
                  style={tableStyles.tableInput}
                  value={String(pkgStayOption === -1 ? pkgStayCustom : pkgStayOption)}
                  onChangeText={(v) => {
                    setPkgStayOption(-1);
                    setPkgStayCustom(v);
                  }}
                  keyboardType="numeric"
                  placeholder="Days"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            <View style={tableStyles.tableRow}>
              <View style={tableStyles.cellLabel}><Text style={tableStyles.cellLabelText}>Anaesthesia Type *</Text></View>
              <View style={tableStyles.cellInputs}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[tableStyles.itemCellAddBtn, packageAnaesthesiaType === 'GA' && { backgroundColor: theme.colors.primary }]}
                    onPress={() => setPackageAnaesthesiaType('GA')}
                  >
                    <Text style={{ color: packageAnaesthesiaType === 'GA' ? '#fff' : theme.colors.primary, fontWeight: '700', fontSize: 12 }}>GA</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[tableStyles.itemCellAddBtn, packageAnaesthesiaType === 'LA' && { backgroundColor: theme.colors.primary }]}
                    onPress={() => setPackageAnaesthesiaType('LA')}
                  >
                    <Text style={{ color: packageAnaesthesiaType === 'LA' ? '#fff' : theme.colors.primary, fontWeight: '700', fontSize: 12 }}>LA</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={[tableStyles.tableRow, tableStyles.tableRowLast]}>
              <View style={tableStyles.cellLabel}><Text style={tableStyles.cellLabelText}>Inclusion Note</Text></View>
              <View style={tableStyles.cellInputs}>
                <TextInput
                  style={[tableStyles.tableInput, { minHeight: 120 }]}
                  value={packageIncludes}
                  onChangeText={setPackageIncludes}
                  placeholder="Inclusion note text..."
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                />
              </View>
            </View>
          </View>
        ) : (
          /* ── Itemized Table (isPackage = N) ── */
          <View style={tableStyles.table}>
            <View style={tableStyles.tableHeader}>
              <Text style={tableStyles.headerTitle}>Charge Breakdown</Text>
            </View>

            {/* Hospitalization Details (Global) */}
            <View style={{ padding: 12, backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#eee', zIndex: 100 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>Hospitalization Details</Text>
              <View style={{ flexDirection: 'row', gap: 10, zIndex: 100 }}>
                <View style={{ flex: 1, zIndex: 110 }}>
                  <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginBottom: 4 }}>Expected Stay (Days)</Text>
                  <DaysDropdown value={stayOption === -1 ? (Number(customStayDays) || 0) : stayOption} onChange={(val) => {
                    if (val === -1) {
                       setStayOption(-1);
                    } else {
                       setStayOption(val);
                    }
                  }} />
                </View>
                <View style={{ flex: 1.5, zIndex: 100 }}>
                  <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginBottom: 4 }}>Bed Category</Text>
                  <SearchableDropdown
                    items={rooms}
                    value={selectedRoomId ? (rooms.find(r => r.id === selectedRoomId) || null) : null}
                    onSelect={(r) => {
                      if (r) {
                        setSelectedRoomId(r.id);
                        setRoomDailyRate(String(r.defaultDailyCharge || 0));
                      } else {
                        setSelectedRoomId('');
                        setRoomDailyRate('0');
                      }
                    }}
                    placeholder="Select Bed Type ▼"
                    keyExtractor={r => r.id}
                    renderItem={r => `${r.roomName} — ${r.roomType}`}
                    renderSelected={r => `${r.roomName}`}
                    filterFn={(r, q) => `${r.roomName} ${r.roomType}`.toLowerCase().includes(q.toLowerCase())}
                  />
                </View>
              </View>
            </View>

            {/* Row 1: Surgeon Fees */}
            <View style={tableStyles.tableRow}>
              <View style={tableStyles.rowHeader}>
                <Text style={tableStyles.rowSr}>1</Text>
                <Text style={tableStyles.cellLabelText}>Surgeon Fees</Text>
                <Text style={tableStyles.rowAmount}>
                  ₹{surgeries.reduce((sum, s) => sum + (Number(s.surgeryCost) || 0), 0).toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={tableStyles.rowBody}>
                {surgeries.map((s, idx) => {
                  const cost = Number(s.surgeryCost || 0);
                  const disc = Number(s.discountValue || 0);
                  const net = cost * (1 - disc / 100);
                  return (
                    <View key={idx} style={{ borderBottomWidth: 0.5, borderBottomColor: '#eee', paddingBottom: 8, marginBottom: 8 }}>
                      <View style={[tableStyles.inputRow, { marginBottom: 4 }]}>
                        <Text style={[tableStyles.inputRowLabel, { fontWeight: '600' }]}>{s.surgeryName}</Text>
                        <TouchableOpacity onPress={() => removeSurgery(idx)} style={{ paddingHorizontal: 6 }}>
                          <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>Fee:</Text>
                        <TextInput
                          style={[tableStyles.tableInput, { width: 90 }]}
                          value={String(s.surgeryCost)}
                          onChangeText={(v) => updateSurgeryCost(idx, v)}
                          keyboardType="numeric"
                          placeholder="Fee"
                        />
                        <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>Disc:</Text>
                        <DiscountPicker
                          value={Number(s.discountValue || 0)}
                          onChange={(val) => {
                            updateSurgeryDiscount(idx, 'discountType', 'PERCENTAGE');
                            updateSurgeryDiscount(idx, 'discountValue', String(val));
                          }}
                        />
                        <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginLeft: 'auto', fontWeight: '700' }}>
                          Net: ₹{net.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Text>
                      </View>
                    </View>
                  );
                })}
                <SurgeryPicker
                  role={role}
                  onSelect={handleAddSurgery}
                  selectedSurgeries={surgeries}
                  placeholder="+ Add Surgery Procedure"
                />
              </View>
            </View>

            {/* Row 2: Assistant Surgeon Fees */}
            {assistantSurgeonName ? (
              <View style={tableStyles.tableRow}>
                <View style={tableStyles.rowHeader}>
                  <Text style={tableStyles.rowSr}>2</Text>
                  <Text style={tableStyles.cellLabelText}>Assistant Surgeon Fees</Text>
                  <Text style={tableStyles.rowAmount}>
                    ₹{(Number(assistantSurgeonFee) || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={tableStyles.rowBody}>
                  <View style={{ borderBottomWidth: 0.5, borderBottomColor: '#eee', paddingBottom: 8, marginBottom: 8 }}>
                    <View style={[tableStyles.inputRow, { marginBottom: 4 }]}>
                      <Text style={[tableStyles.inputRowLabel, { fontWeight: '600' }]}>{assistantSurgeonName}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>Fee:</Text>
                      <TextInput
                        style={[tableStyles.tableInput, { width: 90 }]}
                        value={String(assistantSurgeonFee)}
                        onChangeText={(v) => setAssistantSurgeonFee(v)}
                        keyboardType="numeric"
                        placeholder="Fee"
                      />
                      <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>Disc:</Text>
                      <DiscountPicker
                        value={Number(assistantSurgeonDiscountValue || 0)}
                        onChange={(val) => setAssistantSurgeonDiscountValue(val)}
                      />
                      <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginLeft: 'auto', fontWeight: '700' }}>
                        Net: ₹{((Number(assistantSurgeonFee) || 0) * (1 - (Number(assistantSurgeonDiscountValue || 0) / 100))).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Row 3: Room Charges */}
            <View style={tableStyles.tableRow}>
              <View style={tableStyles.rowHeader}>
                <Text style={tableStyles.rowSr}>2</Text>
                <Text style={tableStyles.cellLabelText}>Room Charges</Text>
                <Text style={tableStyles.rowAmount}>
                  ₹{((stayOption === -1 ? Number(customStayDays) || 0 : stayOption) * (Number(roomDailyRate) || 0)).toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={tableStyles.rowBody}>
                <View style={tableStyles.inlineRow}>
                  <Text style={tableStyles.inlineLabel}>Rate/Day:</Text>
                  <TextInput
                    style={[tableStyles.tableInput, { width: 70 }]}
                    value={roomDailyRate}
                    onChangeText={setRoomDailyRate}
                    keyboardType="numeric"
                  />
                  <Text style={tableStyles.inlineLabel}>Disc:</Text>
                  <DiscountPicker value={Number(roomDiscountValue || 0)} onChange={(val) => setRoomDiscountValue(String(val))} />
                  <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginLeft: 'auto', fontWeight: '700' }}>
                    Net: ₹{((Number(stayOption === -1 ? Number(customStayDays) || 0 : stayOption) === 0 ? Number(roomDailyRate || 0) : Number(roomDailyRate || 0) * Number(stayOption === -1 ? Number(customStayDays) || 0 : stayOption)) * (1 - (Number(roomDiscountValue || 0) / 100))).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              </View>
            </View>

            {/* Row 3: Nursing Charges */}
            <View style={tableStyles.tableRow}>
              <View style={tableStyles.rowHeader}>
                <Text style={tableStyles.rowSr}>3</Text>
                <Text style={tableStyles.cellLabelText}>Nursing Charges</Text>
                <Text style={tableStyles.rowAmount}>
                  ₹{(stayDays * (Number(nursingDailyRate) || 0)).toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={tableStyles.rowBody}>
                <View style={tableStyles.inlineRow}>
                  <Text style={tableStyles.inlineLabel}>Rate/Day:</Text>
                  <TextInput
                    style={[tableStyles.tableInput, { width: 70 }]}
                    value={nursingDailyRate}
                    onChangeText={setNursingDailyRate}
                    keyboardType="numeric"
                  />
                  <Text style={tableStyles.inlineLabel}>Disc:</Text>
                  <DiscountPicker value={Number(nursingDiscountValue || 0)} onChange={(val) => setNursingDiscountValue(String(val))} />
                  <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginLeft: 'auto', fontWeight: '700' }}>
                    Net: ₹{((stayDays * (Number(nursingDailyRate) || 0)) * (1 - (Number(nursingDiscountValue || 0) / 100))).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              </View>
            </View>

            {/* Row 4: Anesthesia Charges */}
            <View style={tableStyles.tableRow}>
              <View style={tableStyles.rowHeader}>
                <Text style={tableStyles.rowSr}>4</Text>
                <View style={tableStyles.cellLabelCheckboxRow}>
                  <TableCheckbox checked={enableAnaesthesia} onChange={setEnableAnaesthesia} />
                  <Text style={tableStyles.cellLabelText}>Anaesthesia</Text>
                </View>
                <Text style={tableStyles.rowAmount}>
                  ₹{(enableAnaesthesia ? getAnaesthesiaTotal() : 0).toLocaleString('en-IN')}
                </Text>
              </View>
              {enableAnaesthesia && (
                <View style={tableStyles.rowBody}>
                  <View style={tableStyles.chipRow}>
                    {ANAESTHESIA_TYPES.map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[tableStyles.chip, anaesthesiaType === t && tableStyles.chipActive]}
                        onPress={() => setAnaesthesiaType(t)}
                      >
                        <Text style={[tableStyles.chipText, anaesthesiaType === t && tableStyles.chipTextActive]}>{t.split(' ')[0]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={tableStyles.inlineRow}>
                    <Text style={tableStyles.inlineLabel}>Mode:</Text>
                    <TouchableOpacity
                      style={tableStyles.chip}
                      onPress={() => setAnaesthesiaPricingMode(prev => prev === 'FIXED' ? 'PER_UNIT' : prev === 'PER_UNIT' ? 'FIRST_HR' : 'FIXED')}
                    >
                      <Text style={tableStyles.chipText}>
                        {anaesthesiaPricingMode === 'FIXED' ? 'Fixed' : anaesthesiaPricingMode === 'PER_UNIT' ? 'Per Unit' : '1st Hr+Cons'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={tableStyles.inlineRow}>
                    {anaesthesiaPricingMode === 'FIRST_HR' ? (
                      <>
                        <TextInput style={[tableStyles.tableInput, { flex: 1 }]} value={anaesthesiaFirstHourCost} onChangeText={setAnaesthesiaFirstHourCost} keyboardType="numeric" placeholder="1st hr" />
                        <TextInput style={[tableStyles.tableInput, { flex: 1 }]} value={anaesthesiaConsecutiveCost} onChangeText={setAnaesthesiaConsecutiveCost} keyboardType="numeric" placeholder="Cons hr" />
                        <TextInput style={[tableStyles.tableInput, { width: 60 }]} value={anaesthesiaUnits} onChangeText={setAnaesthesiaUnits} keyboardType="numeric" placeholder="hrs" />
                      </>
                    ) : (
                      <>
                        <TextInput style={[tableStyles.tableInput, { flex: 1 }]} value={anaesthesiaCost} onChangeText={setAnaesthesiaCost} keyboardType="numeric" placeholder="Amount (₹)" />
                        {anaesthesiaPricingMode === 'PER_UNIT' && (
                          <TextInput style={[tableStyles.tableInput, { width: 70 }]} value={anaesthesiaUnits} onChangeText={setAnaesthesiaUnits} keyboardType="numeric" placeholder="Units" />
                        )}
                      </>
                    )}
                  </View>
                  <View style={tableStyles.inlineRow}>
                    <Text style={tableStyles.inlineLabel}>Disc:</Text>
                    <DiscountPicker value={Number(anaesthesiaDiscountValue || 0)} onChange={(val) => setAnaesthesiaDiscountValue(String(val))} />
                    <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginLeft: 'auto', fontWeight: '700' }}>
                      Net: ₹{((getAnaesthesiaTotal()) * (1 - (Number(anaesthesiaDiscountValue || 0) / 100))).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Row 5: ICU/HDU Charges */}
            <View style={tableStyles.tableRow}>
              <View style={tableStyles.rowHeader}>
                <Text style={tableStyles.rowSr}>5</Text>
                <View style={tableStyles.cellLabelCheckboxRow}>
                  <TableCheckbox checked={enableIcu} onChange={setEnableIcu} />
                  <Text style={tableStyles.cellLabelText}>ICU / HDU</Text>
                </View>
                <Text style={tableStyles.rowAmount}>
                  ₹{(enableIcu ? (Number(icuDays) || 0) * (Number(icuDailyRate) || 0) : 0).toLocaleString('en-IN')}
                </Text>
              </View>
              {enableIcu && (
                <View style={tableStyles.rowBody}>
                  <View style={tableStyles.inlineRow}>
                    <Text style={tableStyles.inlineLabel}>Days:</Text>
                    <View style={{ flex: 0.8 }}>
                      <DaysDropdown value={Number(icuDays) || 0} onChange={(val) => setIcuDays(String(val))} />
                    </View>
                    <Text style={tableStyles.inlineLabel}>Rate:</Text>
                    <TextInput
                      style={[tableStyles.tableInput, { width: 70 }]}
                      value={icuDailyRate}
                      onChangeText={setIcuDailyRate}
                      keyboardType="numeric"
                    />
                    <Text style={tableStyles.inlineLabel}>Disc:</Text>
                    <DiscountPicker value={Number(icuDiscountValue || 0)} onChange={(val) => setIcuDiscountValue(String(val))} />
                    <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginLeft: 'auto', fontWeight: '700' }}>
                      Net: ₹{(((Number(icuDays) || 0) * (Number(icuDailyRate) || 0)) * (1 - (Number(icuDiscountValue || 0) / 100))).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Row 6: OT Charges */}
            <View style={tableStyles.tableRow}>
              <View style={tableStyles.rowHeader}>
                <Text style={tableStyles.rowSr}>6</Text>
                <View style={tableStyles.cellLabelCheckboxRow}>
                  <TableCheckbox checked={enableOt} onChange={setEnableOt} />
                  <Text style={tableStyles.cellLabelText}>OT Charges</Text>
                </View>
                <Text style={tableStyles.rowAmount}>
                  ₹{(enableOt ? (Number(otCost) || 0) * (Number(otUnits) || 0) : 0).toLocaleString('en-IN')}
                </Text>
              </View>
              {enableOt && (
                <View style={tableStyles.rowBody}>
                  <View style={tableStyles.chipRow}>
                    {otRooms.map(r => (
                      <TouchableOpacity
                        key={r.id}
                        style={[tableStyles.chip, selectedOtRoomId === r.id && tableStyles.chipActive]}
                        onPress={() => handleOtRoomSelect(r)}
                      >
                        <Text style={[tableStyles.chipText, selectedOtRoomId === r.id && tableStyles.chipTextActive]}>{r.roomName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={tableStyles.inlineRow}>
                    <Text style={tableStyles.inlineLabel}>Hours:</Text>
                    <View style={{ flex: 0.8 }}>
                      <DaysDropdown value={Number(otUnits) || 0} unit="Hours" onChange={(val) => setOtUnits(String(val))} />
                    </View>
                    <Text style={tableStyles.inlineLabel}>Rate:</Text>
                    <TextInput
                      style={[tableStyles.tableInput, { width: 70 }]}
                      value={otCost}
                      onChangeText={setOtCost}
                      keyboardType="numeric"
                    />
                    <Text style={tableStyles.inlineLabel}>Disc:</Text>
                    <DiscountPicker value={Number(otDiscountValue || 0)} onChange={(val) => setOtDiscountValue(String(val))} />
                    <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginLeft: 'auto', fontWeight: '700' }}>
                      Net: ₹{(((Number(otCost) || 0) * (Number(otUnits) || 0)) * (1 - (Number(otDiscountValue || 0) / 100))).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </Text>
                  </View>
                </View>
              )}
            </View>


            {/* Row 8: Investigations Charges */}
            <View style={tableStyles.tableRow}>
              <View style={tableStyles.rowHeader}>
                <Text style={tableStyles.rowSr}>8</Text>
                <View style={tableStyles.cellLabelCheckboxRow}>
                  <TableCheckbox checked={enableInvestigations} onChange={setEnableInvestigations} />
                  <Text style={tableStyles.cellLabelText}>Investigations</Text>
                </View>
                <Text style={tableStyles.rowAmount}>
                  ₹{(enableInvestigations ? investigations.reduce((sum, item) => sum + (Number(item.rate) || 0) * (parseInt(item.quantity) || 1), 0) : 0).toLocaleString('en-IN')}
                </Text>
              </View>
              {enableInvestigations && (
                <View style={tableStyles.rowBody}>
                  <ItemTableCell
                    items={investigations}
                    setItems={setInvestigations}
                    placeholderDescription="e.g. CBC, X-Ray, MRI"
                    emptyItemCategory="Investigation"
                    emptyItemGroup="CUSTOM"
                  />
                </View>
              )}
            </View>

            {/* Row 9: OT Medications Charges */}
            <View style={tableStyles.tableRow}>
              <View style={tableStyles.rowHeader}>
                <Text style={tableStyles.rowSr}>9</Text>
                <View style={tableStyles.cellLabelCheckboxRow}>
                  <TableCheckbox checked={enableMedicines} onChange={setEnableMedicines} />
                  <Text style={tableStyles.cellLabelText}>OT Medicines</Text>
                </View>
                <Text style={tableStyles.rowAmount}>
                  ₹{(enableMedicines ? medicines.reduce((sum, item) => sum + (Number(item.rate) || 0) * (parseInt(item.quantity) || 1), 0) : 0).toLocaleString('en-IN')}
                </Text>
              </View>
              {enableMedicines && (
                <View style={tableStyles.rowBody}>
                  <ItemTableCell
                    items={medicines}
                    setItems={setMedicines}
                    placeholderDescription="e.g. Propofol, Oxygen Gas"
                    emptyItemCategory="Medicine"
                    emptyItemGroup="OT_MEDICATION"
                  />
                </View>
              )}
            </View>

            {/* Row 10: Consumables Charges */}
            <View style={tableStyles.tableRow}>
              <View style={tableStyles.rowHeader}>
                <Text style={tableStyles.rowSr}>10</Text>
                <View style={tableStyles.cellLabelCheckboxRow}>
                  <TableCheckbox checked={enableConsumables} onChange={setEnableConsumables} />
                  <Text style={tableStyles.cellLabelText}>Consumables</Text>
                </View>
                <Text style={tableStyles.rowAmount}>
                  ₹{(enableConsumables ? consumables.reduce((sum, item) => sum + (Number(item.rate) || 0) * (parseInt(item.quantity) || 1), 0) : 0).toLocaleString('en-IN')}
                </Text>
              </View>
              {enableConsumables && (
                <View style={tableStyles.rowBody}>
                  <ItemTableCell
                    items={consumables}
                    setItems={setConsumables}
                    placeholderDescription="e.g. Syringes, Gloves, Gauze"
                    emptyItemCategory="Consumable"
                    emptyItemGroup="CONSUMABLE"
                  />
                </View>
              )}
            </View>

            {/* Row 11: Implant/Prosthesis Charges */}
            <View style={tableStyles.tableRow}>
              <View style={tableStyles.rowHeader}>
                <Text style={tableStyles.rowSr}>11</Text>
                <View style={tableStyles.cellLabelCheckboxRow}>
                  <TableCheckbox checked={enableImplants} onChange={setEnableImplants} />
                  <Text style={tableStyles.cellLabelText}>Implants</Text>
                </View>
                <Text style={tableStyles.rowAmount}>
                  ₹{(enableImplants ? implants.reduce((sum, item) => sum + (Number(item.rate) || 0) * (parseInt(item.quantity) || 1), 0) : 0).toLocaleString('en-IN')}
                </Text>
              </View>
              {enableImplants && (
                <View style={tableStyles.rowBody}>
                  <ItemTableCell
                    items={implants}
                    setItems={setImplants}
                    placeholderDescription="e.g. Mesh, Stent, Prosthesis"
                    emptyItemCategory="Implant"
                    emptyItemGroup="CONSUMABLE"
                  />
                </View>
              )}
            </View>

            {/* Row 12: Miscellaneous Charges */}
            <View style={[tableStyles.tableRow, tableStyles.tableRowLast]}>
              <View style={tableStyles.rowHeader}>
                <Text style={tableStyles.rowSr}>12</Text>
                <View style={tableStyles.cellLabelCheckboxRow}>
                  <TableCheckbox checked={enableMisc} onChange={setEnableMisc} />
                  <Text style={tableStyles.cellLabelText}>Miscellaneous</Text>
                </View>
                <Text style={tableStyles.rowAmount}>
                  ₹{(enableMisc ? additionalItems.reduce((sum, item) => sum + (Number(item.rate) || 0) * (parseInt(item.quantity) || 1), 0) : 0).toLocaleString('en-IN')}
                </Text>
              </View>
              {enableMisc && (
                <View style={tableStyles.rowBody}>
                  <ItemTableCell
                    items={additionalItems}
                    setItems={setAdditionalItems}
                    placeholderDescription="e.g. Dietitian, Equipment, Admin"
                    emptyItemCategory="Additional"
                    emptyItemGroup="ADDITIONAL"
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── N: Overall Discount & Tax ── */}
        {!isPackage && (
        <View style={styles.section}>
          <SectionHeader icon="🏷️" title="Overall Discount & Tax" />
          
          {/* Read-Only Overall Summary */}
          <View style={{ backgroundColor: '#f9f9f9', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#eaeaea' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 13, color: '#555', fontWeight: '500' }}>Gross Amount:</Text>
              <Text style={{ fontSize: 13, color: '#222', fontWeight: '700' }}>₹{calculatedTotals.gross.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 13, color: '#555', fontWeight: '500' }}>Total Discount:</Text>
              <Text style={{ fontSize: 13, color: theme.colors.danger, fontWeight: '700' }}>–₹{calculatedTotals.discount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: '#ccc', paddingTop: 6 }}>
              <Text style={{ fontSize: 13, color: '#222', fontWeight: '700' }}>Net Amount:</Text>
              <Text style={{ fontSize: 13, color: '#1a237e', fontWeight: '800' }}>₹{calculatedTotals.net.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
            </View>
          </View>

          {/* GST Input - Editable */}
          <View style={{ marginBottom: 12 }}>
            <FormLabel text="GST Rate (%)" />
            <TextInput
              style={styles.input}
              value={gstRate}
              onChangeText={setGstRate}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>

          {/* Discount Code Input and Actions */}
          <View style={{ borderTopWidth: 0.5, borderTopColor: '#eaeaea', paddingTop: 12, marginTop: 10 }}>
            <FormLabel text="Discount Code" />
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TextInput
                  style={[styles.input, { flex: 1, textTransform: 'uppercase' }]}
                  value={discountCode}
                  onChangeText={(v) => setDiscountCode(v.toUpperCase().trim())}
                  placeholder="ENTER CODE"
                  placeholderTextColor={theme.colors.textMuted}
                  editable={!appliedDiscountCode}
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoCorrect={false}
                />
                {appliedDiscountCode ? (
                  <TouchableOpacity
                    style={{ backgroundColor: theme.colors.danger, paddingHorizontal: 16, borderRadius: 8, height: 44, justifyContent: 'center' }}
                    onPress={handleClearCode}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Clear</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 16, borderRadius: 8, height: 44, justifyContent: 'center' }}
                    onPress={handleApplyCode}
                    disabled={applyingCode}
                  >
                    {applyingCode ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Apply</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
              {discountCodeError ? (
                <Text style={{ color: theme.colors.danger, fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                  {discountCodeError}
                </Text>
              ) : null}
              {appliedDiscountCode && appliedCodeObj && (
                <Text style={{ color: theme.colors.success, fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                  ✓ Code "{appliedDiscountCode}" applied: {appliedCodeObj.discountType === 'PERCENTAGE' ? `${appliedCodeObj.value}%` : `₹${appliedCodeObj.value}`} discount benefit.
                </Text>
              )}

              {/* Receptionist Access Requests Flow */}
              {role === 'RECEPTIONIST' && (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  {accessRequestStatus === 'APPROVED' ? (
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: theme.colors.success + '18', borderWidth: 1, borderColor: theme.colors.success, borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
                      onPress={loadRevealedCodes}
                    >
                      <Text style={{ color: theme.colors.success, fontWeight: '700', fontSize: 12 }}>
                        🔑 View Available Codes (Revealed)
                      </Text>
                    </TouchableOpacity>
                  ) : accessRequestStatus === 'PENDING' ? (
                    <View style={{ flex: 1, backgroundColor: '#f0f0f0', borderRadius: 8, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ccc' }}>
                      <Text style={{ color: '#666', fontWeight: '700', fontSize: 12 }}>
                        ⏳ Access Request Pending Approval
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: theme.colors.primary + '14', borderWidth: 1, borderColor: theme.colors.primary + '60', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
                      onPress={handleRequestCodeAccess}
                      disabled={loadingAccess}
                    >
                      <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 12 }}>
                        {loadingAccess ? 'Sending Request...' : '🔑 Request Discount Code Access'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
        )}

        {/* ── O: Notes & T&C Templates ── */}
        <View style={styles.section}>
          <SectionHeader icon="📝" title="Notes / Inclusions / Exclusions" />
          <FormLabel text="Notes" />
          <TextInput style={[styles.input, styles.textarea]} value={notes} onChangeText={setNotes}
            placeholder="General notes visible on estimate…" placeholderTextColor={theme.colors.textMuted} multiline />

          <View style={{ marginTop: 8, marginBottom: 12 }}>
            <TouchableOpacity 
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: theme.colors.surface,
                padding: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.colors.border
              }}
              onPress={() => setShowTemplatesDropdown(!showTemplatesDropdown)}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.primary }}>
                📋 Terms & Conditions Templates
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.primary }}>
                {showTemplatesDropdown ? '▲ Hide' : '▼ View Templates'}
              </Text>
            </TouchableOpacity>

            {showTemplatesDropdown && (
              <View style={{
                backgroundColor: '#f9f9f9',
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderTopWidth: 0,
                borderBottomLeftRadius: 8,
                borderBottomRightRadius: 8,
                padding: 10,
                gap: 8
              }}>
                {termsTemplates.map(t => (
                  <View key={t.id} style={{
                    backgroundColor: theme.colors.surface,
                    padding: 10,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#eaeaea',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text }}>{t.name}</Text>
                      <Text style={{ fontSize: 10, color: theme.colors.textMuted, marginTop: 2 }} numberOfLines={1}>
                        {t.content}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity 
                        style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 4 }}
                        onPress={() => handleApplyTemplate(t.content, 'append')}
                      >
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>Append</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={{ backgroundColor: theme.colors.success, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 4 }}
                        onPress={() => handleApplyTemplate(t.content, 'replace')}
                      >
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>Replace</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={{ backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: '#ccc' }}
                        onPress={() => {
                          setEditingTemplate(t);
                          setIsEditingModalVisible(true);
                        }}
                      >
                        <Text style={{ color: '#333', fontSize: 11, fontWeight: '600' }}>✏️ Edit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <TouchableOpacity 
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.04)',
                    padding: 8,
                    borderRadius: 6,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: '#ccc',
                    marginTop: 4
                  }}
                  onPress={() => {
                    setEditingTemplate({ id: '', name: '', content: '' });
                    setIsEditingModalVisible(true);
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#666' }}>
                    ➕ Add Custom Terms Template
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <FormLabel text="Inclusions" />
          <TextInput style={[styles.input, styles.textarea]} value={inclusions} onChangeText={setInclusions}
            placeholder="What is included in this estimate…" placeholderTextColor={theme.colors.textMuted} multiline />
          <FormLabel text="Exclusions" />
          <TextInput style={[styles.input, styles.textarea]} value={exclusions} onChangeText={setExclusions}
            placeholder="What is NOT included (ICU, blood, implants…)" placeholderTextColor={theme.colors.textMuted} multiline />
        </View>

        {/* Bottom spacer for sticky bar */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ── Sticky Total Bar ── */}
      <EstimateTotalBar data={totalBarData} onSave={handleSave} saving={saving} />

      {/* ── Terms & Conditions Add/Edit Modal ── */}
      <Modal
        visible={isEditingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditingModalVisible(false)}
      >
        <TouchableOpacity activeOpacity={1} 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
          onPress={() => setIsEditingModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} 
            style={{ backgroundColor: theme.colors.surface, borderRadius: 12, width: '100%', maxWidth: 500, padding: 20, borderWidth: 1, borderColor: theme.colors.border }}
            onPress={e => e.stopPropagation()}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.text, marginBottom: 15 }}>
              {editingTemplate?.id ? '✏️ Edit Template' : '➕ Add Terms & Conditions Template'}
            </Text>
            
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 4 }}>Template Name</Text>
            <TextInput 
              style={{ backgroundColor: theme.colors.background, color: theme.colors.text, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 12, fontSize: 14 }}
              value={editingTemplate?.name || ''}
              onChangeText={text => setEditingTemplate(prev => ({ ...prev, name: text }))}
              placeholder="e.g. Standard General Disclaimer"
              placeholderTextColor={theme.colors.textMuted}
            />

            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 4 }}>Terms & Conditions Text</Text>
            <TextInput 
              style={{ backgroundColor: theme.colors.background, color: theme.colors.text, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border, minHeight: 150, fontSize: 12, textAlignVertical: 'top', marginBottom: 15 }}
              value={editingTemplate?.content || ''}
              onChangeText={text => setEditingTemplate(prev => ({ ...prev, content: text }))}
              placeholder="Write the terms and conditions points here..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
            />

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              {editingTemplate?.id ? (
                <TouchableOpacity 
                  style={{ backgroundColor: theme.colors.danger, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6 }}
                  onPress={() => handleDeleteTemplate(editingTemplate.id)}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Delete</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity 
                style={{ backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: '#ccc' }}
                onPress={() => setIsEditingModalVisible(false)}
              >
                <Text style={{ color: '#333', fontWeight: '700', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ backgroundColor: theme.colors.success, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 6 }}
                onPress={() => handleSaveTemplate(editingTemplate?.id, editingTemplate?.name, editingTemplate?.content)}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Save</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Revealed Codes Modal (for Receptionist) ── */}
      <Modal
        visible={showCodeRevealModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCodeRevealModal(false)}
      >
        <TouchableOpacity activeOpacity={1} 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
          onPress={() => setShowCodeRevealModal(false)}
        >
          <TouchableOpacity activeOpacity={1} 
            style={{ backgroundColor: theme.colors.surface, borderRadius: 12, width: '100%', maxWidth: 450, padding: 20, borderWidth: 1, borderColor: theme.colors.border }}
            onPress={e => e.stopPropagation()}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.text, marginBottom: 15 }}>
              🔑 Revealed Discount Codes
            </Text>
            
            <ScrollView style={{ maxHeight: 300, marginBottom: 15 }}>
              {revealedCodes.length === 0 ? (
                <Text style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', marginVertical: 20 }}>
                  No active discount codes found.
                </Text>
              ) : (
                revealedCodes.map(code => (
                  <View key={code.id} style={{
                    backgroundColor: '#f9f9f9',
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#eaeaea',
                    marginBottom: 8,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.primary }}>{code.code}</Text>
                      <Text style={{ fontSize: 12, color: theme.colors.text, marginTop: 2 }}>{code.description || 'No description'}</Text>
                      <Text style={{ fontSize: 10, color: theme.colors.textMuted, marginTop: 2 }}>
                        Type: {code.codeType} | Limit: {code.usageLimit ? `${code.usageCount}/${code.usageLimit}` : 'Unlimited'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.success }}>
                        {code.discountType === 'PERCENTAGE' ? `${code.value}%` : `₹${code.value}`}
                      </Text>
                      <TouchableOpacity
                        style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, marginTop: 6 }}
                        onPress={() => {
                          setDiscountCode(code.code);
                          setAppliedDiscountCode(code.code);
                          setAppliedCodeObj(code);
                          setDiscountCodeError('');
                          setShowCodeRevealModal(false);
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Select</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity 
              style={{ backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#ccc' }}
              onPress={() => setShowCodeRevealModal(false)}
            >
              <Text style={{ color: '#333', fontWeight: '700', fontSize: 13 }}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 20 },

  // Event banner
  eventBanner: {
    backgroundColor: theme.colors.primary + '14',
    borderRadius: 14, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: theme.colors.primary + '40'
  },
  eventBannerLoadText: { color: theme.colors.textMuted, fontSize: 13 },
  eventBannerTitle: { color: theme.colors.primary, fontWeight: '800', fontSize: 14, marginBottom: 10 },
  eventBannerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  eventBannerCell: { minWidth: '45%', flex: 1 },
  eventBannerLabel: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '600', marginBottom: 2 },
  eventBannerValue: { color: theme.colors.text, fontWeight: '700', fontSize: 13 },
  eventBannerSub: { color: theme.colors.textMuted, fontSize: 11 },

  // Sections
  section: {
    backgroundColor: theme.colors.surface, borderRadius: 14, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionIcon: { fontSize: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.text },

  label: { color: theme.colors.textMuted, fontWeight: '600', fontSize: 12, marginTop: 8, marginBottom: 4 },
  input: {
    backgroundColor: theme.colors.background, color: theme.colors.text,
    padding: 11, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border,
    fontSize: 14, minHeight: 44
  },
  textarea: { minHeight: 72, textAlignVertical: 'top' },

  // Surgery cards
  surgeryCard: {
    backgroundColor: theme.colors.background, borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: theme.colors.primary + '30'
  },
  surgeryCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  surgeryName: { color: theme.colors.text, fontWeight: '700', fontSize: 14 },
  primaryTag: {
    color: theme.colors.primary, fontSize: 9, fontWeight: '800', letterSpacing: 1,
    backgroundColor: theme.colors.primary + '18', paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 3
  },
  surgeryFeeRow: { flexDirection: 'row', gap: 10 },

  discRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  discTypeBtn: {
    width: 38, height: 44, borderRadius: 8,
    backgroundColor: theme.colors.primary + '20', alignItems: 'center', justifyContent: 'center'
  },
  discTypeBtnText: { color: theme.colors.primary, fontWeight: '800', fontSize: 15 },

  removeCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.colors.danger + '18', alignItems: 'center', justifyContent: 'center'
  },
  removeCircleText: { color: theme.colors.danger, fontSize: 14, fontWeight: '700' },

  // Duration
  durationRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  durationField: { flex: 1 },
  durationColon: { color: theme.colors.text, fontSize: 24, fontWeight: '800', marginBottom: 12 },
  durationTotal: { color: theme.colors.textMuted, fontSize: 12, marginBottom: 14, textAlign: 'center' },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  // Rate rows
  rateRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' },
  calcBox: {
    backgroundColor: theme.colors.success + '18', borderRadius: 10,
    padding: 10, alignItems: 'center', justifyContent: 'center', minWidth: 90, height: 44, marginBottom: 0
  },
  calcBoxLabel: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '600' },
  calcBoxValue: { color: theme.colors.success, fontSize: 13, fontWeight: '800' },

  // Mini dropdown
  miniDropdown: {
    backgroundColor: theme.colors.surface, borderRadius: 8, borderWidth: 1,
    borderColor: theme.colors.border, marginTop: 2, overflow: 'hidden'
  },
  miniDropdownItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border + '50'
  },
  miniDropdownText: { color: theme.colors.text, fontSize: 13, fontWeight: '500' },
  miniDropdownRate: { color: theme.colors.success, fontSize: 12, fontWeight: '700' },

  // Assistant surgeons
  asstRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 6 },

  // Add line button
  addLineBtn: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.primary + '60',
    borderRadius: 8, padding: 11, alignItems: 'center', marginTop: 6
  },
  addLineBtnText: { color: theme.colors.primary, fontWeight: '700', fontSize: 13 },

  // Preset chips
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  presetChip: {
    backgroundColor: theme.colors.background, borderRadius: 10, padding: 8,
    borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center'
  },
  presetChipText: { color: theme.colors.primaryLight, fontSize: 12, fontWeight: '700' },
  presetChipRate: { color: theme.colors.textMuted, fontSize: 10, marginTop: 2 },

  // Fixed Package custom pickers & generator
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 6,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pillText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  generateBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  generateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  inclusionTextarea: {
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 13,
    lineHeight: 18,
  },
  inclusionHint: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 },
  diagnosisChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary + '22', borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 16, paddingVertical: 4, paddingLeft: 12, paddingRight: 6 },
  diagnosisChipText: { color: theme.colors.primary, fontSize: 12, fontWeight: '600' },
  diagnosisChipDelete: { marginLeft: 6, padding: 2 },
  diagnosisChipDeleteText: { color: theme.colors.primary, fontWeight: '700', fontSize: 13 },
  customDiagRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 6, marginBottom: 12 },
  customDiagAddBtn: { backgroundColor: theme.colors.primary, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', height: 46 },
  customDiagAddBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 }
});

const tableStyles = StyleSheet.create({
  // ── Table container ──
  table: {
    borderWidth: 1.5,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom: 16,
  },

  // ── Header bar ──
  tableHeader: {
    backgroundColor: '#1a237e',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerTitle: {
    fontWeight: '800',
    fontSize: 13,
    color: '#fff',
    letterSpacing: 0.5,
  },

  // ── Row: outer wrapper (stacks rowHeader + rowBody vertically) ──
  tableRow: {
    flexDirection: 'column',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },

  // ── Row header: Sr# | Label/Checkbox | Amount — single horizontal line ──
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#f8f9fa',
    gap: 8,
  },
  rowSr: {
    width: 22,
    fontWeight: '800',
    fontSize: 12,
    color: '#1a237e',
    textAlign: 'center',
  },
  rowAmount: {
    marginLeft: 'auto',
    fontWeight: '800',
    fontSize: 13,
    color: '#1a237e',
    minWidth: 70,
    textAlign: 'right',
  },

  // ── Row body: full-width inputs area below the header ──
  rowBody: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: '#fff',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#ececec',
  },

  // ── Inline row: label + control side by side ──
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  inlineLabel: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
    minWidth: 38,
  },
  compactInput: {
    width: 90,
  },

  // ── Surgery fee input row ──
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  inputRowLabel: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  inputRowField: {
    width: 100,
  },

  // ── Chip selector ──
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#f0f4f8',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.primary + '50',
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  chipTextActive: {
    color: '#fff',
  },

  // ── Label text ──
  cellLabelText: {
    fontWeight: '700',
    fontSize: 13,
    color: '#222',
    flex: 1,
  },
  cellLabelCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },

  // ── Input field ──
  tableInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: '#333',
    minHeight: 36,
  },

  // ── Disabled placeholder text ──
  disabledText: {
    color: '#aaa',
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 4,
  },

  // ── ItemTableCell sub-items ──
  itemCellContainer: {
    width: '100%',
    gap: 6,
  },
  itemCellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemCellRemove: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemCellAddBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#f0f4f8',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.primary + '50',
    marginTop: 4,
  },
  itemCellAddBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },

  // ── Checkbox ──
  checkboxSquare: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#333',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    flexShrink: 0,
  },
  checkboxSquareChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkboxTick: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 13,
  },
});
