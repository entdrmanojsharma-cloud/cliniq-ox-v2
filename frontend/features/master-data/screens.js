/* 
  Purpose: Define Master Data screens (OT Rooms, Ward Rooms, Hospital Charges, Pending Approval list).
  Responsibility: Render master list views, enable additions, and authorize charge masters.
*/

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useMasterDataStore } from './store';
import { theme } from '../../shared/styles/theme';

const SkeletonListItem = () => (
  <View style={[styles.listItem, { opacity: 0.15 }]}>
    <View style={{ height: 16, width: 140, backgroundColor: theme.colors.textMuted, borderRadius: 4 }} />
    <View style={{ height: 12, width: 100, backgroundColor: theme.colors.textMuted, borderRadius: 4, marginTop: 6 }} />
  </View>
);

const SkeletonList = () => (
  <View style={{ gap: 8 }}>
    <SkeletonListItem />
    <SkeletonListItem />
    <SkeletonListItem />
  </View>
);

const SkeletonPendingCard = () => (
  <View style={[styles.pendingCard, { opacity: 0.15 }]}>
    <View style={{ flex: 1, gap: 6 }}>
      <View style={{ height: 16, width: 140, backgroundColor: theme.colors.textMuted, borderRadius: 4 }} />
      <View style={{ height: 12, width: 180, backgroundColor: theme.colors.textMuted, borderRadius: 4 }} />
    </View>
  </View>
);

const SkeletonPendingList = () => (
  <View style={{ gap: 8 }}>
    <SkeletonPendingCard />
    <SkeletonPendingCard />
  </View>
);

