import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '../../navigation/types';
import { verifyTwoFactor } from '../../services/authService';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/colors';

export function TwoFactorScreen() {
  type Nav = NativeStackNavigationProp<AuthStackParamList, 'TwoFactor'>;
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const { tempToken } = route.params as { tempToken: string };

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  const onSubmit = async (overrideCode?: string) => {
    const finalCode = overrideCode ?? code;
    if (finalCode.trim().length !== 6) {
      setError('Le code doit contenir 6 chiffres.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await verifyTwoFactor({
        tempToken,
        totpCode: finalCode.trim(),
      });

      if (res.authenticated) {
        return;
      }

      setError(res.message ?? 'Code incorrect. Reessayez.');
      setCode('');
      inputRef.current?.focus();
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Code invalide ou expire.';
      setError(message);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setError('');

    if (digits.length === 6) {
      setTimeout(() => onSubmit(digits), 100);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.shieldIcon}>
            <AppIcon family="Feather" name="shield" size={32} color={colors.red} />
          </View>
          <Text style={styles.heroTitle}>Verification en deux etapes</Text>
          <Text style={styles.heroSub}>
            Ouvrez votre application d&apos;authentification puis saisissez le code a 6 chiffres.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.labelRow}>
            <AppIcon family="Feather" name="key" size={14} color={colors.navy} />
            <Text style={styles.label}>Code TOTP</Text>
          </View>

          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={handleCodeChange}
            autoFocus
            caretHidden
          />

          <TouchableOpacity
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
          >
            <View style={styles.slots}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.slot,
                    code.length > i && styles.slotFilled,
                    code.length === i && styles.slotActive,
                    !!error && styles.slotError,
                  ]}
                >
                  <Text style={styles.slotText}>{code[i] ?? ''}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>

          {error ? (
            <View style={styles.errorRow}>
              <AppIcon family="Feather" name="alert-circle" size={14} color={colors.red} />
              <Text style={styles.errorMsg}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.button,
              (loading || code.length !== 6) && styles.buttonDisabled,
            ]}
            onPress={() => onSubmit()}
            disabled={loading || code.length !== 6}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <View style={styles.buttonInner}>
                <AppIcon family="Feather" name="check-circle" size={16} color={colors.white} />
                <Text style={styles.buttonText}>Verifier</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.replace('Login')}
            activeOpacity={0.7}
          >
            <View style={styles.backInner}>
              <AppIcon family="Feather" name="arrow-left" size={14} color={colors.blue} />
              <Text style={styles.backText}>Retour a la connexion</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.hintBox}>
            <AppIcon family="Feather" name="clock" size={14} color={colors.amber} />
            <Text style={styles.hint}>
              Le code change toutes les 30 secondes. Si le code est refuse, attendez le suivant puis reessayez.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },
  scroll: { flexGrow: 1 },
  hero: { backgroundColor: colors.navy, paddingTop: 60, paddingBottom: 32, alignItems: 'center', paddingHorizontal: 28 },
  shieldIcon: { width: 72, height: 72, borderRadius: 22, backgroundColor: 'rgba(232,56,10,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: colors.white, marginBottom: 10, textAlign: 'center' },
  heroSub: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  card: { flex: 1, backgroundColor: colors.bgLight, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingTop: 28 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: colors.navy },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  slots: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 8 },
  slot: { width: 44, height: 54, borderRadius: 12, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  slotFilled: { borderColor: colors.navy },
  slotActive: { borderColor: colors.amber },
  slotError: { borderColor: colors.red },
  slotText: { fontSize: 24, fontWeight: '800', color: colors.navy },
  errorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, marginBottom: 4 },
  errorMsg: { fontSize: 12, color: colors.red, textAlign: 'center' },
  button: { backgroundColor: colors.red, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  buttonDisabled: { opacity: 0.4 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  backBtn: { marginTop: 18, alignItems: 'center' },
  backInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  hintBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 24, paddingHorizontal: 8 },
  hint: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 18 },
});
