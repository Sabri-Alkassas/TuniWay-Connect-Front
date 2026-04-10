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
import { registerClient } from '../../services/authService';
import { colors } from '../../theme/colors';

const schema = z.object({
  firstName:     z.string().min(2, 'Minimum 2 caractères'),
  lastName:      z.string().min(2, 'Minimum 2 caractères'),
  username:      z.string().min(3, 'Minimum 3 caractères').regex(/^\S+$/, "Pas d'espaces"),
  email:         z.string().email('Email invalide'),
  birthDate:     z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Format JJ/MM/AAAA'),
  phone:         z.string()
                    .regex(/^(\+216)?\d{8}$/, 'Numéro invalide')
                    .optional()
                    .or(z.literal('')),
  password_hash: z.string().min(8, 'Minimum 8 caractères'),
  confirm:       z.string(),
}).refine((d) => d.password_hash === d.confirm, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm'],
});

type FormData = z.infer<typeof schema>;

export function RegisterScreen() {
  type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '' },
  });

  // ✅ Convert DD/MM/YYYY → ISO
  const formatBirthDate = (date: string) => {
    const [day, month, year] = date.split('/');
    return `${year}-${month}-${day}T00:00:00Z`;
  };

  // ✅ Ensure +216 prefix
  const formatPhone = (phone?: string) => {
    if (!phone) return undefined;
    return phone.startsWith('+216') ? phone : `+216${phone}`;
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      await registerClient({
        email:         data.email,
        password_hash: data.password_hash,
        username:      data.username,
        firstName:     data.firstName,
        lastName:      data.lastName,
        phone:         formatPhone(data.phone),
        birthDate:     formatBirthDate(data.birthDate),
      });

      Alert.alert(
        'Compte créé',
        'Votre compte a été créé avec succès. Connectez-vous.',
        [{ text: 'OK', onPress: () => navigation.replace('Login') }]
      );
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? 'Une erreur est survenue';
      Alert.alert("Erreur d'inscription", message);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (
    name: keyof FormData,
    label: string,
    placeholder: string,
    options: {
      keyboard?: any;
      secure?: boolean;
      optional?: boolean;
      capitalize?: 'none' | 'words' | 'sentences';
    } = {}
  ) => (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, options.optional && styles.labelOptional]}>
        {label}{options.optional ? ' (optionnel)' : ''}
      </Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value, onBlur } }) => (
          <TextInput
            style={[styles.input, errors[name] && styles.inputError]}
            placeholder={placeholder}
            placeholderTextColor={colors.muted}
            keyboardType={options.keyboard ?? 'default'}
            secureTextEntry={options.secure ?? false}
            autoCapitalize={options.capitalize ?? 'none'}
            autoCorrect={false}
            onChangeText={onChange}
            onBlur={onBlur}
            value={value as string}
          />
        )}
      />
      {errors[name] && (
        <Text style={styles.errorMsg}>{errors[name]?.message as string}</Text>
      )}
    </View>
  );

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
          <Text style={styles.heroTitle}>Créer un compte</Text>
          <Text style={styles.heroSub}>Rejoignez TuniWay Connect</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              {renderField('firstName', 'Prénom', 'Ahmed', { capitalize: 'words' })}
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              {renderField('lastName', 'Nom', 'Ben Ali', { capitalize: 'words' })}
            </View>
          </View>

          {renderField('username',      "Nom d'utilisateur",     'ahmed_b')}
          {renderField('email',         'Adresse email',          'exemple@email.com', { keyboard: 'email-address' })}
          {renderField('birthDate',     'Date de naissance',      'JJ/MM/AAAA')}
          {renderField('phone',         'Téléphone',              '+216XXXXXXXX', { keyboard: 'phone-pad', optional: true })}
          {renderField('password_hash', 'Mot de passe',           '••••••••', { secure: true })}
          {renderField('confirm',       'Confirmer mot de passe', '••••••••', { secure: true })}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.buttonText}>Inscrire</Text>
            }
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.mutedText}>Vous avez déjà un compte ?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
            <Text style={styles.linkText}>Se connecter</Text>
          </TouchableOpacity>

          <Text style={styles.cgu}>
            En vous inscrivant vous acceptez nos CGU
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: colors.navy },
  scroll:         { flexGrow: 1 },
  hero:           { backgroundColor: colors.navy, paddingTop: 70, paddingBottom: 28, alignItems: 'center' },
  heroTitle:      { fontSize: 24, fontWeight: '800', color: colors.white, marginBottom: 6 },
  heroSub:        { fontSize: 13, color: colors.muted },
  card:           { flex: 1, backgroundColor: colors.bgLight, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingTop: 26 },
  row:            { flexDirection: 'row' },
  fieldWrap:      { marginBottom: 14 },
  label:          { fontSize: 12, fontWeight: '700', color: colors.navy, marginBottom: 5 },
  labelOptional:  { color: colors.muted, fontWeight: '400' },
  input:          { backgroundColor: colors.white, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 11, fontSize: 13, color: colors.navy },
  inputError:     { borderColor: colors.red },
  errorMsg:       { fontSize: 11, color: colors.red, marginTop: 3 },
  button:         { backgroundColor: colors.red, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.7 },
  buttonText:     { color: colors.white, fontSize: 15, fontWeight: '800' },
  dividerRow:     { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine:    { flex: 1, height: 1, backgroundColor: colors.border },
  dividerLabel:   { marginHorizontal: 12, color: colors.muted, fontSize: 12 },
  mutedText:      { textAlign: 'center', color: colors.muted, fontSize: 13 },
  linkText:       { textAlign: 'center', color: colors.red, fontSize: 14, fontWeight: '800', marginTop: 6 },
  cgu:            { textAlign: 'center', color: colors.muted, fontSize: 11, marginTop: 20, marginBottom: 12 },
});