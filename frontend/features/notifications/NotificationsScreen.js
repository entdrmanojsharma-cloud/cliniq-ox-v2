/* 
  Purpose: Display User Notifications.
  Responsibility: Render paginated alerts list (e.g. estimate approval states, overlaps), mark notifications as read, and support direct detail deep-linking.
*/

import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Pressable
} from 'react-native';
import { useNotificationsStore } from './store';
import { theme } from '../../shared/styles/theme';

export function NotificationsScreen({ navigation }) {
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchNextPage,
    markAsRead,
    markAllAsRead
  } = useNotificationsStore();

  useEffect(() => {
    fetchNotifications(true);
  }, []);

  const handleNotificationPress = async (item) => {
    if (!item.isRead) {
      await markAsRead(item.id);
    }

    // Navigation routing based on notification payload type
    if (item.linkId) {
      if (
        item.type === 'ESTIMATE_PENDING' ||
        item.type === 'ESTIMATE_APPROVED' ||
        item.type === 'ESTIMATE_REJECTED'
      ) {
        navigation.navigate('EstimateDetail', { id: item.linkId });
      } else if (item.type === 'EVENT_CONFLICT') {
        navigation.navigate('CalendarEventDetail', { id: item.linkId });
      }
    }
  };

  const renderItem = ({ item }) => {
    const formattedDate = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '';

    // Style overrides based on unread status
    const cardBg = item.isRead ? theme.colors.surface : 'rgba(99, 102, 241, 0.08)';
    const cardBorder = item.isRead ? theme.colors.border : 'rgba(99, 102, 241, 0.25)';

    // Icon or color highlight based on notification type
    let icon = '🔔';
    let iconColor = theme.colors.primaryLight;
    if (item.type === 'ESTIMATE_APPROVED') {
      icon = '✅';
      iconColor = theme.colors.success;
    } else if (item.type === 'ESTIMATE_REJECTED') {
      icon = '❌';
      iconColor = theme.colors.danger;
    } else if (item.type === 'EVENT_CONFLICT') {
      icon = '⚠️';
      iconColor = theme.colors.warning;
    }

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.iconContainer}>
          <Text style={[styles.icon, { color: iconColor }]}>{icon}</Text>
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.cardHeader}>
            <Text style={[styles.title, !item.isRead && styles.unreadText]}>
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerRow}>
      <Text style={theme.typography.title}>Notifications</Text>
      {unreadCount > 0 && (
        <TouchableOpacity
          style={styles.markAllBtn}
          onPress={markAllAsRead}
          activeOpacity={0.7}
        >
          <Text style={styles.markAllText}>✓ Mark All Read</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (loading && notifications.length === 0) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🔔</Text>
        <Text style={styles.emptyTitle}>You're all caught up!</Text>
        <Text style={styles.emptySubtitle}>
          No notifications to display.
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={fetchNextPage}
        onEndReachedThreshold={0.2}
        refreshing={loading && notifications.length > 0}
        onRefresh={() => fetchNotifications(true)}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md
  },
  markAllBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16
  },
  markAllText: {
    color: theme.colors.primaryLight,
    fontWeight: '700',
    fontSize: 12
  },
  listContent: {
    paddingBottom: theme.spacing.xl
  },
  card: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  iconContainer: {
    marginRight: theme.spacing.md,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 2
  },
  icon: {
    fontSize: 20
  },
  contentContainer: {
    flex: 1
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textMuted,
    flex: 1
  },
  unreadText: {
    color: theme.colors.text,
    fontWeight: '700'
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginLeft: theme.spacing.xs
  },
  message: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: 8
  },
  dateText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    opacity: 0.7
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
    opacity: 0.6
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted
  },
  footerLoader: {
    paddingVertical: theme.spacing.md
  }
});
