import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { useEstimatesStore } from './store';
import { theme } from '../../shared/styles/theme';
import { useAuthStore } from '../auth/store';

const SkeletonCard = () => (
  <View style={[styles.card, { opacity: 0.15 }]}>
    <View style={{ flex: 1, gap: 6 }}>
      <View style={{ height: 16, width: 120, backgroundColor: theme.colors.textMuted, borderRadius: 4 }} />
      <View style={{ height: 12, width: 180, backgroundColor: theme.colors.textMuted, borderRadius: 4 }} />
      <View style={{ height: 12, width: 140, backgroundColor: theme.colors.textMuted, borderRadius: 4 }} />
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

const getStatusBadgeStyle = (status) => {
  switch (status) {
    case 'DRAFT':
      return { bg: '#475569', text: '#f1f5f9' };
    case 'PENDING_APPROVAL':
      return { bg: '#d97706', text: '#fef3c7' };
    case 'APPROVED':
      return { bg: '#059669', text: '#d1fae5' };
    case 'REJECTED':
      return { bg: '#dc2626', text: '#fee2e2' };
    case 'LOCKED':
      return { bg: '#2563eb', text: '#dbeafe' };
    case 'CANCELLED':
      return { bg: '#1e293b', text: '#64748b' };
    default:
      return { bg: '#334155', text: '#cbd5e1' };
  }
};

export function EstimatesListScreen({ navigation }) {
  const { estimates, fetchEstimates, loading, page, limit, total, search, status, setFilters } = useEstimatesStore();
  const { role } = useAuthStore();

  useEffect(() => {
    fetchEstimates();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchEstimates();
    });
    return unsubscribe;
  }, [navigation, page, search, status]);

  return (
    <View style={styles.container}>
      <Text style={theme.typography.title}>Surgery Estimates</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by estimate number..."
        placeholderTextColor={theme.colors.textMuted}
        value={search}
        onChangeText={(val) => setFilters({ search: val, page: 1 })}
      />

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { label: 'All', value: '' },
            { label: 'Draft', value: 'DRAFT' },
            { label: 'Pending', value: 'PENDING_APPROVAL' },
            { label: 'Approved', value: 'APPROVED' },
            { label: 'Rejected', value: 'REJECTED' },
            { label: 'Locked', value: 'LOCKED' },
            { label: 'Cancelled', value: 'CANCELLED' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.value}
              style={[
                styles.filterChip,
                status === tab.value && styles.filterChipActive
              ]}
              onPress={() => setFilters({ status: tab.value, page: 1 })}
            >
              <Text
                style={[
                  styles.filterChipText,
                  status === tab.value && styles.filterChipTextActive
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && estimates.length === 0 ? (
        <SkeletonList />
      ) : (
        <FlatList
          data={estimates}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 88 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => navigation.navigate('EstimateDetail', { id: item.id })}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text style={styles.cardTitle}>{item.estimateNumber}</Text>
                  {(() => {
                    const badge = getStatusBadgeStyle(item.status);
                    return (
                      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.badgeText, { color: badge.text }]}>
                          {item.status === 'PENDING_APPROVAL' ? 'PENDING' : item.status}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
                <Text style={[theme.typography.caption, { fontWeight: '700', color: theme.colors.text, marginVertical: 2 }]}>
                  👤 Patient: {item.event?.patient?.name || 'N/A'}
                </Text>
                <Text style={theme.typography.caption}>
                  📅 Created: {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
                <Text style={theme.typography.caption}>Billing: {item.billingStatus}</Text>
                <Text style={theme.typography.caption}>Grand Total: INR {Number(item.grandTotal).toLocaleString()}</Text>
              </View>
              <Text style={styles.cardAction}>View</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No estimates found.</Text>}
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
          onPress={() => navigation.navigate('EstimateForm', { id: null })}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  searchInput: { backgroundColor: theme.colors.surface, color: theme.colors.text, padding: theme.spacing.sm, borderRadius: 8, marginTop: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border },
  filterContainer: { marginVertical: theme.spacing.sm },
  filterScroll: { gap: theme.spacing.xs, paddingRight: theme.spacing.md },
  filterChip: { backgroundColor: theme.colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterChipText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: '#ffffff', fontWeight: '700' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 9, fontWeight: '800' },
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
