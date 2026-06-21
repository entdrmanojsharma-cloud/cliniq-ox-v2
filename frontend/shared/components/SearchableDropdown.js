/**
 * SearchableDropdown.js  — Shared combobox component
 *
 * Props:
 *  items             – array of data objects
 *  value             – currently selected item object (null if none)
 *  onSelect(item)    – called with the chosen item, or null to clear
 *  placeholder       – text shown in the trigger when closed
 *  keyExtractor(item) → string key
 *  renderItem(item)   → string label shown in the list
 *  renderSelected(item) → string shown in the selected chip
 *  filterFn(item, query) → boolean  – return true if item matches query
 *  allowManualEntry  – (bool, default true) show "Not in list? Type manually" footer
 *  manualEntryLabel  – (string) label for the manual-entry footer row
 *
 * Behaviour:
 *  • Tap trigger → opens sorted A–Z list; trigger row becomes a TextInput
 *  • Type directly in the trigger to filter (no separate inner search bar)
 *  • Click / tap anywhere outside → closes (onBlur + 150 ms delay)
 *  • Tap a list row → selects and closes
 *  • "Not in list?" footer → shows inline text input; confirm adds a synthetic
 *    { _manualEntry: true, displayName: <typed text> } object via onSelect
 *  • Selected state shows a tinted chip + red "✕ Change" button
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Platform, Modal
} from 'react-native';

export function SearchableDropdown({
  items = [],
  value,
  onSelect,
  placeholder = 'Tap to browse ▼',
  keyExtractor,
  renderItem,
  renderSelected,
  filterFn,
  allowManualEntry = true,
  manualEntryLabel = 'Not in list? Type manually',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Manual-entry sub-state inside the modal
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState('');
  const manualInputRef = useRef(null);

  const sortedFiltered = query.trim()
    ? items
        .filter(item => filterFn(item, query))
        .sort((a, b) => renderItem(a).localeCompare(renderItem(b)))
    : [...items].sort((a, b) => renderItem(a).localeCompare(renderItem(b)));

  const handleOpen  = () => { setOpen(true); setManualMode(false); setManualText(''); };
  const handleClose = () => { setOpen(false); setQuery(''); setManualMode(false); setManualText(''); };

  const handleSelect = (item) => {
    onSelect(item);
    setOpen(false);
    setQuery('');
    setManualMode(false);
    setManualText('');
  };

  const handleClear = () => {
    onSelect(null);
    setOpen(false);
    setQuery('');
    setManualMode(false);
    setManualText('');
  };

  const handleConfirmManual = () => {
    const text = manualText.trim();
    if (!text) return;
    onSelect({ _manualEntry: true, displayName: text });
    setOpen(false);
    setQuery('');
    setManualMode(false);
    setManualText('');
  };

  // ── Selected chip ────────────────────────────────────────────────────
  if (value) {
    // Support _manualEntry synthetic objects
    const label = value._manualEntry
      ? `✏️ ${value.displayName}`
      : renderSelected(value);
    return (
      <View style={s.chipRow}>
        <View style={s.chip}>
          <Text style={s.chipText} numberOfLines={1}>{label}</Text>
        </View>
        <TouchableOpacity style={s.chipChange} onPress={handleClear}>
          <Text style={s.chipChangeText}>✕ Change</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Closed / Open ────────────────────────────────────────────────────
  return (
    <View>
      {/* Trigger row */}
      <TouchableOpacity style={s.trigger} onPress={handleOpen} activeOpacity={0.8}>
        <Text style={s.triggerPlaceholder}>{placeholder}</Text>
        <TouchableOpacity
          onPress={handleOpen}
          style={s.arrowBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={s.arrow}>▼</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Modal Dropdown */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={handleClose}>
        <TouchableOpacity activeOpacity={1} style={s.modalOverlay} onPress={handleClose}>
          <TouchableOpacity activeOpacity={1} style={s.modalContent} onPress={e => e.stopPropagation()}>

            {/* ── Normal search mode ── */}
            {!manualMode ? (
              <>
                <TextInput
                  style={s.searchInputModal}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search..."
                  placeholderTextColor="#64748b"
                  autoFocus
                />
                <View style={s.panel}>
                  <Text style={s.countHint}>
                    {sortedFiltered.length} result{sortedFiltered.length !== 1 ? 's' : ''}
                    {query ? ` for "${query}"` : ' — A to Z'}
                  </Text>
                  <ScrollView
                    style={s.list}
                    keyboardShouldPersistTaps="handled"
                  >
                    {sortedFiltered.length === 0 ? (
                      <Text style={s.empty}>No results for "{query}"</Text>
                    ) : (
                      sortedFiltered.map(item => (
                        <TouchableOpacity
                          key={keyExtractor(item)}
                          style={s.row}
                          onPress={() => handleSelect(item)}
                          activeOpacity={0.7}
                        >
                          <Text style={s.rowText}>{renderItem(item)}</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>

                  {/* ── "Not in list? Type manually" footer ── */}
                  {allowManualEntry && (
                    <TouchableOpacity
                      style={s.manualEntryBtn}
                      onPress={() => {
                        setManualMode(true);
                        setManualText(query); // pre-fill with what they typed
                        setTimeout(() => manualInputRef.current?.focus(), 50);
                      }}
                    >
                      <Text style={s.manualEntryText}>✏️  {manualEntryLabel}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            ) : (
              /* ── Manual text-entry mode ── */
              <View style={s.manualPanel}>
                <Text style={s.manualTitle}>Type manually</Text>
                <TextInput
                  ref={manualInputRef}
                  style={s.manualInput}
                  value={manualText}
                  onChangeText={setManualText}
                  placeholder="Enter name here..."
                  placeholderTextColor="#64748b"
                  autoFocus
                  onSubmitEditing={handleConfirmManual}
                  returnKeyType="done"
                />
                <View style={s.manualActions}>
                  <TouchableOpacity
                    style={s.manualBackBtn}
                    onPress={() => { setManualMode(false); setManualText(''); }}
                  >
                    <Text style={s.manualBackText}>← Back to list</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.manualConfirmBtn, !manualText.trim() && s.manualConfirmBtnDisabled]}
                    onPress={handleConfirmManual}
                    disabled={!manualText.trim()}
                  >
                    <Text style={s.manualConfirmText}>✓ Use This Name</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  chipRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  chip:           { flex: 1, backgroundColor: '#1a73e822', borderWidth: 1.5, borderColor: '#1a73e8', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12 },
  chipText:       { color: '#1a73e8', fontWeight: '700', fontSize: 13 },
  chipChange:     { backgroundColor: '#ff444422', borderWidth: 1, borderColor: '#ff4444', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10 },
  chipChangeText: { color: '#ff4444', fontWeight: '700', fontSize: 12 },

  trigger:            { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 8, paddingVertical: 4, paddingLeft: 14, paddingRight: 8, marginVertical: 4, minHeight: 44 },
  triggerPlaceholder: { flex: 1, color: '#94a3b8', fontSize: 14, paddingVertical: 8 },
  arrowBtn:           { paddingHorizontal: 6, paddingVertical: 8 },
  arrow:              { color: '#64748b', fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'center', padding: 20 },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  searchInputModal: {
    color: '#f1f5f9',
    fontSize: 15,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    ...Platform.select({ web: { outlineStyle: 'none' }, default: {} })
  },
  panel:     { overflow: 'hidden' },
  countHint: { color: '#64748b', fontSize: 11, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#0f172a' },
  list:      { maxHeight: 260 },
  row:       { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#334155' },
  rowText:   { color: '#f1f5f9', fontSize: 14 },
  empty:     { color: '#64748b', fontSize: 14, padding: 20, textAlign: 'center', fontStyle: 'italic' },

  // "Not in list" footer button
  manualEntryBtn:  {
    paddingVertical: 14, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: '#334155',
    backgroundColor: '#0f172a',
    flexDirection: 'row', alignItems: 'center'
  },
  manualEntryText: { color: '#a78bfa', fontWeight: '600', fontSize: 13 },

  // Manual input panel (replaces search view)
  manualPanel:   { padding: 16 },
  manualTitle:   { color: '#f1f5f9', fontSize: 15, fontWeight: '700', marginBottom: 10 },
  manualInput:   {
    backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: 15,
    padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#475569',
    marginBottom: 14,
    ...Platform.select({ web: { outlineStyle: 'none' }, default: {} })
  },
  manualActions:          { flexDirection: 'row', gap: 10 },
  manualBackBtn:          { flex: 1, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 12, alignItems: 'center' },
  manualBackText:         { color: '#94a3b8', fontWeight: '600', fontSize: 13 },
  manualConfirmBtn:       { flex: 2, backgroundColor: '#6366f1', borderRadius: 8, padding: 12, alignItems: 'center' },
  manualConfirmBtnDisabled: { backgroundColor: '#334155' },
  manualConfirmText:      { color: '#fff', fontWeight: '700', fontSize: 13 },
});
