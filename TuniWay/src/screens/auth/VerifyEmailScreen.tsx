import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { verifyEmail } from '../../services/authService';
import { colors } from '../../theme/colors';

export function VerifyEmailScreen() {
  type Nav = NativeStackNavigationProp<AuthStackParamList, 'VerifyEmail'>;
  const navigation = useNavigation<Nav>();
  const route      = useRoute<any>();
  const { email }  = route.params as { email: string };

  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const inputRef              = useRef<TextInput>(null);

  const onSubmit = async () => {
    if (code.trim().length < 4) {
      setError('Entrez le code reçu par email');
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
          'Email vérifié !',
          'Votre compte est actif. Vous pouvez maintenant vous connecter.',
          [{ text: 'Se connecter', onPress: () => navigation.replace('Login') }]
        );
      } else {
        setError(res.message ?? 'Code invalide. Réessayez.');
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
          <View style={styles.mailIcon}>
            <Text style={styles.mailEmoji}>📧</Text>
          </View>
          <Text style={styles.heroTitle}>Vérifiez votre email</Text>
          <Text style={styles.heroSub}>Un code a été envoyé à</Text>
          <Text style={styles.heroEmail}>{email}</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.instruction}>
            Entrez le code de vérification reçu dans votre boîte mail. Vérifiez également vos spams.
          </Text>

          <Text style={styles.label}>Code de vérification</Text>

          <TextInput
            ref={inputRef}
            style={[styles.codeInput, !!error && styles.inputError]}
            placeholder="123456"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            maxLength={8}
            value={code}
            onChangeText={(t) => {
              setCode(t.replace(/\D/g, ''));
              setError('');
            }}
            autoFocus
            textAlign="center"
          />

          {error ? <Text style={styles.errorMsg}>{error}</Text> : null}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={loading}
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
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>
            Vous n avez pas reçu de code ? Vérifiez vos spams ou recommencez l inscription.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: colors.navy },
  scroll:         { flexGrow: 1 },
  hero:           { backgroundColor: colors.navy, paddingTop: 60, paddingBottom: 32, alignItems: 'center', paddingHorizontal: 24 },
  mailIcon:       { width: 72, height: 72, borderRadius: 22, backgroundColor: 'rgba(245,166,35,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  mailEmoji:      { fontSize: 34 },
  heroTitle:      { fontSize: 24, fontWeight: '800', color: colors.white, marginBottom: 8 },
  heroSub:        { fontSize: 13, color: colors.muted },
  heroEmail:      { fontSize: 14, fontWeight: '700', color: colors.amber, marginTop: 4 },
  card:           { flex: 1, backgroundColor: colors.bgLight, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingTop: 28 },
  instruction:    { fontSize: 13, color: colors.muted, marginBottom: 24, lineHeight: 20 },
  label:          { fontSize: 13, fontWeight: '700', color: colors.navy, marginBottom: 8 },
  codeInput:      { backgroundColor: colors.white, borderRadius: 14, borderWidth: 2, borderColor: colors.border, paddingHorizontal: 20, paddingVertical: 16, fontSize: 28, fontWeight: '800', color: colors.navy, letterSpacing: 8 },
  inputError:     { borderColor: colors.red },
  errorMsg:       { fontSize: 12, color: colors.red, marginTop: 8, textAlign: 'center' },
  button:         { backgroundColor: colors.red, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  buttonDisabled: { opacity: 0.7 },
  buttonText:     { color: colors.white, fontSize: 15, fontWeight: '800' },
  backBtn:        { marginTop: 16, alignItems: 'center' },
  backText:       { color: colors.blue, fontSize: 13, fontWeight: '700' },
  hint:           { textAlign: 'center', color: colors.muted, fontSize: 11, marginTop: 24, lineHeight: 18 },
});