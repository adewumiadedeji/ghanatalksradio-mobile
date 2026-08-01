import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Card, PrimaryButton, InputGroup } from '../components/UI';
import { COLORS, SPACING } from '../theme/colors';
import { useUserStore } from '../store/userStore';

/**
 * Authenticated change-password, reached from Profile. Validated via the
 * user's existing session token (not a reset ticket/PIN) - see
 * change_password() on the backend.
 */
export default function ChangePasswordScreen({ navigation }: any) {
  const changePassword = useUserStore((s) => s.changePassword);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    if (!newPassword || !confirmPassword) {
      setErrorMessage('Please fill in both fields.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords don't match.");
      return;
    }
    setErrorMessage('');
    setIsLoading(true);
    try {
      await changePassword(newPassword);
      Alert.alert('Password updated', 'Your password has been changed.');
      navigation.goBack();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Could not update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.closeButton} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="close" size={26} color={COLORS.onSurfaceVariant} />
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>Change Password</Text>
        </View>

        <Card>
          {!!errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <InputGroup
            label="New Password"
            placeholder="••••••••"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <InputGroup
            label="Confirm New Password"
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <PrimaryButton
            title="Update Password"
            onPress={handleSubmit}
            loading={isLoading}
            style={{ marginTop: SPACING.sm }}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  closeButton: { alignSelf: 'flex-end', padding: SPACING.sm },
  container: { flexGrow: 1, padding: SPACING.md, gap: SPACING.xl, justifyContent: 'center' },
  header: { alignItems: 'center', gap: SPACING.sm },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.onSurface, textAlign: 'center' },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 4,
    padding: 10,
    marginBottom: SPACING.md,
  },
  errorText: { color: COLORS.error, fontSize: 13, fontWeight: '600' },
});
