import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useInvoicesStore } from './store';
import { theme } from '../../shared/styles/theme';
import { useAuthStore } from '../auth/store';

const SkeletonCard = () => (
  <View style={[styles.card, { opacity: 0.15 }]}>
    <View style={{ flex: 1, gap: 6 }}>
      <View style={{ height: 16, width: 120, backgroundColor: theme.colors.textMuted, borderRadius: 4 }} />
      <View style={{ height: 12, width: 140, backgroundColor: theme.colors.textMuted, borderRadius: 4 }} />
      <View style={{ height: 12, width: 100, backgroundColor: theme.colors.textMuted, borderRadius: 4 }} />
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

export function InvoicesListScreen({ navigation }) {
  const { invoices, fetchInvoices, loading, page, limit, total, search, setFilters } = useInvoicesStore();
  const { role } = useAuthStore();

  useEffect(() => {
    fetchInvoices();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchInvoices();
    });
    return unsubscribe;
  }, [navigation, page, search]);

  return (
    <View style={styles.container}>
      <Text style={theme.typography.title}>Billing Invoices</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by invoice number..."
        placeholderTextColor={theme.colors.textMuted}
        value={search}
        onChangeText={(val) => setFilters({ search: val, page: 1 })}
      />
      {loading && invoices.length === 0 ? (
        <SkeletonList />
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 88 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => navigation.navigate('InvoiceDetail', { id: item.id })}
            >
              <View>
                <Text style={styles.cardTitle}>{item.invoiceNumber}</Text>
                <Text style={theme.typography.caption}>Status: {item.status} | Paid: {item.paymentStatus}</Text>
                <Text style={theme.typography.caption}>Total: INR {Number(item.grandTotal).toLocaleString()}</Text>
              </View>
              <Text style={styles.cardAction}>View</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No invoices billed.</Text>}
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
      {role !== 'ADMIN' && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => navigation.navigate('InvoiceForm', { id: null })}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
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
  fabText: { fontSize: 28, color: '#ffffff', fontWeight: 'bold' }
});
