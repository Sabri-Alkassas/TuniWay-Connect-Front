import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { verifyTwoFactor } from '../../services/authService';
import { colors } from '../../theme/colors';

export function TwoFactorScreen() {
  type Nav = NativeStackNavigationProp<AuthStackParamList, 'TwoFactor'>;
  const navigation = useNavigation<Nav>();
  const route      = useRoute<any>();
  const { tempToken } = route.params as { tempToken: string };

  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const inputRef              = useRef<TextInput>(null);

  const onSubmit = async (overrideCode?: string) => {
    const finalCode = overrideCode ?? code;
    if (finalCode.trim().length !== 6) {
      setError('Le code doit contenir 6 chiffres');
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
        navigation.replace('Tabs');
      } else {
        setError(res.message ?? 'Code incorrect. Réessayez.');
        setCode('');
        inputRef.current?.focus();
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? 'Code invalide ou expiré.';
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
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.shieldIcon}>
            <Text style={styles.shieldEmoji}>🔐</Text>
          </View>
          <Text style={styles.heroTitle}>Vérification en deux étapes</Text>
          <Text style={styles.heroSub}>
            Ouvrez votre application d authentification et entrez le code à 6 chiffres.
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.label}>Code TOTP</Text>

          {/* Hidden real input — captures keyboard */}
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

          {/* Visual digit slots */}
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
                    code.length > i  && styles.slotFilled,
                    code.length === i && styles.slotActive,
                    !!error          && styles.slotError,
                  ]}
                >
                  <Text style={styles.slotText}>{code[i] ?? ''}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>

          {error ? <Text style={styles.errorMsg}>{error}</Text> : null}

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.button,
              (loading || code.length !== 6) && styles.buttonDisabled,
            ]}
            onPress={() => onSubmit()}
            disabled={loading || code.length !== 6}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.buttonText}>Vérifier</Text>
            }
          </TouchableOpacity>

          {/* Back */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.replace('Login')}
            activeOpacity={0.7}
          >
            <Text style={styles.backText}>← Retour à la connexion</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>
            Le code change toutes les 30 secondes. Si votre code est refusé, attendez le prochain et réessayez.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: colors.navy },
  scroll:         { flexGrow: 1 },
  hero:           { backgroundColor: colors.navy, paddingTop: 60, paddingBottom: 32, alignItems: 'center', paddingHorizontal: 28 },
  shieldIcon:     { width: 72, height: 72, borderRadius: 22, backgroundColor: 'rgba(232,56,10,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  shieldEmoji:    { fontSize: 34 },
  heroTitle:      { fontSize: 22, fontWeight: '800', color: colors.white, marginBottom: 10, textAlign: 'center' },
  heroSub:        { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  card:           { flex: 1, backgroundColor: colors.bgLight, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingTop: 28 },
  label:          { fontSize: 13, fontWeight: '700', color: colors.navy, marginBottom: 16, textAlign: 'center' },
  hiddenInput:    { position: 'absolute', width: 1, height: 1, opacity: 0 },
  slots:          { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 8 },
  slot:           { width: 44, height: 54, borderRadius: 12, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  slotFilled:     { borderColor: colors.navy },
  slotActive:     { borderColor: colors.amber },
  slotError:      { borderColor: colors.red },
  slotText:       { fontSize: 24, fontWeight: '800', color: colors.navy },
  errorMsg:       { fontSize: 12, color: colors.red, textAlign: 'center', marginTop: 8, marginBottom: 4 },
  button:         { backgroundColor: colors.red, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  buttonDisabled: { opacity: 0.4 },
  buttonText:     { color: colors.white, fontSize: 15, fontWeight: '800' },
  backBtn:        { marginTop: 18, alignItems: 'center' },
  backText:       { color: colors.blue, fontSize: 13, fontWeight: '700' },
  hint:           { textAlign: 'center', color: colors.muted, fontSize: 11, marginTop: 24, lineHeight: 18 },
});