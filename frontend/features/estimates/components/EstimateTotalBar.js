/**
 * EstimateTotalBar.js
 * Sticky bottom bar showing a live running breakdown and grand total.
 * Mirrors the backend calculation engine (client-side preview only).
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { theme } from '../../../shared/styles/theme';

export function EstimateTotalBar({ data, onSave, saving }) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const {
    surgeries = [], investigations = [], medicines = [],
    consumables = [], additionalItems = [],
    anaesthesiaCost = 0, anaesthesiaUnits = 1,
    otCharge = 0, roomDailyRate = 0, stayDays = 0,
    nursingDailyRate = 0, isPackage = false, packagePrice = 0,
    gstRate = 18, icuDays = 0, icuDailyRate = 0,
    roomDiscountValue = 0, nursingDiscountValue = 0,
    anaesthesiaDiscountValue = 0, icuDiscountValue = 0,
    otDiscountValue = 0, appliedCodeObj = null
  } = data;

  // Helper to calculate original (gross) amount and discount amount for custom items
  const calcCustomItems = (items) => {
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
  const anaesthesiaGross = Number(anaesthesiaCost) * Number(anaesthesiaUnits);
  const anaesthesiaDisc = anaesthesiaGross * (Number(anaesthesiaDiscountValue || 0) / 100);

  // OT original & discount
  const otGross = Number(otCharge);
  const otDisc = otGross * (Number(otDiscountValue || 0) / 100);

  // Custom items gross & disc
  const investigationsRes = calcCustomItems(investigations);
  const medicinesRes = calcCustomItems(medicines);
  const consumablesRes = calcCustomItems(consumables);
  const additionalRes = calcCustomItems(additionalItems);

  // Gross Subtotal (Sum of all original amounts before discounts)
  const grossSubtotal = surgeriesGross + roomGross + nursingGross + icuGross + anaesthesiaGross + otGross +
    investigationsRes.gross + medicinesRes.gross + consumablesRes.gross + additionalRes.gross;

  // Item-level Discount (Sum of all itemised discounts)
  const itemLevelDiscountTotal = surgeriesDisc + roomDisc + nursingDisc + icuDisc + anaesthesiaDisc + otDisc +
    investigationsRes.disc + medicinesRes.disc + consumablesRes.disc + additionalRes.disc;

  // Subtotal after item-level discounts
  const subtotalAfterItemDiscounts = Math.max(0, grossSubtotal - itemLevelDiscountTotal);

  // Taxable subtotal (if package, packagePrice overrides everything)
  const taxableSubtotal = isPackage ? (Number(packagePrice) || 0) : subtotalAfterItemDiscounts;

  // Discount Code Benefit
  let discountCodeBenefit = 0;
  if (appliedCodeObj && !isPackage) {
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
  const totalDiscount = isPackage ? 0 : (itemLevelDiscountTotal + discountCodeBenefit);

  // Taxable Amount (Gross minus total discounts)
  const taxableAmount = isPackage ? (Number(packagePrice) || 0) : Math.max(0, taxableSubtotal - discountCodeBenefit);
  const gstAmount = taxableAmount * (Number(gstRate) / 100);
  const grandTotal = taxableAmount + gstAmount;

  const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const rows = [
    { label: 'Procedures', value: surgeriesGross - surgeriesDisc, show: surgeriesGross > 0 },
    { label: 'Anaesthesia', value: anaesthesiaGross - anaesthesiaDisc, show: anaesthesiaGross > 0 },
    { label: 'OT Charges', value: otGross - otDisc, show: otGross > 0 },
    { label: Number(stayDays) === 0 ? 'Room (Day Care)' : `Room (${stayDays}d)`, value: roomGross - roomDisc, show: roomGross > 0 },
    { label: 'Nursing', value: nursingGross - nursingDisc, show: nursingGross > 0 },
    { label: `ICU / HDU (${icuDays}d)`, value: icuGross - icuDisc, show: icuGross > 0 },
    { label: 'Investigations', value: investigationsRes.gross - investigationsRes.disc, show: investigationsRes.gross > 0 },
    { label: 'Medicines', value: medicinesRes.gross - medicinesRes.disc, show: medicinesRes.gross > 0 },
    { label: 'Consumables', value: consumablesRes.gross - consumablesRes.disc, show: consumablesRes.gross > 0 },
    { label: 'Additional', value: additionalRes.gross - additionalRes.disc, show: additionalRes.gross > 0 },
  ];

  return (
    <>
      {/* Breakdown modal */}
      <Modal visible={showBreakdown} transparent animationType="slide" onRequestClose={() => setShowBreakdown(false)}>
        <Pressable style={barStyles.overlay} onPress={() => setShowBreakdown(false)}>
          <Pressable style={barStyles.sheet} onPress={e => e.stopPropagation()}>
            <Text style={barStyles.sheetTitle}>📊 Estimate Breakdown</Text>
            <ScrollView>
              {rows.filter(r => r.show).map((r, i) => (
                <View key={i} style={barStyles.breakdownRow}>
                  <Text style={barStyles.breakdownLabel}>{r.label}</Text>
                  <Text style={barStyles.breakdownValue}>{fmt(r.value)}</Text>
                </View>
              ))}
              <View style={barStyles.breakdownDivider} />
              <View style={barStyles.breakdownRow}>
                <Text style={barStyles.breakdownLabel}>Gross Subtotal</Text>
                <Text style={barStyles.breakdownValue}>{fmt(isPackage ? packagePrice : grossSubtotal)}</Text>
              </View>
              {!isPackage && itemLevelDiscountTotal > 0 && (
                <View style={barStyles.breakdownRow}>
                  <Text style={[barStyles.breakdownLabel, { color: theme.colors.danger }]}>Item-Level Discount</Text>
                  <Text style={[barStyles.breakdownValue, { color: theme.colors.danger }]}>–{fmt(itemLevelDiscountTotal)}</Text>
                </View>
              )}
              {!isPackage && discountCodeBenefit > 0 && (
                <View style={barStyles.breakdownRow}>
                  <Text style={[barStyles.breakdownLabel, { color: theme.colors.danger }]}>
                    Code Benefit ({appliedCodeObj.code})
                  </Text>
                  <Text style={[barStyles.breakdownValue, { color: theme.colors.danger }]}>–{fmt(discountCodeBenefit)}</Text>
                </View>
              )}
              {!isPackage && totalDiscount > 0 && (
                <View style={barStyles.breakdownRow}>
                  <Text style={[barStyles.breakdownLabel, { color: theme.colors.danger, fontWeight: '700' }]}>Total Discount</Text>
                  <Text style={[barStyles.breakdownValue, { color: theme.colors.danger, fontWeight: '700' }]}>–{fmt(totalDiscount)}</Text>
                </View>
              )}
              {Number(gstRate) > 0 && (
                <View style={barStyles.breakdownRow}>
                  <Text style={barStyles.breakdownLabel}>GST ({gstRate}%)</Text>
                  <Text style={barStyles.breakdownValue}>{fmt(gstAmount)}</Text>
                </View>
              )}
              <View style={[barStyles.breakdownRow, barStyles.grandRow]}>
                <Text style={barStyles.grandLabel}>GRAND TOTAL</Text>
                <Text style={barStyles.grandValue}>{fmt(grandTotal)}</Text>
              </View>
            </ScrollView>
            <TouchableOpacity style={barStyles.closeBtn} onPress={() => setShowBreakdown(false)}>
              <Text style={barStyles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Sticky bar */}
      <View style={barStyles.bar}>
        <TouchableOpacity style={barStyles.totalPill} onPress={() => setShowBreakdown(true)} activeOpacity={0.7}>
          <Text style={barStyles.totalLabel}>Total  </Text>
          <Text style={barStyles.totalAmount}>{fmt(grandTotal)}</Text>
          <Text style={barStyles.expandIcon}> ▲</Text>
        </TouchableOpacity>

        <TouchableOpacity style={barStyles.saveBtn} onPress={onSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={barStyles.saveBtnText}>💾  Save Estimate</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

const barStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
    elevation: 12
  },
  totalPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.primary + '18',
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: theme.colors.primary + '40'
  },
  totalLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  totalAmount: { color: theme.colors.primary, fontSize: 18, fontWeight: '900' },
  expandIcon: { color: theme.colors.primary, fontSize: 11 },
  saveBtn: {
    flex: 1, backgroundColor: theme.colors.success,
    paddingVertical: 14, borderRadius: 12, alignItems: 'center'
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Breakdown modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '70%', borderWidth: 1, borderColor: theme.colors.border
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text, marginBottom: 14, textAlign: 'center' },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  breakdownLabel: { color: theme.colors.textMuted, fontSize: 13 },
  breakdownValue: { color: theme.colors.text, fontWeight: '600', fontSize: 13 },
  breakdownDivider: { borderTopWidth: 1, borderTopColor: theme.colors.border, marginVertical: 8 },
  grandRow: { paddingTop: 8 },
  grandLabel: { color: theme.colors.text, fontWeight: '800', fontSize: 15 },
  grandValue: { color: theme.colors.success, fontWeight: '900', fontSize: 18 },
  closeBtn: {
    marginTop: 14, backgroundColor: theme.colors.background, borderRadius: 10,
    padding: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border
  },
  closeBtnText: { color: theme.colors.textMuted, fontWeight: '600', fontSize: 14 }
});