export function OtRoomsScreen({ navigation }) {
  const { otRooms, fetchOtRooms, createOtRoom, loading } = useMasterDataStore();
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');

  useEffect(() => { fetchOtRooms(); }, []);

  const handleAdd = async () => {
    if (!name.trim()) return Alert.alert('Error', 'OT room name required.');
    await createOtRoom({ roomName: name, defaultHourlyCharge: Number(rate) });
    setName(''); setRate('');
  };

  return (
    <View style={styles.container}>
      <Text style={theme.typography.title}>Operation Theatres</Text>
      <View style={styles.formInline}>
        <TextInput style={styles.input} placeholder="Room Name" placeholderTextColor={theme.colors.textMuted} value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Hourly Rate (INR)" placeholderTextColor={theme.colors.textMuted} value={rate} onChangeText={setRate} keyboardType="numeric" />
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}><Text style={styles.buttonText}>Add</Text></TouchableOpacity>
      </View>
      {loading && otRooms.length === 0 ? <SkeletonList /> : (
        <FlatList
          data={otRooms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <Text style={styles.listItemText}>{item.roomName}</Text>
              <Text style={styles.listItemSubText}>Hourly: INR {Number(item.defaultHourlyCharge).toLocaleString()}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

export function RoomsScreen({ navigation }) {
  const { rooms, fetchRooms, createRoom, loading } = useMasterDataStore();
  const [name, setName] = useState('');
  const [type, setType] = useState('GENERAL');
  const [rate, setRate] = useState('');

  useEffect(() => { fetchRooms(); }, []);

  const handleAdd = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Room name required.');
    await createRoom({ roomName: name, roomType: type, defaultDailyCharge: Number(rate) });
    setName(''); setRate('');
  };

  return (
    <View style={styles.container}>
      <Text style={theme.typography.title}>Ward Rooms</Text>
      <View style={styles.formInline}>
        <TextInput style={styles.input} placeholder="Room No" placeholderTextColor={theme.colors.textMuted} value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Daily Rate" placeholderTextColor={theme.colors.textMuted} value={rate} onChangeText={setRate} keyboardType="numeric" />
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}><Text style={styles.buttonText}>Add</Text></TouchableOpacity>
      </View>
      {loading && rooms.length === 0 ? <SkeletonList /> : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <Text style={styles.listItemText}>Room {item.roomName}</Text>
              <Text style={styles.listItemSubText}>Daily: INR {Number(item.defaultDailyCharge).toLocaleString()}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

export function HospitalChargesScreen({ navigation }) {
  const { hospitalCharges, fetchHospitalCharges, createHospitalCharge, loading } = useMasterDataStore();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [rate, setRate] = useState('');
  const [gst, setGst] = useState('18');

  useEffect(() => { fetchHospitalCharges(); }, []);

  const handleAdd = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Charge name is required.');
    await createHospitalCharge({ chargeName: name, chargeCategory: category, defaultRate: Number(rate), defaultGst: Number(gst) || 0, unitType: 'FIXED' });
    setName(''); setCategory(''); setRate(''); setGst('18');
  };

  return (
    <View style={styles.container}>
      <Text style={theme.typography.title}>Hospital Charges Master</Text>
      <TextInput style={styles.formInput} placeholder="Charge Name" placeholderTextColor={theme.colors.textMuted} value={name} onChangeText={setName} />
      <TextInput style={styles.formInput} placeholder="Category (e.g. Nursing, ICU)" placeholderTextColor={theme.colors.textMuted} value={category} onChangeText={setCategory} />
      <TextInput style={styles.formInput} placeholder="Default Rate (INR)" placeholderTextColor={theme.colors.textMuted} value={rate} onChangeText={setRate} keyboardType="numeric" />
      <TextInput style={styles.formInput} placeholder="Default GST (%)" placeholderTextColor={theme.colors.textMuted} value={gst} onChangeText={setGst} keyboardType="numeric" />
      <TouchableOpacity style={styles.saveButton} onPress={handleAdd}><Text style={styles.buttonText}>Add Charge</Text></TouchableOpacity>
      {loading && hospitalCharges.length === 0 ? <SkeletonList /> : (
        <FlatList
          data={hospitalCharges}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <Text style={styles.listItemText}>{item.chargeName}</Text>
              <Text style={styles.listItemSubText}>{item.chargeCategory} | INR {Number(item.defaultRate).toLocaleString()} (GST: {Number(item.defaultGst)}%)</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

export function PendingChargesScreen({ navigation }) {
  const { pendingCharges, fetchPendingCharges, approvePendingCharge, rejectPendingCharge, loading } = useMasterDataStore();

  useEffect(() => { fetchPendingCharges(); }, []);

  return (
    <View style={styles.container}>
      <Text style={theme.typography.title}>Pending Charges Approval</Text>
      {loading && pendingCharges.length === 0 ? <SkeletonPendingList /> : (
        <FlatList
          data={pendingCharges}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.pendingCard}>
              <View>
                <Text style={styles.listItemText}>{item.chargeName}</Text>
                <Text style={theme.typography.caption}>{item.chargeCategory} | Rate: {Number(item.defaultRate).toLocaleString()}</Text>
              </View>
              <View style={styles.actionColumn}>
                <TouchableOpacity style={styles.approveButton} onPress={() => approvePendingCharge(item.id)}><Text style={styles.buttonText}>Approve</Text></TouchableOpacity>
                <TouchableOpacity style={styles.rejectButton} onPress={() => rejectPendingCharge(item.id)}><Text style={styles.buttonText}>Reject</Text></TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No pending charge approvals.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  formInline: { flexDirection: 'row', gap: theme.spacing.xs, marginVertical: theme.spacing.sm },
  input: { flex: 1, backgroundColor: theme.colors.surface, color: theme.colors.text, padding: 8, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border },
  formInput: { backgroundColor: theme.colors.surface, color: theme.colors.text, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, marginVertical: 4 },
  addButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 6 },
  saveButton: { backgroundColor: theme.colors.primary, padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 8 },
  buttonText: { color: '#ffffff', fontWeight: '700' },
  listItem: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: 8, marginVertical: theme.spacing.xs, borderWidth: 1, borderColor: theme.colors.border },
  listItemText: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  listItemSubText: { color: theme.colors.textMuted, fontSize: 12, marginTop: 4 },
  pendingCard: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: 8, marginVertical: theme.spacing.xs, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  actionColumn: { flexDirection: 'row', gap: 6 },
  approveButton: { backgroundColor: theme.colors.success, padding: 8, borderRadius: 4 },
  rejectButton: { backgroundColor: theme.colors.danger, padding: 8, borderRadius: 4 },
  emptyText: { color: theme.colors.textMuted, textAlign: 'center', marginTop: 40 }
});

export function DiagnosisMasterScreen({ navigation }) {
  const { diagnosisMasters, fetchDiagnosisMasters, createDiagnosisMaster, loading } = useMasterDataStore();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  useEffect(() => { fetchDiagnosisMasters(); }, []);

  const handleAdd = async () => {
    if (!code.trim() || !name.trim()) return Alert.alert('Error', 'Code and Name are required.');
    await createDiagnosisMaster({ diagnosisCode: code, diagnosisName: name, procedures: [] });
    setCode(''); setName('');
  };

  return (
    <View style={styles.container}>
      <Text style={theme.typography.title}>Diagnosis Master</Text>
      <View style={styles.formInline}>
        <TextInput style={styles.input} placeholder="Diagnosis Code" placeholderTextColor={theme.colors.textMuted} value={code} onChangeText={setCode} />
        <TextInput style={styles.input} placeholder="Diagnosis Name" placeholderTextColor={theme.colors.textMuted} value={name} onChangeText={setName} />
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}><Text style={styles.buttonText}>Add</Text></TouchableOpacity>
      </View>
      {loading && diagnosisMasters.length === 0 ? <SkeletonList /> : (
        <FlatList
          data={diagnosisMasters}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <Text style={styles.listItemText}>[{item.diagnosisCode}] {item.diagnosisName}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
