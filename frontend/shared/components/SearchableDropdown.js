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
  ScrollView, StyleSheet, Platform
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
  // Manual-entry sub-state
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

  const label = value 
    ? (value._manualEntry ? `✏️ ${value.displayName}` : renderSelected(value))
    : placeholder;

  return (
    <View style={{ zIndex: open ? 1000 : 1, position: 'relative' }}>
      {/* Trigger row */}
      <TouchableOpacity style={s.trigger} onPress={() => open ? handleClose() : handleOpen()} activeOpacity={0.8}>
        <Text style={[s.triggerPlaceholder, value && { color: '#0f172a' }]} numberOfLines={1}>{label}</Text>
        <TouchableOpacity
          onPress={() => value ? handleClear() : (open ? handleClose() : handleOpen())}
          style={s.arrowBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={s.arrow}>{value ? '✕' : (open ? '▲' : '▼')}</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Absolute Dropdown */}
      {open && (
        <View style={s.dropdownContainer}>
            {/* ── Normal search mode ── */}
            {!manualMode ? (
              <>
                <TextInput
                  style={s.searchInputModal}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search..."
                  placeholderTextColor="#94a3b8"
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
                    nestedScrollEnabled
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
                  
                  {/* Close button for absolute dropdown */}
                  <TouchableOpacity style={s.closeFooterBtn} onPress={handleClose}>
                    <Text style={s.closeFooterText}>Close</Text>
                  </TouchableOpacity>
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
                  placeholderTextColor="#94a3b8"
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
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  trigger:            { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingVertical: 4, paddingLeft: 14, paddingRight: 8, marginVertical: 4, minHeight: 44 },
  triggerPlaceholder: { flex: 1, color: '#475569', fontSize: 14, paddingVertical: 8 },
  arrowBtn:           { paddingHorizontal: 6, paddingVertical: 8 },
  arrow:              { color: '#475569', fontSize: 12, fontWeight: '700' },

  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    maxHeight: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 9999
  },
  searchInputModal: {
    color: '#0f172a',
    fontSize: 14,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    backgroundColor: '#e2e8f0',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    ...Platform.select({ web: { outlineStyle: 'none' }, default: {} })
  },
  panel:     { overflow: 'hidden' },
  countHint: { color: '#475569', fontSize: 11, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#e2e8f0' },
  list:      { maxHeight: 200 },
  row:       { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  rowText:   { color: '#0f172a', fontSize: 14, fontWeight: '500' },
  empty:     { color: '#475569', fontSize: 14, padding: 20, textAlign: 'center', fontStyle: 'italic' },

  manualEntryBtn:  {
    paddingVertical: 12, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: '#cbd5e1',
    backgroundColor: '#e2e8f0',
    flexDirection: 'row', alignItems: 'center'
  },
  manualEntryText: { color: '#4f46e5', fontWeight: '600', fontSize: 13 },

  closeFooterBtn: {
    paddingVertical: 12, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: '#cbd5e1',
    backgroundColor: '#f1f5f9',
    alignItems: 'center'
  },
  closeFooterText: { color: '#475569', fontWeight: '600', fontSize: 13 },

  manualPanel:   { padding: 16 },
  manualTitle:   { color: '#0f172a', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  manualInput:   {
    backgroundColor: '#ffffff', color: '#0f172a', fontSize: 14,
    padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#94a3b8',
    marginBottom: 14,
    ...Platform.select({ web: { outlineStyle: 'none' }, default: {} })
  },
  manualActions:          { flexDirection: 'row', gap: 10 },
  manualBackBtn:          { flex: 1, backgroundColor: '#e2e8f0', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, alignItems: 'center' },
  manualBackText:         { color: '#64748b', fontWeight: '600', fontSize: 13 },
  manualConfirmBtn:       { flex: 2, backgroundColor: '#6366f1', borderRadius: 8, padding: 12, alignItems: 'center' },
  manualConfirmBtnDisabled: { backgroundColor: '#cbd5e1' },
  manualConfirmText:      { color: '#ffffff', fontWeight: '700', fontSize: 13 },
});
