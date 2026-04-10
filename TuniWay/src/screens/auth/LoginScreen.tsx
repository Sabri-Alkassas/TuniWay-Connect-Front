import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { login } from '../../services/authService';
import { colors } from '../../theme/colors';

const schema = z.object({
  email:         z.string().email('Email invalide'),
  password_hash: z.string().min(8, 'Minimum 8 caractères'),
});

type FormData = z.infer<typeof schema>;

export function LoginScreen() {
  type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      const res = await login({
        email:         data.email,
        password_hash: data.password_hash,
      });

      if (!res.authenticated) {
        Alert.alert('Erreur', res.message ?? 'Connexion refusée');
        return;
      }

      // handle 2FA if your backend uses it
      if (res.twoFactorRequired) {
        // router.push('/two-factor') — wire this up when ready
        Alert.alert('2FA requis', 'Vérification en deux étapes non encore implémentée.');
        return;
      }

      navigation.replace('Tabs');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? 'Email ou mot de passe incorrect';
      Alert.alert('Erreur de connexion', message);
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
          <Text style={styles.heroTitle}>Bon retour !</Text>
          <Text style={styles.heroSub}>Connectez-vous à votre compte</Text>
        </View>

        <View style={styles.card}>

          {/* Email */}
          <Text style={styles.label}>Adresse email</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value, onBlur } }) => (
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="exemple@email.com"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
              />
            )}
          />
          {errors.email && (
            <Text style={styles.errorMsg}>{errors.email.message}</Text>
          )}

          {/* Password */}
          <Text style={[styles.label, { marginTop: 16 }]}>Mot de passe</Text>
          <Controller
            control={control}
            name="password_hash"
            render={({ field: { onChange, value, onBlur } }) => (
              <TextInput
                style={[styles.input, errors.password_hash && styles.inputError]}
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                secureTextEntry
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
              />
            )}
          />
          {errors.password_hash && (
            <Text style={styles.errorMsg}>{errors.password_hash.message}</Text>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.buttonText}>Se connecter</Text>
            }
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.mutedText}>Pas encore de compte ?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
            <Text style={styles.linkText}>Créer un compte</Text>
          </TouchableOpacity>

          <Text style={styles.cgu}>
            En vous connectant vous acceptez nos CGU
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: colors.navy },
  scroll:         { flexGrow: 1 },
  hero:           { backgroundColor: colors.navy, paddingTop: 70, paddingBottom: 32, alignItems: 'center' },
  heroTitle:      { fontSize: 26, fontWeight: '800', color: colors.white, marginBottom: 6 },
  heroSub:        { fontSize: 13, color: colors.muted },
  card:           { flex: 1, backgroundColor: colors.bgLight, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingTop: 28 },
  label:          { fontSize: 13, fontWeight: '700', color: colors.navy, marginBottom: 6 },
  input:          { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: colors.navy },
  inputError:     { borderColor: colors.red },
  errorMsg:       { fontSize: 11, color: colors.red, marginTop: 4 },
  button:         { backgroundColor: colors.red, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  buttonDisabled: { opacity: 0.7 },
  buttonText:     { color: colors.white, fontSize: 15, fontWeight: '800' },
  dividerRow:     { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  dividerLine:    { flex: 1, height: 1, backgroundColor: colors.border },
  dividerLabel:   { marginHorizontal: 12, color: colors.muted, fontSize: 12 },
  mutedText:      { textAlign: 'center', color: colors.muted, fontSize: 13 },
  linkText:       { textAlign: 'center', color: colors.red, fontSize: 14, fontWeight: '800', marginTop: 6 },
  cgu:            { textAlign: 'center', color: colors.muted, fontSize: 11, marginTop: 24 },
});