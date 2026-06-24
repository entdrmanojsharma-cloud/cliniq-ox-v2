/* 
  Purpose: Define Staff Management screen (List View, creation form modal, edit form modal).
  Responsibility: Render staff members list, filter by search, toggle active state, update roles, and allow creation of new logins.
*/

import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ActivityIndicator, ScrollView, Modal, Pressable, Platform, Alert, FlatList 
} from 'react-native';
import { useAuthStore } from './store';
import { theme } from '../../shared/styles/theme';
import { api } from '../../shared/utils/api';
import { useSettingsStore } from '../settings/store';
import { SearchableDropdown } from '../../shared/components/SearchableDropdown';
import { Picker } from '../../shared/components/Picker';

export function AddStaffScreen({ navigation }) {
  const { role: currentUserRole } = useAuthStore();
  const { profile, fetchProfile } = useSettingsStore();
  
  // List states
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editUser, setEditUser] = useState(null); // null means creating, object means editing
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [staffType, setStaffType] = useState('Doctor');

  // Doctor-specific professional fields
  const [qualification, setQualification] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [department, setDepartment] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [experience, setExperience] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [digitalSignature, setDigitalSignature] = useState('');

  useEffect(() => {
    fetchProfile();
    fetchStaff();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchStaff();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const data = await api.get('/auth/staff');
      setStaffList(data.staff || []);
    } catch (err) {
      console.warn('Failed to fetch staff:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditUser(null);
    setUsername('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setIsActive(true);
    setStaffType('');
    setQualification('');
    setSpecialty('');
    setDepartment('');
    setLicenseNumber('');
    setExperience('');
    setMobileNumber('');
    setEmail('');
    setDigitalSignature('');
    setModalError('');
    setModalVisible(true);
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setUsername(user.username);
    setPassword('');
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setIsActive(user.isActive);
    setStaffType(user.staffType || (user.role === 'DOCTOR' ? 'Doctor' : user.role === 'ADMIN' ? 'Admin' : 'Receptionist'));
    
    // Fill doctor profile fields if they exist
    const doc = user.doctorProfile || {};
    setQualification(doc.qualification || '');
    setSpecialty(doc.specialty || '');
    setDepartment(doc.department || '');
    setLicenseNumber(doc.licenseNumber || '');
    setExperience(doc.experience || '');
    setMobileNumber(doc.mobileNumber || '');
    setEmail(doc.email || '');
    setDigitalSignature(doc.digitalSignature || '');
    
    setModalError('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    setModalError('');
    if (!username.trim()) return setModalError('Username / User ID is required.');
    if (!firstName.trim()) return setModalError('First Name is required.');
    if (!staffType) return setModalError('Staff Type is required.');
    
    const isEdit = !!editUser;
    if (!isEdit && !password.trim()) return setModalError('Password is required.');
    if (!isEdit && password.length < 6) return setModalError('Password must be at least 6 characters.');

    const isDocType = ['Doctor', 'Anesthetist', 'Surgeon', 'Visiting Consultant'].includes(staffType);

    setModalLoading(true);
    try {
      const payload = {
        role: isDocType ? 'DOCTOR' : staffType === 'Admin' ? 'ADMIN' : 'RECEPTIONIST',
        staffType,
        isActive,
        firstName: firstName.trim(),
        lastName: lastName.trim()
      };

      if (isDocType) {
        payload.qualification = qualification.trim() || null;
        payload.specialty = specialty.trim() || null;
        payload.department = department.trim() || null;
        payload.licenseNumber = licenseNumber.trim() || null;
        payload.experience = experience.trim() || null;
        payload.mobileNumber = mobileNumber.trim() || null;
        payload.email = email.trim() || null;
        payload.digitalSignature = digitalSignature.trim() || null;
      }

      if (isEdit) {
        if (password.trim()) {
          payload.newPassword = password;
        }
        await api.put(`/auth/staff/${editUser.id}`, payload);
      } else {
        payload.hospitalCode = profile?.code || 'CLKOX';
        payload.username = username.trim().toLowerCase();
        payload.password = password;
        await api.post('/auth/signup', payload);
      }
      setModalVisible(false);
      fetchStaff();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteStaff = (user) => {
    if (user.role === 'ADMIN' && staffList.filter(s => s.role === 'ADMIN').length <= 1) {
      return Alert.alert('Action Forbidden', 'Cannot delete the only hospital administrator.');
    }

    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete staff member "${user.firstName || ''} ${user.lastName || ''}" (${user.username})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await api.delete(`/auth/staff/${user.id}`);
              fetchStaff();
            } catch (err) {
              Alert.alert('Delete Failed', err.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const filteredStaff = staffList.filter(user => {
    const s = search.toLowerCase();
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
    const stType = (user.staffType || '').toLowerCase();
    return (
      user.username.toLowerCase().includes(s) ||
      user.role.toLowerCase().includes(s) ||
      stType.includes(s) ||
      fullName.includes(s)
    );
  });

  const getRoleIcon = (user) => {
    const sType = user.staffType || (user.role === 'DOCTOR' ? 'Doctor' : user.role === 'ADMIN' ? 'Admin' : 'Receptionist');
    switch (sType) {
      case 'Admin': return '👑';
      case 'Doctor':
      case 'Surgeon':
      case 'Visiting Consultant':
        return '🩺';
      case 'Anesthetist': return '💉';
      case 'Receptionist': return '🗂️';
      case 'Nurse': return '👩‍⚕️';
      case 'Technician': return '🔬';
      default: return '👤';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={theme.typography.title}>Staff Directory</Text>
          <Text style={theme.typography.caption}>Manage login credentials and system access permissions</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Text style={styles.addBtnText}>+ Add Staff</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search staff by name, role or username..."
        placeholderTextColor={theme.colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      {loading && staffList.length === 0 ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredStaff}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={[styles.card, !item.isActive && styles.cardInactive]}>
              <View style={styles.cardLeft}>
                <View style={[styles.roleBadgeIcon, { backgroundColor: item.isActive ? 'rgba(99, 102, 241, 0.12)' : 'rgba(148, 163, 184, 0.12)' }]}>
                  <Text style={{ fontSize: 18 }}>{getRoleIcon(item)}</Text>
                </View>
                <View>
                  <Text style={[styles.staffName, !item.isActive && styles.textMuted]}>
                    {item.firstName || item.lastName ? `${item.firstName || ''} ${item.lastName || ''}`.trim() : 'Unnamed User'}
                  </Text>
                  <Text style={styles.staffUsername}>{item.username}</Text>
                  <View style={styles.tagRow}>
                    <View style={[styles.roleLabelBadge, { backgroundColor: item.role === 'ADMIN' ? 'rgba(239, 68, 68, 0.12)' : item.role === 'DOCTOR' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)' }]}>
                      <Text style={[styles.roleLabelText, { color: item.role === 'ADMIN' ? '#fca5a5' : item.role === 'DOCTOR' ? '#a7f3d0' : '#fcd34d' }]}>
                        {item.staffType || item.role}
                      </Text>
                    </View>
                    {!item.isActive && (
                      <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveText}>Inactive</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.cardRight}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteStaff(item)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {search ? 'No matching staff members found.' : 'No staff profiles registered yet.'}
            </Text>
          }
        />
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{editUser ? '✏️ Edit Staff Account' : '➕ Add Staff Member'}</Text>
            
            {modalError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {modalError}</Text>
              </View>
            ) : null}

            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="John" placeholderTextColor={theme.colors.textMuted} />

              <Text style={styles.label}>Last Name</Text>
              <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Doe" placeholderTextColor={theme.colors.textMuted} />

              <Text style={styles.label}>Username / User ID *</Text>
              <TextInput 
                style={[styles.input, editUser && styles.inputDisabled]} 
                value={username} 
                onChangeText={setUsername} 
                editable={!editUser} 
                placeholder="john.doe" 
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
              />

              <Text style={styles.label}>{editUser ? 'New Password (optional)' : 'Password *'}</Text>
              <TextInput 
                style={styles.input} 
                value={password} 
                onChangeText={setPassword} 
                placeholder={editUser ? "Leave blank to keep current" : "••••••••"} 
                placeholderTextColor={theme.colors.textMuted}
                secureTextEntry 
                autoCapitalize="none"
              />

              <Text style={styles.label}>Staff Type *</Text>
              <Picker
                selectedValue={staffType}
                onValueChange={(val) => setStaffType(val)}
                placeholder="Select Staff Type..."
                style={{ marginHorizontal: 0 }}
              >
                <Picker.Item label="Select Staff Type..." value="" />
                <Picker.Item label="Doctor" value="Doctor" />
                <Picker.Item label="Anesthetist" value="Anesthetist" />
                <Picker.Item label="Surgeon" value="Surgeon" />
                <Picker.Item label="Visiting Consultant" value="Visiting Consultant" />
                <Picker.Item label="Receptionist" value="Receptionist" />
                <Picker.Item label="Nurse" value="Nurse" />
                <Picker.Item label="Technician" value="Technician" />
                <Picker.Item label="Admin" value="Admin" />
                <Picker.Item label="Other" value="Other" />
              </Picker>

              {['Doctor', 'Anesthetist', 'Surgeon', 'Visiting Consultant'].includes(staffType) && (
                <View style={styles.doctorFieldsContainer}>
                  <Text style={styles.sectionHeader}>🩺 Professional Doctor Fields</Text>
                  
                  <Text style={styles.label}>Qualification</Text>
                  <TextInput style={styles.input} value={qualification} onChangeText={setQualification} placeholder="e.g. MBBS, MD" placeholderTextColor={theme.colors.textMuted} />

                  <Text style={styles.label}>Specialization</Text>
                  <TextInput style={styles.input} value={specialty} onChangeText={setSpecialty} placeholder="e.g. ENT, Pediatrics" placeholderTextColor={theme.colors.textMuted} />

                  <Text style={styles.label}>Department</Text>
                  <TextInput style={styles.input} value={department} onChangeText={setDepartment} placeholder="e.g. Otorhinolaryngology" placeholderTextColor={theme.colors.textMuted} />

                  <Text style={styles.label}>Registration Number</Text>
                  <TextInput style={styles.input} value={licenseNumber} onChangeText={setLicenseNumber} placeholder="e.g. Reg-12345" placeholderTextColor={theme.colors.textMuted} />

                  <Text style={styles.label}>Experience</Text>
                  <TextInput style={styles.input} value={experience} onChangeText={setExperience} placeholder="e.g. 10 years" placeholderTextColor={theme.colors.textMuted} />

                  <Text style={styles.label}>Mobile Number</Text>
                  <TextInput style={styles.input} value={mobileNumber} onChangeText={setMobileNumber} placeholder="e.g. 9876543210" placeholderTextColor={theme.colors.textMuted} keyboardType="phone-pad" />

                  <Text style={styles.label}>Email Address</Text>
                  <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="e.g. dr.john@cliniqox.com" placeholderTextColor={theme.colors.textMuted} keyboardType="email-address" autoCapitalize="none" />

                  <Text style={styles.label}>Digital Signature</Text>
                  <TextInput style={[styles.input, { minHeight: 60 }]} value={digitalSignature} onChangeText={setDigitalSignature} placeholder="Signature URL or Text Description" placeholderTextColor={theme.colors.textMuted} multiline />
                </View>
              )}

              {editUser && (
                <View style={styles.statusRow}>
                  <Text style={styles.label}>Account Status</Text>
                  <View style={styles.toggleContainer}>
                    <TouchableOpacity style={[styles.toggleBtn, isActive && styles.toggleActive]} onPress={() => setIsActive(true)}>
                      <Text style={[styles.toggleBtnText, isActive && { color: '#fff' }]}>Active</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.toggleBtn, !isActive && styles.toggleInactive]} onPress={() => setIsActive(false)}>
                      <Text style={[styles.toggleBtnText, !isActive && { color: '#fff' }]}>Inactive</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>

            {modalLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 12 }} />
            ) : (
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelModalBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveModalBtn} onPress={handleSave}>
                  <Text style={styles.saveModalBtnText}>{editUser ? 'Save Changes' : 'Create Account'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  addBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  searchInput: { backgroundColor: theme.colors.surface, color: theme.colors.text, padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  card: { backgroundColor: theme.colors.surface, padding: 16, borderRadius: 14, marginVertical: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  cardInactive: { opacity: 0.6, backgroundColor: 'rgba(255, 255, 255, 0.02)' },
  cardLeft: { flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 },
  roleBadgeIcon: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  staffName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  textMuted: { color: theme.colors.textMuted },
  staffUsername: { fontSize: 11.5, color: theme.colors.textMuted, marginTop: 2, fontWeight: '600' },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 6, alignItems: 'center' },
  roleLabelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roleLabelText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
  inactiveBadge: { backgroundColor: 'rgba(148, 163, 184, 0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  inactiveText: { fontSize: 9, fontWeight: '800', color: '#cbd5e1' },
  cardRight: { flexDirection: 'row', gap: 8 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: 8 },
  editBtnText: { color: theme.colors.primaryLight, fontSize: 12, fontWeight: '700' },
  deleteBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8 },
  deleteBtnText: { color: theme.colors.danger, fontSize: 12, fontWeight: '700' },
  emptyText: { color: theme.colors.textMuted, textAlign: 'center', marginTop: 40, fontSize: 13 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 420, maxHeight: '90%', flexShrink: 1, borderWidth: 1, borderColor: theme.colors.border },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text, marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 4, marginTop: 6 },
  input: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, padding: 12, color: theme.colors.text, fontSize: 14 },
  inputDisabled: { opacity: 0.5, backgroundColor: 'rgba(255,255,255,0.02)' },
  statusRow: { marginTop: 10 },
  toggleContainer: { flexDirection: 'row', gap: 8, marginTop: 4 },
  toggleBtn: { flex: 1, backgroundColor: theme.colors.background, paddingVertical: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border },
  toggleActive: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
  toggleInactive: { backgroundColor: theme.colors.danger, borderColor: theme.colors.danger },
  toggleBtnText: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelModalBtn: { flex: 1, backgroundColor: theme.colors.background, padding: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  cancelModalBtnText: { color: theme.colors.textMuted, fontWeight: '700', fontSize: 14 },
  saveModalBtn: { flex: 1.5, backgroundColor: theme.colors.success, padding: 14, borderRadius: 10, alignItems: 'center' },
  saveModalBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  errorBox: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText: { color: '#fca5a5', fontSize: 13, fontWeight: '600' },
  pickerWrapper: {
    marginVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  doctorFieldsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primaryLight,
    marginBottom: 8,
  },
});
