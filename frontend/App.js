import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, Text, Modal, View, Pressable, StyleSheet, ScrollView, TextInput } from 'react-native';

// Import Screen Components
import { DashboardScreen } from './features/dashboard/screens';
import { PatientsListScreen, PatientDetailScreen, PatientFormScreen } from './features/patients/screens';
import { SurgeriesListScreen, SurgeryDetailScreen, SurgeryFormScreen } from './features/surgeries/screens';
import { EstimatesListScreen, EstimateDetailScreen, EstimateFormScreen } from './features/estimates/screens';
import { InvoicesListScreen, InvoiceDetailScreen, InvoiceFormScreen } from './features/invoices/screens';
import { ReceiptsListScreen, ReceiptDetailScreen, ReceiptFormScreen } from './features/receipts/screens';
import { RefundsListScreen, RefundDetailScreen, RefundFormScreen } from './features/refunds/screens';
import { CreditNotesListScreen, CreditNoteDetailScreen, CreditNoteFormScreen } from './features/credit-notes/screens';
import { TemplatesListScreen, TemplateDetailScreen, TemplateFormScreen } from './features/templates/screens';
import { CalendarScreen, CalendarEventDetailScreen, CalendarEventFormScreen } from './features/calendar/screens';
import { OtRoomsScreen, RoomsScreen, HospitalChargesScreen, PendingChargesScreen, DiagnosisMasterScreen } from './features/master-data/screens';
import { HospitalProfileScreen } from './features/settings/screens';
import { BillingDefaultsScreen } from './features/settings/BillingDefaultsScreen';
import { DocumentsListScreen, DocumentPreviewScreen } from './features/documents/screens';
import { AdvanceBalancesScreen } from './features/advance-balances/screens';
import { DiscountCodesScreen } from './features/discount-codes/DiscountCodesScreen';
import { HospitalDiscountCodesScreen } from './features/discount-codes/HospitalDiscountCodesScreen';
import { Alert, Platform } from 'react-native';
import { LoginScreen, ChangePasswordScreen } from './features/auth/screens';
import { SuperAdminDashboardScreen } from './features/dashboard/SuperAdminDashboardScreen';
import { useAuthStore } from './features/auth/store';
import { AddStaffScreen } from './features/auth/AddStaffScreen';
import { useAlertStore } from './shared/utils/alertStore';
import { AlertModal } from './shared/components/AlertModal';

// Notifications
import { NotificationsScreen } from './features/notifications/screens';
import { useNotificationsStore } from './features/notifications/store';
import { useThemeStore } from './shared/styles/themeHelper';
import { useResponsive } from './shared/hooks/useResponsive';
import { SidebarContent } from './shared/components/SidebarContent';
import { usePatientsStore } from './features/patients/store';
import { useEstimatesStore } from './features/estimates/store';
import { useInvoicesStore } from './features/invoices/store';
import { useReceiptsStore } from './features/receipts/store';
import { useSurgeriesStore } from './features/surgeries/store';
import { useCalendarStore } from './features/calendar/store';
import { LoadingBar } from './shared/components/LoadingBar';
import { useLoadingStore } from './shared/utils/loadingStore';

/* ── Theme options shown in the header picker ── */
const HEADER_THEMES = [
  { key: 'dark',   icon: '🌑', label: 'Dark',   accent: '#6366f1', bg: '#0f172a', fg: '#f8fafc' },
  { key: 'light',  icon: '☀️', label: 'Light',  accent: '#4f46e5', bg: '#f8fafc', fg: '#0f172a' },
  { key: 'ocean',  icon: '🌊', label: 'Ocean',  accent: '#06b6d4', bg: '#082f49', fg: '#f0f9ff' },
  { key: 'forest', icon: '🌿', label: 'Forest', accent: '#10b981', bg: '#022c22', fg: '#ecfdf5' },
];

