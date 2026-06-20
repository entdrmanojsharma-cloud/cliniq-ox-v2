/* 
  Purpose: Define Template screens (Library List, Detail View, and Template Creator Form).
  Responsibility: Render screens, handle template selection, and validate template items.
*/

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useTemplatesStore } from './store';
import { theme } from '../../shared/styles/theme';

export function TemplatesListScreen({ navigation }) {
  const { templates, fetchTemplates, loading } = useTemplatesStore();

  useEffect(() => { fetchTemplates(); }, []);

  return (
    <View style={styles.container}>
      <Text style={theme.typography.title}>Estimate Templates</Text>
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 88 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => navigation.navigate('TemplateDetail', { id: item.id })}
            >
              <View>
                <Text style={styles.cardTitle}>{item.templateName}</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                  <Text style={theme.typography.caption}>Type: {item.templateType === 'FIXED_PACKAGE' ? 'Fixed' : 'Detailed'}</Text>
                  <Text style={theme.typography.caption}>|</Text>
                  <Text style={theme.typography.caption}>Created: {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</Text>
                </View>
              </View>
              <Text style={styles.cardAction}>View</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No templates created yet.</Text>}
        />
      )}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('TemplateForm', { id: null })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export function TemplateDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { templates, deleteTemplate } = useTemplatesStore();
  const tmpl = templates.find(t => t.id === id);

  if (!tmpl) return null;

  const handleDelete = () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this template?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await deleteTemplate(tmpl.id);
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete template.');
            }
          } 
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={theme.typography.title}>{tmpl.templateName}</Text>
      <View style={styles.detailCard}>
        <Text style={styles.detailLabel}>Type: <Text style={[styles.detailValue, { color: theme.colors.primary }]}>{tmpl.templateType || 'DETAILED'}</Text></Text>
        <Text style={styles.detailLabel}>Visibility: <Text style={styles.detailValue}>{tmpl.visibility}</Text></Text>
        <Text style={styles.detailLabel}>Active: <Text style={styles.detailValue}>{tmpl.isActive ? 'Yes' : 'No'}</Text></Text>
        {tmpl.templateType === 'FIXED_PACKAGE' && (
          <>
            <Text style={styles.detailLabel}>Package Price: <Text style={[styles.detailValue, { color: theme.colors.success }]}>₹{Number(tmpl.packagePrice || 0).toLocaleString()}</Text></Text>
            <Text style={styles.detailLabel}>Included Items: <Text style={styles.detailValue}>{tmpl.includedItems || 'None Specified'}</Text></Text>
            {tmpl.packageNotes ? (
              <Text style={styles.detailLabel}>Notes: <Text style={styles.detailValue}>{tmpl.packageNotes}</Text></Text>
            ) : null}
          </>
        )}
      </View>

      {tmpl.templateType !== 'FIXED_PACKAGE' && (
        <>
          <Text style={styles.subTitle}>Configured Template Items</Text>
          {(tmpl.templateItems || []).map((item, idx) => (
            <View key={idx} style={styles.itemCard}>
              <Text style={styles.itemDesc}>{item.description}</Text>
              <Text style={theme.typography.caption}>Qty: {item.defaultQuantity} | Rate: INR {Number(item.defaultRate).toLocaleString()}</Text>
            </View>
          ))}
        </>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('TemplateForm', { id: tmpl.id })}
        >
          <Text style={styles.actionButtonText}>Edit Template</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.colors.danger || '#ff4d4f' }]}
          onPress={handleDelete}
        >
          <Text style={styles.actionButtonText}>Delete Template</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export function TemplateFormScreen({ route, navigation }) {
  const { id } = route.params;
  const { templates, createTemplate, updateTemplate } = useTemplatesStore();
  const existing = id ? templates.find(t => t.id === id) : null;

  const [templateName, setTemplateName] = useState(existing ? existing.templateName : '');
  const [templateType, setTemplateType] = useState(existing ? existing.templateType : 'DETAILED');
  const [packagePrice, setPackagePrice] = useState(existing && existing.packagePrice ? String(existing.packagePrice) : '');
  const [includedItems, setIncludedItems] = useState(existing ? existing.includedItems : '');
  const [packageNotes, setPackageNotes] = useState(existing ? existing.packageNotes : '');

  const handleSave = async () => {
    if (!templateName.trim()) return Alert.alert('Error', 'Template name required.');
    
    const isPkg = templateType === 'FIXED_PACKAGE';
    const payload = {
      templateName,
      templateType,
      visibility: existing ? existing.visibility : 'GLOBAL',
      isActive: existing ? existing.isActive : true,
      templateItems: existing ? existing.templateItems : [],
    };

    if (isPkg) {
      payload.packagePrice = Number(packagePrice) || 0;
      payload.includedItems = includedItems;
      payload.packageNotes = packageNotes;
    } else {
      payload.packagePrice = null;
      payload.includedItems = null;
      payload.packageNotes = null;
    }

    try {
      if (id) {
        await updateTemplate(id, payload);
      } else {
        await createTemplate(payload);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to save template. Make sure the name is unique.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={theme.typography.title}>{id ? 'Edit Template' : 'New Template'}</Text>
      <View style={styles.form}>
        <Text style={styles.label}>Template Name *</Text>
        <TextInput 
          style={styles.input} 
          value={templateName} 
          onChangeText={setTemplateName} 
          placeholder="e.g. Cardiac Bypass Package" 
          placeholderTextColor={theme.colors.textMuted} 
        />

        <Text style={styles.label}>Template Type</Text>
        <View style={styles.pillRow}>
          {[
            { label: 'Detailed Estimate', value: 'DETAILED' },
            { label: 'Fixed Package', value: 'FIXED_PACKAGE' }
          ].map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.pill, templateType === opt.value && styles.pillActive]}
              onPress={() => setTemplateType(opt.value)}
            >
              <Text style={[styles.pillText, templateType === opt.value && styles.pillTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {templateType === 'FIXED_PACKAGE' && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.label}>Package Price (₹) *</Text>
            <TextInput 
              style={styles.input} 
              value={packagePrice} 
              onChangeText={setPackagePrice} 
              keyboardType="numeric"
              placeholder="0.00" 
              placeholderTextColor={theme.colors.textMuted} 
            />

            <Text style={styles.label}>Package Inclusions Paragraph</Text>
            <TextInput 
              style={[styles.input, { minHeight: 80 }]} 
              value={includedItems} 
              onChangeText={setIncludedItems} 
              placeholder="e.g. This package includes surgeon charges, ward charges, OT charges..." 
              placeholderTextColor={theme.colors.textMuted} 
              multiline
            />

            <Text style={styles.label}>Package Notes / Exclusions</Text>
            <TextInput 
              style={[styles.input, { minHeight: 60 }]} 
              value={packageNotes} 
              onChangeText={setPackageNotes} 
              placeholder="e.g. Excludes blood products, implants, and high-end consumables." 
              placeholderTextColor={theme.colors.textMuted} 
              multiline
            />
          </View>
        )}
        
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>{id ? 'Save Changes' : 'Create Template'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  loader: { marginVertical: theme.spacing.xl },
  card: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: 8, marginVertical: theme.spacing.xs, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  cardTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  cardAction: { color: theme.colors.primaryLight, fontWeight: '600' },
  emptyText: { color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing.xl },
  fab: { position: 'absolute', bottom: theme.spacing.xl, right: theme.spacing.xl, backgroundColor: theme.colors.primary, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  fabText: { fontSize: 28, color: '#ffffff', fontWeight: 'bold' },
  detailCard: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: 8, marginVertical: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  detailLabel: { color: theme.colors.textMuted, fontSize: 14, marginVertical: theme.spacing.xs },
  detailValue: { color: theme.colors.text, fontWeight: '600' },
  subTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginVertical: theme.spacing.sm },
  itemCard: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: 6, marginVertical: 2, borderLeftWidth: 3, borderLeftColor: theme.colors.primaryLight },
  itemDesc: { color: theme.colors.text, fontWeight: '600' },
  form: { marginVertical: theme.spacing.md },
  label: { color: theme.colors.text, marginVertical: theme.spacing.xs, fontWeight: '600' },
  input: { backgroundColor: theme.colors.surface, color: theme.colors.text, padding: theme.spacing.md, borderRadius: 8, borderColor: theme.colors.border, borderWidth: 1, marginVertical: theme.spacing.xs },
  saveButton: { backgroundColor: theme.colors.success, padding: theme.spacing.md, borderRadius: 8, alignItems: 'center', marginVertical: theme.spacing.lg },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  pillRow: {
    flexDirection: 'row',
    marginVertical: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  pill: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pillText: {
    color: theme.colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  pillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  actionButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  }
});
