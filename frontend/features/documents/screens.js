/* 
  Purpose: Define Document screens (Generations List, Print Preview Frame, and Generator panel).
  Responsibility: Render log tables, enable file downloads/previews, and trigger new PDF generations.
*/

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useDocumentsStore } from './store';
import { theme } from '../../shared/styles/theme';

export function DocumentsListScreen({ navigation }) {
  const { generations, fetchGenerations, loading } = useDocumentsStore();

  useEffect(() => { fetchGenerations(); }, []);

  return (
    <View style={styles.container}>
      <Text style={theme.typography.title}>Generated Documents Log</Text>
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={generations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => navigation.navigate('DocumentPreview', { id: item.id })}
            >
              <View>
                <Text style={styles.cardTitle}>{item.generatedFileName}</Text>
                <Text style={theme.typography.caption}>Type: {item.documentType}</Text>
                <Text style={theme.typography.caption}>Generated: {new Date(item.generatedAt).toLocaleString()}</Text>
              </View>
              <Text style={styles.cardAction}>Preview</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No documents generated yet.</Text>}
        />
      )}
    </View>
  );
}

export function DocumentPreviewScreen({ route }) {
  const { id } = route.params;
  const { generations } = useDocumentsStore();
  const doc = generations.find(g => g.id === id);

  if (!doc) return null;

  return (
    <ScrollView style={styles.container}>
      <Text style={theme.typography.title}>Document Preview</Text>
      <View style={styles.previewContainer}>
        <View style={styles.a4Page}>
          <Text style={styles.docHeader}>CLINIQ-OX HEALTH SYSTEM</Text>
          <Text style={styles.docSubHeader}>Official {doc.documentType} Record</Text>
          <View style={styles.divider} />
          
          <Text style={styles.docBody}>File Reference: {doc.generatedFileName}</Text>
          <Text style={styles.docBody}>Timestamp: {new Date(doc.generatedAt).toLocaleString()}</Text>
          <Text style={styles.docBody}>Author User ID: {doc.generatedBy}</Text>
          
          <View style={styles.signatureLine}>
            <Text style={styles.signatureText}>Authorized Signature</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  loader: { marginVertical: theme.spacing.xl },
  card: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: 8, marginVertical: theme.spacing.xs, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  cardTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  cardAction: { color: theme.colors.primaryLight, fontWeight: '600' },
  emptyText: { color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing.xl },
  previewContainer: { marginVertical: theme.spacing.md, alignItems: 'center' },
  a4Page: { width: '100%', minHeight: 400, backgroundColor: '#ffffff', padding: theme.spacing.lg, borderRadius: 4, elevation: 4 },
  docHeader: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', textAlign: 'center' },
  docSubHeader: { fontSize: 12, color: '#64748b', textAlign: 'center', marginVertical: 2 },
  divider: { height: 1, backgroundColor: '#cbd5e1', marginVertical: theme.spacing.md },
  docBody: { fontSize: 12, color: '#334155', marginVertical: 4, fontFamily: 'Courier' },
  signatureLine: { marginTop: 80, borderTopWidth: 1, borderTopColor: '#94a3b8', width: 150, alignSelf: 'flex-end', alignItems: 'center' },
  signatureText: { fontSize: 10, color: '#64748b', marginTop: 4 }
});
