/**
 * SearchableDropdown.js  — Shared combobox component
 *
 * Props:
 *  items          – array of data objects
 *  value          – currently selected item object (null if none)
 *  onSelect(item) – called with the chosen item, or null to clear
 *  placeholder    – text shown in the trigger when closed
 *  keyExtractor(item) → string key
 *  renderItem(item)   → string label shown in the list
 *  renderSelected(item) → string shown in the selected chip
 *  filterFn(item, query) → boolean  – return true if item matches query
 *
 * Behaviour:
 *  • Tap trigger → opens sorted A–Z list; trigger row becomes a TextInput
 *  • Type directly in the trigger to filter (no separate inner search bar)
 *  • Click / tap anywhere outside → closes (onBlur + 150 ms delay)
 *  • Tap a list row → selects and closes
 *  • Selected state shows a tinted chip + red "✕ Change" button
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Platform, Modal, Pressable
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
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const sortedFiltered = query.trim()
    ? items
        .filter(item => filterFn(item, query))
        .sort((a, b) => renderItem(a).localeCompare(renderItem(b)))
    : [...items].sort((a, b) => renderItem(a).localeCompare(renderItem(b)));

  const handleOpen  = () => setOpen(true);
  const handleClose = () => { setOpen(false); setQuery(''); };

  // Give list-row tap 150 ms to fire before the blur closes the panel
  const handleBlur  = () => setTimeout(handleClose, 150);

  const handleSelect = (item) => {
    onSelect(item);
    setOpen(false);
    setQuery('');
  };

  const handleClear = () => {
    onSelect(null);
    setOpen(false);
    setQuery('');
  };

  // ── Selected chip ────────────────────────────────────────────────────
  if (value) {
    return (
      <View style={s.chipRow}>
        <View style={s.chip}>
          <Text style={s.chipText} numberOfLines={1}>{renderSelected(value)}</Text>
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
            </View>
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

  trigger:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 8, paddingVertical: 4, paddingLeft: 14, paddingRight: 8, marginVertical: 4, minHeight: 44 },
  triggerPlaceholder: { flex: 1, color: '#94a3b8', fontSize: 14, paddingVertical: 8 },
  arrowBtn:        { paddingHorizontal: 6, paddingVertical: 8 },
  arrow:           { color: '#64748b', fontSize: 12 },

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
  list:      { maxHeight: 300 },
  row:       { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#334155' },
  rowText:   { color: '#f1f5f9', fontSize: 14 },
  empty:     { color: '#64748b', fontSize: 14, padding: 20, textAlign: 'center', fontStyle: 'italic' },
});
