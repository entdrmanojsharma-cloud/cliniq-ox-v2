import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Modal, Pressable, Platform } from 'react-native';
import { useAuthStore } from './store';
import { theme } from '../../shared/styles/theme';

export function LoginScreen({ navigation }) {
  const { login } = useAuthStore();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isUsernameVerified, setIsUsernameVerified] = useState(false);
  
  // Form fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Register fields
  const [role, setRole] = useState('ADMIN');
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Forgot password states
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const getBaseUrl = () => {
    let url = process.env.EXPO_PUBLIC_API_URL;
    if (url && !url.endsWith('/api/v1')) {
      url = `${url}/api/v1`;
    }
    return url || 'http://localhost:3000/api/v1';
  };

  const handleVerifyUsername = async () => {
    setError('');
    setSuccess('');
    
    if (!username.trim()) return setError('User ID is required.');

    setLoading(true);
    try {
      const res = await fetch(`${getBaseUrl()}/auth/verify-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Verification failed');
      
      if (json.data?.exists) {
        setIsUsernameVerified(true);
      } else {
        setError('User ID / Username does not exist or account is inactive.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    setSuccess('');
    
    if (!username.trim()) return setError('User ID is required.');
    if (!password.trim()) return setError('Password is required.');

    setLoading(true);
    try {
      await login('CLKOX', username.trim(), password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setError('');
    setSuccess('');
    
    if (!username.trim()) return setError('User ID is required.');
    if (!password.trim()) return setError('Password is required.');
    if (password.length < 8) return setError('Password must be at least 8 characters long.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    const { signup } = useAuthStore.getState();
    try {
      await signup('CLKOX', username.trim(), password, role);
      setSuccess('User profile created successfully! Toggling back to Sign In...');
      // Clear form inputs
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      // Redirect to login mode after 2 seconds
      setTimeout(() => {
        setIsRegisterMode(false);
        setIsUsernameVerified(false);
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setForgotError('');
    setForgotSuccess('');

    if (!forgotUsername.trim()) {
      return setForgotError('User ID is required.');
    }

    setForgotLoading(true);
    const { requestForgotPassword } = useAuthStore.getState();
    try {
      const data = await requestForgotPassword(forgotUsername.trim());
      setForgotSuccess(data.message || 'Request submitted successfully.');
      setForgotUsername('');
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setIsUsernameVerified(false);
    setError('');
    setSuccess('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.card}>
        <Text style={styles.title}>✦ Cliniq-OX</Text>
        <Text style={styles.subtitle}>
          {isRegisterMode ? 'Create a new clinic user tenant' : 'Sign in to access your dashboard'}
        </Text>

        <View style={styles.form}>
          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* Success Banner */}
          {success ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>✅ {success}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>User ID / Username *</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              style={[styles.input, { flex: 1 }, isUsernameVerified && !isRegisterMode && { backgroundColor: theme.colors.border, color: '#cbd5e1' }]}
              placeholder="Enter User ID"
              placeholderTextColor="#64748b"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              editable={!isUsernameVerified || isRegisterMode}
            />
            {isUsernameVerified && !isRegisterMode && (
              <TouchableOpacity
                onPress={() => {
                  setIsUsernameVerified(false);
                  setPassword('');
                }}
                style={{ padding: 12, backgroundColor: theme.colors.border, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}
              >
                <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '700' }}>✎ Change</Text>
              </TouchableOpacity>
            )}
          </View>

          {(!isUsernameVerified && !isRegisterMode) ? null : (
            <>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </>
          )}

          {isRegisterMode && (
            <>
              <Text style={styles.label}>Confirm Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </>
          )}

          {isRegisterMode && (
            <View>
              <Text style={styles.label}>Account Role *</Text>
              <View style={styles.roleRow}>
                {['ADMIN', 'DOCTOR', 'RECEPTIONIST'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleButton, role === r && styles.roleButtonActive]}
                    onPress={() => setRole(r)}
                  >
                    <Text style={[styles.roleButtonText, role === r && styles.roleButtonTextActive]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#6366f1" style={{ marginVertical: 20 }} />
          ) : (
            <TouchableOpacity
              style={styles.submitButton}
              onPress={
                isRegisterMode
                  ? handleSignup
                  : isUsernameVerified
                  ? handleLogin
                  : handleVerifyUsername
              }
            >
              <Text style={styles.submitButtonText}>
                {isRegisterMode
                  ? 'Register Account'
                  : isUsernameVerified
                  ? 'Sign In'
                  : 'Next'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {!isRegisterMode && isUsernameVerified && (
          <TouchableOpacity
            style={{ marginTop: 14, alignItems: 'center' }}
            onPress={() => {
              setForgotError('');
              setForgotSuccess('');
              setForgotUsername(username);
              setForgotModalVisible(true);
            }}
          >
            <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' }}>
              Forgot password? Request reset
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.toggleModeButton}
          onPress={toggleMode}
        >
          <Text style={styles.toggleModeText}>
            {isRegisterMode
              ? 'Already have an account? Sign In'
              : 'Need to register a new user? Register Here'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Forgot Password Request Modal */}
      <Modal
        visible={forgotModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setForgotModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>🔒 Request Password Reset</Text>
            <Text style={styles.modalSubtitle}>
              Submit your User ID. The request will be reviewed and approved by the Super Admin.
            </Text>

            {forgotError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {forgotError}</Text>
              </View>
            ) : null}

            {forgotSuccess ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>✅ {forgotSuccess}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>User ID / Username *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. admin@cliniqox.com"
              placeholderTextColor="#64748b"
              value={forgotUsername}
              onChangeText={setForgotUsername}
              autoCapitalize="none"
            />

            {forgotLoading ? (
              <ActivityIndicator size="small" color="#6366f1" style={{ marginVertical: 14 }} />
            ) : (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                <TouchableOpacity
                  style={[styles.submitButton, { flex: 1, marginTop: 0, padding: 12 }]}
                  onPress={handleForgotPassword}
                >
                  <Text style={[styles.submitButtonText, { fontSize: 14 }]}>Submit Request</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitButton, { flex: 1, marginTop: 0, padding: 12, backgroundColor: '#475569' }]}
                  onPress={() => setForgotModalVisible(false)}
                >
                  <Text style={[styles.submitButtonText, { fontSize: 14 }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

export function ChangePasswordScreen() {
  const { changePassword, logout } = useAuthStore();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChangePassword = async () => {
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      return setError('Password must be at least 8 characters long.');
    }
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    setLoading(true);
    try {
      await changePassword(newPassword);
      setSuccess('Password changed successfully! Redirecting...');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.changePasswordContainer}>
      <View style={styles.card}>
        <Text style={styles.title}>🔒 Secure Your Account</Text>
        <Text style={styles.subtitle}>You are required to change your password before proceeding.</Text>
        
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✅ {success}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>New Password *</Text>
        <TextInput
          style={styles.input}
          placeholder="New Password (min 8 chars)"
          placeholderTextColor="#64748b"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Confirm New Password *</Text>
        <TextInput
          style={styles.input}
          placeholder="Confirm New Password"
          placeholderTextColor="#64748b"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoCapitalize="none"
        />

        {loading ? (
          <ActivityIndicator size="large" color="#6366f1" style={{ marginVertical: 20 }} />
        ) : (
          <View style={{ gap: 12, marginTop: 12 }}>
            <TouchableOpacity style={styles.submitButton} onPress={handleChangePassword}>
              <Text style={styles.submitButtonText}>Change Password</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.submitButton, { backgroundColor: '#475569' }]} onPress={logout}>
              <Text style={styles.submitButtonText}>Cancel & Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  changePasswordContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 100
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 24,
    padding: 40,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20
  },
  form: {
    gap: 16
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: -8,
    marginTop: 6
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    color: theme.colors.text,
    fontSize: 15
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4
  },
  roleButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  roleButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted
  },
  roleButtonTextActive: {
    color: '#ffffff'
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },
  toggleModeButton: {
    marginTop: 24,
    alignItems: 'center'
  },
  toggleModeText: {
    color: theme.colors.primaryLight,
    fontSize: 14,
    fontWeight: '600'
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18
  },
  successBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8
  },
  successText: {
    color: '#a7f3d0',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 24,
    padding: 24
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: 8,
    textAlign: 'center'
  },
  modalSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18
  }
});
