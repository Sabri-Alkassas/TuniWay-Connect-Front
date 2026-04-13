import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { clientAccountApi, parseApiError } from '../../api/client';
import { colors } from '../../theme/colors';
import type { UpdateClientAccountRequest } from '../../types/client';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  hint?: string;
}
function Field({ label, value, onChange, onBlur, error, placeholder, keyboardType = 'default', hint }: FieldProps) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={[f.input, !!error && f.inputError]}
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {!!hint && !error && <Text style={f.hint}>{hint}</Text>}
      {!!error && <Text style={f.error}>{error}</Text>}
    </View>
  );
}

const f = StyleSheet.create({
  wrap:       { marginBottom: 14 },
  label:      { fontSize: 12, fontWeight: '700', color: colors.navy, marginBottom: 6 },
  input:      { backgroundColor: colors.white, borderRadius: 13, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 13, fontSize: 13, fontWeight: '600', color: colors.navy },
  inputError: { borderColor: colors.red },
  error:      { fontSize: 11, color: colors.red, marginTop: 4 },
  hint:       { fontSize: 11, color: colors.muted, marginTop: 4 },
});

export function EditProfileScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { control, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', phone: '', birthDate: '' },
  });

  const loadAccount = useCallback(async () => {
    try {
      const res = await clientAccountApi.get();
      const acc = res.data.data;
      reset({
        firstName: acc.firstName ?? '',
        lastName: acc.lastName ?? '',
        phone: acc.phone ?? '',
        birthDate: acc.birthDate ?? '',
      });
      setError(null);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [reset]);

  useEffect(() => { loadAccount(); }, [loadAccount]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const body: UpdateClientAccountRequest = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
        birthDate: data.birthDate || undefined,
      };
      await clientAccountApi.update(body);
      setSuccess('Your profile has been updated.');
      navigation.goBack();
    } catch (err) {
      setError(parseApiError(err).message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={s.topTitle}>Edit Profile</Text>
        <TouchableOpacity
          style={[s.saveBtn, (!isDirty || saving) && s.saveBtnDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={!isDirty || saving}
          activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={s.saveBtnTxt}>Save</Text>}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.amber} size="large" />
        </View>
      ) : (
        <ScrollView style={s.body} contentContainerStyle={s.bodyContent} showsVerticalScrollIndicator={false}>
          {!!error && (
            <View style={s.errorBanner}>
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          )}

          {!!success && (
            <View style={s.successBanner}>
              <Text style={s.successTxt}>{success}</Text>
            </View>
          )}

          <Text style={s.sectionTitle}>Personal information</Text>

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="firstName"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Field
                    label="First name"
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    error={errors.firstName?.message}
                    placeholder="Ahmed"
                  />
                )}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="lastName"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Field
                    label="Last name"
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    error={errors.lastName?.message}
                    placeholder="Ben Ali"
                  />
                )}
              />
            </View>
          </View>

          <Controller
            control={control}
            name="phone"
            render={({ field: { value, onChange, onBlur } }) => (
              <Field
                label="Phone number"
                value={value ?? ''}
                onChange={onChange}
                onBlur={onBlur}
                error={errors.phone?.message}
                placeholder="+216 XX XXX XXX"
                keyboardType="phone-pad"
                hint="Used for account recovery"
              />
            )}
          />

          <Controller
            control={control}
            name="birthDate"
            render={({ field: { value, onChange, onBlur } }) => (
              <Field
                label="Date of birth"
                value={value ?? ''}
                onChange={onChange}
                onBlur={onBlur}
                error={errors.birthDate?.message}
                placeholder="YYYY-MM-DD"
                hint="Format: 1995-08-22"
              />
            )}
          />

          <View style={s.infoBanner}>
            <Text style={{ fontSize: 16 }}>ℹ️</Text>
            <Text style={s.infoTxt}>
              Email and password changes are not available from this screen yet.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.navy },
  topbar:       { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn:      { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  backTxt:      { fontSize: 22, color: colors.white, fontWeight: '700', lineHeight: 26 },
  topTitle:     { flex: 1, fontSize: 15, fontWeight: '800', color: colors.white, textAlign: 'center' },
  saveBtn:      { backgroundColor: colors.amber, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnDisabled:{ backgroundColor: 'rgba(245,166,35,0.4)' },
  saveBtnTxt:   { fontSize: 13, fontWeight: '800', color: colors.navy },
  centered:     { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  body:         { flex: 1, backgroundColor: colors.bg },
  bodyContent:  { padding: 14, paddingBottom: 32 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.navy, marginBottom: 14 },
  errorBanner:  { backgroundColor: colors.redLt, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1.5, borderColor: '#f1b5b5' },
  errorTxt:     { fontSize: 11, fontWeight: '700', color: colors.red },
  successBanner:{ backgroundColor: colors.greenLt, borderRadius: 12, padding: 12, marginBottom: 12 },
  successTxt:   { fontSize: 11, fontWeight: '700', color: '#27500A' },
  row:          { flexDirection: 'row', gap: 10 },
  infoBanner:   { backgroundColor: colors.blueLt, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8 },
  infoTxt:      { flex: 1, fontSize: 11, fontWeight: '700', color: '#0C447C', lineHeight: 17 },
});
