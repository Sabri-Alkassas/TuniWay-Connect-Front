import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '../../navigation/types';
import { verifyEmail } from '../../services/authService';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/colors';

export function VerifyEmailScreen() {
  type Nav = NativeStackNavigationProp<AuthStackParamList, 'VerifyEmail'>;
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const { email } = route.params as { email: string };

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  const onSubmit = async () => {
    if (code.trim().length < 4) {
      setError('Entrez le code recu par e-mail.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await verifyEmail({
        email,
        code: code.trim(),
      });

      if (res.verified) {
        Alert.alert(
          'E-mail verifie',
          'Votre compte est maintenant actif. Vous pouvez vous connecter.',
          [{ text: 'Se connecter', onPress: () => navigation.replace('Login') }],
        );
        return;
      }

      setError(res.message ?? 'Code invalide. Reessayez.');
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
          <View style={styles.mailIcon}>
            <AppIcon family="Feather" name="mail" size={30} color={colors.amber} />
          </View>
          <Text style={styles.heroTitle}>Verifiez votre e-mail</Text>
          <Text style={styles.heroSub}>Un code de verification a ete envoye a</Text>
          <Text style={styles.heroEmail}>{email}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.infoBox}>
            <AppIcon family="Feather" name="info" size={14} color={colors.blue} />
            <Text style={styles.instruction}>
              Saisissez le code recu dans votre boite mail. Pensez aussi a verifier le dossier spam.
            </Text>
          </View>

          <View style={styles.labelRow}>
            <AppIcon family="Feather" name="hash" size={14} color={colors.navy} />
            <Text style={styles.label}>Code de verification</Text>
          </View>

          <TextInput
            ref={inputRef}
            style={[styles.codeInput, !!error && styles.inputError]}
            placeholder="123456"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            maxLength={8}
            value={code}
            onChangeText={(text) => {
              setCode(text.replace(/\D/g, ''));
              setError('');
            }}
            autoFocus
            textAlign="center"
          />

          {error ? (
            <View style={styles.errorRow}>
              <AppIcon family="Feather" name="alert-circle" size={14} color={colors.red} />
              <Text style={styles.errorMsg}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={loading}
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
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <View style={styles.backInner}>
              <AppIcon family="Feather" name="arrow-left" size={14} color={colors.blue} />
              <Text style={styles.backText}>Retour</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.hintBox}>
            <AppIcon family="Feather" name="help-circle" size={14} color={colors.amber} />
            <Text style={styles.hint}>
              Vous n&apos;avez pas recu de code ? Verifiez vos spams ou recommencez l&apos;inscription.
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
  hero: { backgroundColor: colors.navy, paddingTop: 60, paddingBottom: 32, alignItems: 'center', paddingHorizontal: 24 },
  mailIcon: { width: 72, height: 72, borderRadius: 22, backgroundColor: 'rgba(245,166,35,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: colors.white, marginBottom: 8, textAlign: 'center' },
  heroSub: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  heroEmail: { fontSize: 14, fontWeight: '700', color: colors.amber, marginTop: 4, textAlign: 'center' },
  card: { flex: 1, backgroundColor: colors.bgLight, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingTop: 28 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 24, paddingHorizontal: 4 },
  instruction: { flex: 1, fontSize: 13, color: colors.muted, lineHeight: 20 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '700', color: colors.navy },
  codeInput: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 2, borderColor: colors.border, paddingHorizontal: 20, paddingVertical: 16, fontSize: 28, fontWeight: '800', color: colors.navy, letterSpacing: 8 },
  inputError: { borderColor: colors.red },
  errorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 },
  errorMsg: { fontSize: 12, color: colors.red, textAlign: 'center' },
  button: { backgroundColor: colors.red, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  buttonDisabled: { opacity: 0.7 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  backBtn: { marginTop: 16, alignItems: 'center' },
  backInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  hintBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 24, paddingHorizontal: 4 },
  hint: { flex: 1, textAlign: 'left', color: colors.muted, fontSize: 11, lineHeight: 18 },
});
