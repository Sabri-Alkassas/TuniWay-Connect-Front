import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Alert, Modal, FlatList
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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


  const [showYearModal, setShowYearModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '' },
  });

  const formatBirthDate = (date: string) => {
    const [day, month, year] = date.split('/');
    return `${year}-${month}-${day}T00:00:00Z`;
  };

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

      navigation.replace('VerifyEmail', { email: data.email });
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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

          {renderField('username', "Nom d'utilisateur", 'ahmed_b')}
          {renderField('email', 'Adresse email', 'exemple@email.com', { keyboard: 'email-address' })}

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Date de naissance</Text>

            <Controller
              control={control}
              name="birthDate"
              render={({ field: { onChange, value } }) => (
                <>
                  <TouchableOpacity
                    style={[styles.input, errors.birthDate && styles.inputError]}
                    onPress={() => setShowYearModal(true)}
                  >
                    <Text style={{ color: value ? colors.navy : colors.muted }}>
                      {value || 'JJ/MM/AAAA'}
                    </Text>
                  </TouchableOpacity>

                  {/* YEAR MODAL */}
                  <Modal visible={showYearModal} animationType="slide">
                    <View style={{ flex: 1, backgroundColor: colors.bgLight }}>
                      <Text style={{ fontSize: 18, fontWeight: '800', padding: 20 }}>
                        Choisir une année
                      </Text>

                      <FlatList
                        data={years}
                        keyExtractor={(item) => item.toString()}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={{ padding: 15, borderBottomWidth: 1, borderColor: '#eee' }}
                            onPress={() => {
                              const newDate = new Date();
                              newDate.setFullYear(item);
                              setTempDate(newDate);
                              setShowYearModal(false);
                              setTimeout(() => setShowDatePicker(true), 100);
                            }}
                          >
                            <Text style={{ fontSize: 16 }}>{item}</Text>
                          </TouchableOpacity>
                        )}
                      />
                    </View>
                  </Modal>

                  {/* DATE PICKER */}
                  {showDatePicker && (
                    <DateTimePicker
                      value={tempDate}
                      mode="date"
                      display="default"
                      maximumDate={new Date()}
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                          const day = String(selectedDate.getDate()).padStart(2, '0');
                          const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                          const year = selectedDate.getFullYear();
                          onChange(`${day}/${month}/${year}`);
                        }
                      }}
                    />
                  )}
                </>
              )}
            />

            {errors.birthDate && (
              <Text style={styles.errorMsg}>{errors.birthDate.message}</Text>
            )}
          </View>

          {renderField('phone', 'Téléphone', '+216XXXXXXXX', { keyboard: 'phone-pad', optional: true })}
          {renderField('password_hash', 'Mot de passe', '••••••••', { secure: true })}
          {renderField('confirm', 'Confirmer mot de passe', '••••••••', { secure: true })}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.buttonText}>Inscrire</Text>}
          </TouchableOpacity>

          <Text style={styles.mutedText}>Vous avez déjà un compte ?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },
  scroll: { flexGrow: 1 },
  hero: { paddingTop: 70, paddingBottom: 28, alignItems: 'center' },
  heroTitle: { fontSize: 24, fontWeight: '800', color: colors.white },
  heroSub: { fontSize: 13, color: colors.muted },
  card: { flex: 1, backgroundColor: colors.bgLight, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22 },
  row: { flexDirection: 'row' },
  fieldWrap: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: colors.navy },
  labelOptional: { color: colors.muted },
  input: { backgroundColor: colors.white, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, padding: 12 },
  inputError: { borderColor: colors.red },
  errorMsg: { fontSize: 11, color: colors.red },
  button: { backgroundColor: colors.red, borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 10 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: colors.white, fontWeight: '800' },
  mutedText: { textAlign: 'center', color: colors.muted, marginTop: 20 },
  linkText: { textAlign: 'center', color: colors.red, fontWeight: '800', marginTop: 6 },
});