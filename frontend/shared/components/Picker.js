import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList, StyleSheet,
  SafeAreaView, Platform, Pressable
} from 'react-native';
import { theme } from '../styles/theme';

export function Picker({ selectedValue, onValueChange, children, style, placeholder = 'Select...' }) {
  const [modalVisible, setModalVisible] = useState(false);

  // Parse children options
  const options = React.Children.toArray(children).map(child => {
    return {
      label: child.props.label,
      value: child.props.value
    };
  });

  const selectedOption = options.find(opt => opt.value === selectedValue) || { label: placeholder, value: '' };

  if (Platform.OS === 'web') {
    // On Web, use standard HTML select for native browser support
    return (
      <View style={[styles.webContainer, style]}>
        <select
          value={selectedValue}
          onChange={(e) => onValueChange(e.target.value)}
          style={{
            backgroundColor: theme.colors.background,
            color: theme.colors.text,
            padding: 10,
            borderRadius: 8,
            border: `1px solid ${theme.colors.border}`,
            fontSize: 14,
            width: '100%',
            height: '100%',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </View>
    );
  }

  // On Mobile/Native, render a Modal dropdown trigger
  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.triggerText} numberOfLines={1}>
          {selectedOption.label}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{placeholder}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>Done</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const active = item.value === selectedValue;
                return (
                  <TouchableOpacity
                    style={[styles.row, active && styles.rowActive]}
                    onPress={() => {
                      onValueChange(item.value);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={[styles.rowText, active && styles.rowTextActive]}>
                      {item.label}
                    </Text>
                    {active && <Text style={styles.check}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
              style={styles.list}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

Picker.Item = function ({ label, value }) {
  return null; // Used purely as configuration elements parsed in the parent
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: 4
  },
  webContainer: {
    flex: 1,
    height: 44,
    marginHorizontal: 4
  },
  trigger: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44
  },
  triggerText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
    flex: 1
  },
  arrow: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginLeft: 6
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 24
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700'
  },
  closeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8
  },
  closeBtnText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '700'
  },
  list: {
    paddingHorizontal: 16
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  rowActive: {
    borderBottomColor: theme.colors.primary + '33'
  },
  rowText: {
    color: theme.colors.text,
    fontSize: 15
  },
  rowTextActive: {
    color: theme.colors.primary,
    fontWeight: '700'
  },
  check: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '700'
  }
});
