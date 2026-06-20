/**
 * LineItemRow.js
 * Reusable editable line item row for estimate sections:
 * Investigations, Medicines, Consumables, Additional Charges
 */
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../../shared/styles/theme';

export function LineItemRow({ item, index, onChange, onRemove }) {
  const qty = Number(item.quantity || 1);
  const rate = Number(item.rate || 0);
  const disc = Number(item.discountValue || 0);
  const rawAmount = qty * rate;
  const discAmount = item.discountType === 'PERCENTAGE' ? rawAmount * (disc / 100) : disc;
  const finalAmount = Math.max(0, rawAmount - discAmount);

  return (
    <View style={styles.row}>
      {/* Description */}
      <TextInput
        style={[styles.input, styles.descInput]}
        value={item.description}
        onChangeText={v => onChange(index, 'description', v)}
        placeholder="Item / Service"
        placeholderTextColor={theme.colors.textMuted}
      />

      <View style={styles.numRow}>
        {/* Qty */}
        <TextInput
          style={[styles.input, styles.smallInput]}
          value={String(item.quantity)}
          onChangeText={v => onChange(index, 'quantity', v)}
          keyboardType="numeric"
          placeholder="Qty"
          placeholderTextColor={theme.colors.textMuted}
        />

        {/* Rate */}
        <TextInput
          style={[styles.input, styles.rateInput]}
          value={String(item.rate)}
          onChangeText={v => onChange(index, 'rate', v)}
          keyboardType="numeric"
          placeholder="₹ Rate"
          placeholderTextColor={theme.colors.textMuted}
        />

        {/* Discount toggle + value */}
        <TouchableOpacity
          style={styles.discToggle}
          onPress={() => onChange(index, 'discountType', item.discountType === 'PERCENTAGE' ? 'FIXED_AMOUNT' : 'PERCENTAGE')}
        >
          <Text style={styles.discToggleText}>{item.discountType === 'PERCENTAGE' ? '%' : '₹'}</Text>
        </TouchableOpacity>
        <TextInput
          style={[styles.input, styles.discInput]}
          value={String(item.discountValue || '')}
          onChangeText={v => onChange(index, 'discountValue', v)}
          keyboardType="numeric"
          placeholder="Disc"
          placeholderTextColor={theme.colors.textMuted}
        />

        {/* Computed final */}
        <View style={styles.amountBox}>
          <Text style={styles.amountText}>₹{finalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>

        {/* Remove */}
        <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(index)}>
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 8 },
  numRow: { flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' },
  input: {
    backgroundColor: theme.colors.surface, color: theme.colors.text,
    borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border,
    padding: 10, fontSize: 13, minHeight: 40
  },
  descInput: { flex: 1, width: '100%' },
  smallInput: { width: 46 },
  rateInput: { flex: 1, minWidth: 70 },
  discToggle: {
    width: 32, height: 40, borderRadius: 8, backgroundColor: theme.colors.primary + '20',
    alignItems: 'center', justifyContent: 'center'
  },
  discToggleText: { color: theme.colors.primary, fontWeight: '800', fontSize: 14 },
  discInput: { width: 54 },
  amountBox: {
    backgroundColor: theme.colors.success + '18', borderRadius: 8,
    paddingHorizontal: 8, height: 40, justifyContent: 'center', minWidth: 74
  },
  amountText: { color: theme.colors.success, fontWeight: '700', fontSize: 13 },
  removeBtn: {
    width: 36, height: 40, borderRadius: 8,
    backgroundColor: theme.colors.danger + '18',
    alignItems: 'center', justifyContent: 'center'
  },
  removeBtnText: { color: theme.colors.danger, fontWeight: '700', fontSize: 15 }
});
