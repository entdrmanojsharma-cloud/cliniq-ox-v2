/* 
  Purpose: Define Surgery screens (Catalog List, Detail View, and Form Editor).
  Responsibility: Render screens, handle navigation, and validate surgeon pricing.
*/

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useSurgeriesStore } from './store';
import { theme } from '../../shared/styles/theme';

const SkeletonCard = () => (
  <View style={[styles.card, { opacity: 0.15 }]}>
    <View style={{ flex: 1, gap: 6 }}>
      <View style={{ height: 16, width: 140, backgroundColor: theme.colors.textMuted, borderRadius: 4 }} />
      <View style={{ height: 12, width: 180, backgroundColor: theme.colors.textMuted, borderRadius: 4 }} />
    </View>
    <View style={{ height: 16, width: 40, backgroundColor: theme.colors.textMuted, borderRadius: 4 }} />
  </View>
);

const SkeletonList = () => (
  <View style={{ gap: 10, paddingBottom: 88 }}>
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
  </View>
);

export function SurgeriesListScreen({ navigation }) {
  const { surgeries, fetchSurgeries, loading, page, limit, total, search, setFilters } = useSurgeriesStore();

  useEffect(() => {
    fetchSurgeries();
  }, [page, search]);

  return (
    <View style={styles.container}>
      <Text style={theme.typography.title}>Surgery Catalog</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by code or name..."
        placeholderTextColor={theme.colors.textMuted}
        value={search}
        onChangeText={(val) => setFilters({ search: val, page: 1 })}
      />
      {loading && surgeries.length === 0 ? (
        <SkeletonList />
      ) : (
        <FlatList
          data={surgeries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 88 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => navigation.navigate('SurgeryDetail', { id: item.id })}
            >
              <View>
                <Text style={styles.cardTitle}>{item.surgeryName}</Text>
                <Text style={theme.typography.caption}>Code: {item.surgeryCode} | {item.category}</Text>
              </View>
              <Text style={styles.cardAction}>View</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No surgeries found in catalog.</Text>}
        />
      )}
      <View style={styles.pagination}>
        <TouchableOpacity onPress={() => setFilters({ page: page - 1 })} disabled={page === 1} style={styles.pageButton}>
          <Text style={styles.pageButtonText}>Prev</Text>
        </TouchableOpacity>
        <Text style={theme.typography.body}>Page {page} of {Math.ceil(total / limit) || 1}</Text>
        <TouchableOpacity onPress={() => setFilters({ page: page + 1 })} disabled={page * limit >= total} style={styles.pageButton}>
          <Text style={styles.pageButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('SurgeryForm', { id: null })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export function SurgeryDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { surgeries } = useSurgeriesStore();
  const surg = surgeries.find(s => s.id === id);

  if (!surg) return null;

  return (
    <ScrollView style={styles.container}>
      <Text style={theme.typography.title}>{surg.surgeryName}</Text>
      <View style={styles.detailCard}>
        <Text style={styles.detailLabel}>Surgery Code: <Text style={styles.detailValue}>{surg.surgeryCode}</Text></Text>
        <Text style={styles.detailLabel}>Category: <Text style={styles.detailValue}>{surg.category}</Text></Text>
        <Text style={styles.detailLabel}>Default Surgeon Fee: <Text style={styles.detailValue}>INR {Number(surg.defaultSurgeonFee).toLocaleString()}</Text></Text>
        <Text style={styles.detailLabel}>Active Status: <Text style={styles.detailValue}>{surg.isActive ? 'Active' : 'Inactive'}</Text></Text>
      </View>
      <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('SurgeryForm', { id })}>
        <Text style={styles.actionButtonText}>Edit Surgery</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

export function SurgeryFormScreen({ route, navigation }) {
  const { id } = route.params;
  const { surgeries, createSurgery, updateSurgery } = useSurgeriesStore();
  const existing = surgeries.find(s => s.id === id) || {};

  const [surgeryName, setSurgeryName] = useState(existing.surgeryName || '');
  const [surgeryCode, setSurgeryCode] = useState(existing.surgeryCode || '');
  const [category, setCategory] = useState(existing.category || '');
  const [fee, setFee] = useState(existing.defaultSurgeonFee ? String(existing.defaultSurgeonFee) : '0');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!surgeryName.trim()) return Alert.alert('Validation Error', 'Surgery name is required.');
    if (!surgeryCode.trim()) return Alert.alert('Validation Error', 'Surgery code is required.');
    if (!category.trim()) return Alert.alert('Validation Error', 'Category is required.');

    setSaving(true);
    try {
      const payload = { surgeryName, surgeryCode, category, defaultSurgeonFee: Number(fee) };
      if (id) {
        await updateSurgery(id, payload);
      } else {
        await createSurgery(payload);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Save Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={theme.typography.title}>{id ? 'Edit Surgery Catalog' : 'Add Surgery'}</Text>
      <View style={styles.form}>
        <Text style={styles.label}>Surgery Name *</Text>
        <TextInput style={styles.input} value={surgeryName} onChangeText={setSurgeryName} placeholder="CABG" placeholderTextColor={theme.colors.textMuted} />
        
        <Text style={styles.label}>Surgery Code *</Text>
        <TextInput style={styles.input} value={surgeryCode} onChangeText={setSurgeryCode} placeholder="CABG-01" placeholderTextColor={theme.colors.textMuted} />

        <Text style={styles.label}>Category *</Text>
        <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="Cardio" placeholderTextColor={theme.colors.textMuted} />

        <Text style={styles.label}>Default Surgeon Fee (INR)</Text>
        <TextInput style={styles.input} value={fee} onChangeText={setFee} keyboardType="numeric" placeholder="20000" placeholderTextColor={theme.colors.textMuted} />

        {saving ? (
          <View style={styles.saveButton}>
            <ActivityIndicator size="small" color="#ffffff" />
          </View>
        ) : (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Surgery</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  searchInput: { backgroundColor: theme.colors.surface, color: theme.colors.text, padding: theme.spacing.sm, borderRadius: 8, marginVertical: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border },
  loader: { marginVertical: theme.spacing.xl },
  card: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: 8, marginVertical: theme.spacing.xs, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  cardTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  cardAction: { color: theme.colors.primaryLight, fontWeight: '600' },
  emptyText: { color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing.xl },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.md, paddingRight: 80 },
  pageButton: { backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: 6 },
  pageButtonText: { color: theme.colors.text, fontWeight: '600' },
  fab: { position: 'absolute', bottom: theme.spacing.xl, right: theme.spacing.xl, backgroundColor: theme.colors.primary, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  fabText: { fontSize: 28, color: '#ffffff', fontWeight: 'bold' },
  detailCard: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: 8, marginVertical: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  detailLabel: { color: theme.colors.textMuted, fontSize: 14, marginVertical: theme.spacing.xs },
  detailValue: { color: theme.colors.text, fontWeight: '600' },
  editButton: { backgroundColor: theme.colors.primary, padding: theme.spacing.md, borderRadius: 8, alignItems: 'center', marginTop: theme.spacing.md },
  actionButtonText: { color: '#ffffff', fontWeight: '700' },
  form: { marginVertical: theme.spacing.md },
  label: { color: theme.colors.text, marginVertical: theme.spacing.xs, fontWeight: '600' },
  input: { backgroundColor: theme.colors.surface, color: theme.colors.text, padding: theme.spacing.md, borderRadius: 8, borderColor: theme.colors.border, borderWidth: 1, marginVertical: theme.spacing.xs },
  saveButton: { backgroundColor: theme.colors.success, padding: theme.spacing.md, borderRadius: 8, alignItems: 'center', marginVertical: theme.spacing.lg },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' }
});