/* ── Floating theme-picker modal (shared by header button) ── */
function GlobalThemeModal({ visible, onClose }) {
  const { activeTheme, setTheme } = useThemeStore();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={appStyles.overlay} onPress={onClose}>
        <Pressable style={appStyles.sheet} onPress={e => e.stopPropagation()}>
          <Text style={appStyles.sheetTitle}>🎨  App Theme</Text>
          <View style={appStyles.tileGrid}>
            {HEADER_THEMES.map(t => {
              const active = activeTheme === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => { setTheme(t.key); onClose(); }}
                  style={[
                    appStyles.tile,
                    { backgroundColor: t.bg, borderColor: active ? t.accent : 'rgba(255,255,255,0.08)', borderWidth: active ? 2.5 : 1 }
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={appStyles.tileIcon}>{t.icon}</Text>
                  <Text style={[appStyles.tileLabel, { color: t.fg }]}>{t.label}</Text>
                  {active && (
                    <View style={[appStyles.check, { backgroundColor: t.accent }]}>
                      <Text style={appStyles.checkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={appStyles.closeRow} onPress={onClose}>
            <Text style={appStyles.closeText}>Dismiss</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const appStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: { backgroundColor: 'var(--surface, #1e293b)', borderRadius: 20, padding: 20, width: '100%', maxWidth: 360, borderWidth: 1, borderColor: 'var(--border, #334155)' },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: 'var(--text, #f8fafc)', textAlign: 'center', marginBottom: 14 },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '47%', borderRadius: 14, padding: 18, alignItems: 'center', gap: 6, position: 'relative', minHeight: 88, justifyContent: 'center' },
  tileIcon: { fontSize: 26 },
  tileLabel: { fontSize: 13, fontWeight: '700' },
  check: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  closeRow: { marginTop: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 12, alignItems: 'center' },
  closeText: { color: 'var(--text-muted, #94a3b8)', fontWeight: '600', fontSize: 14 }
});

// Globally override Alert.alert to render our premium on-screen modal on both web and native platforms
Alert.alert = (title, message, buttons) => {
  useAlertStore.getState().showAlert(title, message, buttons);
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <ScrollView style={{ padding: 20, backgroundColor: '#fee2e2', flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'red', marginBottom: 10 }}>App Render Failure:</Text>
          <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: 'red', fontSize: 13 }}>
            {this.state.error?.stack || String(this.state.error)}
          </Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

export const navigationRef = React.createRef();
if (typeof window !== 'undefined') {
  window.navigationRef = navigationRef;
}

const QUICK_MENU_ITEMS = [
  { title: 'Dashboard', screen: 'Dashboard', icon: '📊' },
  { title: 'Patients Directory', screen: 'PatientsList', icon: '👤' },
  { title: 'Estimates Planner', screen: 'EstimatesList', icon: '📋' },
  { title: 'Invoices & Billing', screen: 'InvoicesList', icon: '💳' },
  { title: 'Receipts Tracker', screen: 'ReceiptsList', icon: '📥' },
];

function GlobalMenuModal({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[appStyles.overlay, { justifyContent: 'flex-start', alignItems: 'flex-start', padding: 0 }]} onPress={onClose}>
        <Pressable style={[appStyles.sheet, { width: 280, height: '100%', borderRadius: 0, padding: 0 }]} onPress={e => e.stopPropagation()}>
          <SidebarContent onClose={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const Stack = createNativeStackNavigator();

export default function App() {
  const lastRouteRef = React.useRef();
  const handleNavigationStateChange = () => {
    const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;
    if (currentRouteName && currentRouteName !== lastRouteRef.current) {
      lastRouteRef.current = currentRouteName;
      useLoadingStore.getState().startNavigation();
      setTimeout(() => {
        useLoadingStore.getState().endNavigation();
      }, 250);
    }
  };

  const { isAuthenticated, role, mustChangePassword } = useAuthStore();
  const { initTheme, activeTheme } = useThemeStore();
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [menuModalOpen, setMenuModalOpen] = useState(false);

  const unreadCount = useNotificationsStore(state => state.unreadCount);
  const fetchUnreadCount = useNotificationsStore(state => state.fetchUnreadCount);

  React.useEffect(() => {
    initTheme();
  }, []);

  React.useEffect(() => {
    if (isAuthenticated && role !== 'SUPER_ADMIN') {
      fetchUnreadCount();
      const timer = setInterval(() => {
        fetchUnreadCount();
      }, 15000);
      return () => clearInterval(timer);
    }
  }, [isAuthenticated, role]);

  React.useEffect(() => {
    if (!isAuthenticated) return;

    let ws;
    let reconnectTimer;
    let isMounted = true;

    function connect() {
      if (!isMounted) return;
      const getWsUrl = () => {
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined' && window.location) {
            return `ws://${window.location.hostname}:3000`;
          }
          return 'ws://localhost:3000';
        }
        return 'ws://192.168.0.124:3000';
      };

      const wsUrl = getWsUrl();
      console.log('Connecting WebSocket to:', wsUrl);
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connection active.');
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log('WebSocket event received:', data);
          if (data.event === 'PATIENTS_UPDATED') {
            console.log('WebSocket event PATIENTS_UPDATED -> reloading patient store');
            usePatientsStore.getState().fetchPatients();
          } else if (data.event === 'ESTIMATES_UPDATED') {
            console.log('WebSocket event ESTIMATES_UPDATED -> reloading estimate store');
            useEstimatesStore.getState().fetchEstimates();
          } else if (data.event === 'NOTIFICATIONS_UPDATED') {
            console.log('WebSocket event NOTIFICATIONS_UPDATED -> reloading notifications');
            useNotificationsStore.getState().fetchUnreadCount();
            useNotificationsStore.getState().fetchNotifications(true);
          }
        } catch (err) {
          console.warn('Error handling WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        if (isMounted) {
          console.log('WebSocket connection closed. Retrying in 5s...');
          reconnectTimer = setTimeout(connect, 5000);
        }
      };

      ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
        ws.close();
      };
    }

    connect();

    return () => {
      isMounted = false;
      if (ws) ws.close();
      clearTimeout(reconnectTimer);
    };
  }, [isAuthenticated]);

  // Find active theme icon for header button
  const activeIcon = HEADER_THEMES.find(t => t.key === activeTheme)?.icon || '🎨';
  const { isDesktop } = useResponsive();

  return (
    <ErrorBoundary>
      <LoadingBar />
      <NavigationContainer ref={navigationRef} onStateChange={handleNavigationStateChange}>
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: 'var(--background, #0f172a)' }}>
          {isAuthenticated && role !== 'SUPER_ADMIN' && isDesktop && (
            <View style={{ width: 280, height: '100%', flexShrink: 0 }}>
              <SidebarContent />
            </View>
          )}
          <View style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
            <Stack.Navigator
              screenOptions={{
                headerStyle: { backgroundColor: 'var(--surface, #1e293b)' },
                headerTintColor: 'var(--text, #f8fafc)',
                headerTitleStyle: { fontWeight: 'bold' },
                headerRight: () => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {isAuthenticated && (
                      <TouchableOpacity
                        onPress={() => navigationRef.current?.navigate('Dashboard')}
                        style={{ padding: 6 }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={{ fontSize: 20 }}>🏠</Text>
                      </TouchableOpacity>
                    )}
                    {role !== 'SUPER_ADMIN' && (
                      <TouchableOpacity
                        onPress={() => navigationRef.current?.navigate('Notifications')}
                        style={{ padding: 6, position: 'relative' }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={{ fontSize: 20 }}>🔔</Text>
                        {unreadCount > 0 && (
                          <View
                            style={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              backgroundColor: '#ef4444',
                              borderRadius: 8,
                              minWidth: 16,
                              height: 16,
                              justifyContent: 'center',
                              alignItems: 'center',
                              paddingHorizontal: 3,
                              borderWidth: 1,
                              borderColor: 'var(--surface, #1e293b)'
                            }}
                          >
                            <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: 'bold' }}>
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => setThemeModalOpen(true)}
                      style={{ padding: 6 }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={{ fontSize: 20 }}>{activeIcon}</Text>
                    </TouchableOpacity>
                    {role !== 'SUPER_ADMIN' && !isDesktop && (
                      <TouchableOpacity
                        onPress={() => setMenuModalOpen(true)}
                        style={{ padding: 6, marginRight: 4 }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={{ fontSize: 22, fontWeight: 'bold', color: 'var(--text, #f8fafc)', lineHeight: 22 }}>☰</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )
              }}
            >
          {!isAuthenticated ? (
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          ) : role === 'SUPER_ADMIN' ? (
            <Stack.Screen name="Dashboard" component={SuperAdminDashboardScreen} options={{ title: 'Super Admin Dashboard - Cliniq-OX' }} />
          ) : (
            <>
              <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dash Board - Cliniq-OX' }} />
              
              {/* Patients */}
              <Stack.Screen name="PatientsList" component={PatientsListScreen} />
              <Stack.Screen name="PatientDetail" component={PatientDetailScreen} />
              <Stack.Screen name="PatientForm" component={PatientFormScreen} />

              {/* Surgeries */}
              <Stack.Screen name="SurgeriesList" component={SurgeriesListScreen} />
              <Stack.Screen name="SurgeryDetail" component={SurgeryDetailScreen} />
              <Stack.Screen name="SurgeryForm" component={SurgeryFormScreen} />

              {/* Estimates */}
              <Stack.Screen name="EstimatesList" component={EstimatesListScreen} />
              <Stack.Screen name="EstimateDetail" component={EstimateDetailScreen} />
              <Stack.Screen name="EstimateForm" component={EstimateFormScreen} />

              {/* Invoices */}
              <Stack.Screen name="InvoicesList" component={InvoicesListScreen} />
              <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
              <Stack.Screen name="InvoiceForm" component={InvoiceFormScreen} />

              {/* Receipts */}
              <Stack.Screen name="ReceiptsList" component={ReceiptsListScreen} />
              <Stack.Screen name="ReceiptDetail" component={ReceiptDetailScreen} />
              <Stack.Screen name="ReceiptForm" component={ReceiptFormScreen} />

              {/* Refunds */}
              <Stack.Screen name="RefundsList" component={RefundsListScreen} />
              <Stack.Screen name="RefundDetail" component={RefundDetailScreen} />
              <Stack.Screen name="RefundForm" component={RefundFormScreen} />

              {/* Credit Notes */}
              <Stack.Screen name="CreditNotesList" component={CreditNotesListScreen} />
              <Stack.Screen name="CreditNoteDetail" component={CreditNoteDetailScreen} />
              <Stack.Screen name="CreditNoteForm" component={CreditNoteFormScreen} />

              {/* Templates */}
              <Stack.Screen name="TemplatesList" component={TemplatesListScreen} />
              <Stack.Screen name="TemplateDetail" component={TemplateDetailScreen} />
              <Stack.Screen name="TemplateForm" component={TemplateFormScreen} />

              {/* Calendar */}
              <Stack.Screen name="Calendar" component={CalendarScreen} />
              <Stack.Screen name="CalendarEventDetail" component={CalendarEventDetailScreen} />
              <Stack.Screen name="CalendarEventForm" component={CalendarEventFormScreen} />

              {/* Master Data */}
              <Stack.Screen name="OtRooms" component={OtRoomsScreen} />
              <Stack.Screen name="Rooms" component={RoomsScreen} />
              <Stack.Screen name="HospitalCharges" component={HospitalChargesScreen} />
              <Stack.Screen name="PendingCharges" component={PendingChargesScreen} />
              <Stack.Screen name="DiagnosisMaster" component={DiagnosisMasterScreen} />

              {/* Settings */}
              <Stack.Screen name="HospitalProfile" component={HospitalProfileScreen} />
              <Stack.Screen name="BillingDefaults" component={BillingDefaultsScreen} options={{ title: 'Billing Defaults' }} />

              {/* Documents */}
              <Stack.Screen name="DocumentsList" component={DocumentsListScreen} />
              <Stack.Screen name="DocumentPreview" component={DocumentPreviewScreen} />

              {/* Advance Balances */}
              <Stack.Screen name="AdvanceBalances" component={AdvanceBalancesScreen} />

              {/* Discount Codes */}
              <Stack.Screen name="DiscountCodes" component={DiscountCodesScreen} options={{ title: 'My Discount Codes' }} />
              <Stack.Screen name="HospitalDiscountCodes" component={HospitalDiscountCodesScreen} options={{ title: 'Hospital Discount Codes' }} />

              {/* Admin Add Staff Portal */}
              <Stack.Screen name="AddStaff" component={AddStaffScreen} options={{ title: 'Create Staff User' }} />
              <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Your Password' }} />

              {/* Notifications */}
              <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
            </>
          )}
        </Stack.Navigator>
          </View>
        </View>
      </NavigationContainer>
      <AlertModal />
      <GlobalThemeModal visible={themeModalOpen} onClose={() => setThemeModalOpen(false)} />
      <GlobalMenuModal visible={menuModalOpen} onClose={() => setMenuModalOpen(false)} />
    </ErrorBoundary>
  );
}
