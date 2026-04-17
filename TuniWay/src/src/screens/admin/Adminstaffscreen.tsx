import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { adminStaffApi } from '../../api/admin';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/colors';
import type { StaffAccountResponse, StaffRole, StaffStatus, RegisterStaffBody, UpdateStaffBody } from '../../types/admin';

const FALLBACK_STAFF: StaffAccountResponse[] = [
  { id: '1', firstName: 'Karim', lastName: 'Ben Ali', email: 'karim@tuniway.tn', role: 'EMPLOYEE', status: 'ACTIVE', employeeCode: 'EMP001', licenseNumber: 'TN-2021-004', createdAt: '2024-01-10' },
  { id: '2', firstName: 'Sana', lastName: 'Mejri', email: 'sana@tuniway.tn', role: 'EMPLOYEE', status: 'ACTIVE', employeeCode: 'EMP002', licenseNumber: 'TN-2020-118', createdAt: '2024-02-14' },
  { id: '3', firstName: 'Rami', lastName: 'Chatti', email: 'rami@tuniway.tn', role: 'ADMIN', status: 'ACTIVE', adminCode: 'ADM001', createdAt: '2023-11-05' },
  { id: '4', firstName: 'Leila', lastName: 'Boussaid', email: 'leila@tuniway.tn', role: 'EMPLOYEE', status: 'INACTIVE', employeeCode: 'EMP003', licenseNumber: 'TN-2019-077', createdAt: '2023-09-22' },
];

const createSchema = z.object({
  firstName: z.string().min(2, 'Minimum 2 caracteres'),
  lastName: z.string().min(2, 'Minimum 2 caracteres'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caracteres'),
  role: z.enum(['EMPLOYEE', 'ADMIN']),
  licenseNumber: z.string().optional(),
  employeeCode: z.string().optional(),
  adminCode: z.string().optional(),
});
const editSchema = createSchema.omit({ password: true });
type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;

function getRoleLabel(role: StaffRole) {
  return role === 'EMPLOYEE' ? 'Employe' : 'Admin';
}
function getStatusLabel(status: StaffStatus) {
  const labels: Record<StaffStatus, string> = { ACTIVE: 'Actif', INACTIVE: 'Inactif', SUSPENDED: 'Suspendu' };
  return labels[status];
}
function getTwoFactorLabel(enabled?: boolean) {
  return enabled ? '2FA activee' : '2FA inactive';
}
function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

const STATUS_COLOR: Record<StaffStatus, string> = { ACTIVE: colors.green, INACTIVE: colors.muted, SUSPENDED: colors.red };
const ROLE_COLOR: Record<StaffRole, string> = { EMPLOYEE: colors.blue, ADMIN: colors.amber };
const TWO_FACTOR_COLOR = colors.green;

function Field({ label, value, onChange, onBlur, error, placeholder, secure, keyboard, optional }: {
  label: string; value: string; onChange: (v: string) => void; onBlur?: () => void; error?: string; placeholder?: string; secure?: boolean; keyboard?: 'default' | 'email-address'; optional?: boolean;
}) {
  return (
    <View style={fStyles.wrap}>
      <Text style={fStyles.label}>{label}{optional ? ' (optionnel)' : ''}</Text>
      <TextInput style={[fStyles.input, !!error && fStyles.inputError]} value={value} onChangeText={onChange} onBlur={onBlur} placeholder={placeholder} placeholderTextColor={colors.muted} secureTextEntry={secure} keyboardType={keyboard ?? 'default'} autoCapitalize="none" autoCorrect={false} />
      {!!error && <Text style={fStyles.error}>{error}</Text>}
    </View>
  );
}

function RoleSelector({ value, onChange }: { value: StaffRole; onChange: (r: StaffRole) => void }) {
  return (
    <View style={rStyles.row}>
      {(['EMPLOYEE', 'ADMIN'] as StaffRole[]).map((r) => (
        <TouchableOpacity key={r} style={[rStyles.chip, value === r && rStyles.chipOn]} onPress={() => onChange(r)} activeOpacity={0.8}>
          <Text style={[rStyles.chipTxt, value === r && rStyles.chipTxtOn]}>{getRoleLabel(r)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function CreateStaffModal({ visible, onClose, onCreated }: {
  visible: boolean; onClose: () => void; onCreated: (staff: StaffAccountResponse) => void;
}) {
  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<CreateFormData>({ resolver: zodResolver(createSchema), defaultValues: { role: 'EMPLOYEE' } });
  const role = watch('role');
  const onSubmit = async (data: CreateFormData) => {
    try {
      const body: RegisterStaffBody = { firstName: data.firstName, lastName: data.lastName, email: data.email, password: data.password, role: data.role, ...(data.role === 'EMPLOYEE' && { licenseNumber: data.licenseNumber, employeeCode: data.employeeCode }), ...(data.role === 'ADMIN' && { adminCode: data.adminCode }) };
      const res = await adminStaffApi.create(body);
      onCreated(res.data);
      if (res.data.twoFactorSecret) {
        const setupHint = res.data.twoFactorSetupUri
          ? `URI de configuration :\n${res.data.twoFactorSetupUri}\n\n`
          : '';
        Alert.alert(
          '2FA activee',
          `Le compte a ete cree avec la 2FA activee.\n\nSecret TOTP : ${res.data.twoFactorSecret}\n\n${setupHint}Transmettez ces informations au membre du personnel pour configurer son application d'authentification avant sa premiere connexion.`
        );
      }
      reset();
      onClose();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message ?? 'Echec de la creation du compte');
    }
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={mStyles.safe}>
        <View style={mStyles.header}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }} style={mStyles.closeBtn}><AppIcon family="Feather" name="x" size={16} color={colors.white} /></TouchableOpacity>
          <Text style={mStyles.title}>Nouveau compte agent</Text>
          <TouchableOpacity onPress={handleSubmit(onSubmit)} style={mStyles.saveBtn}><Text style={mStyles.saveTxt}>Enregistrer</Text></TouchableOpacity>
        </View>
        <ScrollView style={mStyles.body} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          <Text style={fStyles.label}>Role</Text>
          <Controller control={control} name="role" render={({ field: { value, onChange } }) => <RoleSelector value={value} onChange={onChange} />} />
          <Controller control={control} name="firstName" render={({ field: { value, onChange, onBlur } }) => <Field label="Prenom" value={value ?? ''} onChange={onChange} onBlur={onBlur} error={errors.firstName?.message} placeholder="Ahmed" />} />
          <Controller control={control} name="lastName" render={({ field: { value, onChange, onBlur } }) => <Field label="Nom" value={value ?? ''} onChange={onChange} onBlur={onBlur} error={errors.lastName?.message} placeholder="Ben Ali" />} />
          <Controller control={control} name="email" render={({ field: { value, onChange, onBlur } }) => <Field label="Email" value={value ?? ''} onChange={onChange} onBlur={onBlur} error={errors.email?.message} placeholder="nom@tuniway.tn" keyboard="email-address" />} />
          <Controller control={control} name="password" render={({ field: { value, onChange, onBlur } }) => <Field label="Mot de passe" value={value ?? ''} onChange={onChange} onBlur={onBlur} error={errors.password?.message} placeholder="Min. 8 caracteres" secure />} />
          {role === 'EMPLOYEE' && <>
            <Controller control={control} name="employeeCode" render={({ field: { value, onChange, onBlur } }) => <Field label="Code employe" value={value ?? ''} onChange={onChange} onBlur={onBlur} error={errors.employeeCode?.message} placeholder="EMP001" optional />} />
            <Controller control={control} name="licenseNumber" render={({ field: { value, onChange, onBlur } }) => <Field label="Numero de permis" value={value ?? ''} onChange={onChange} onBlur={onBlur} error={errors.licenseNumber?.message} placeholder="TN-2024-001" optional />} />
          </>}
          {role === 'ADMIN' && <Controller control={control} name="adminCode" render={({ field: { value, onChange, onBlur } }) => <Field label="Code admin" value={value ?? ''} onChange={onChange} onBlur={onBlur} error={errors.adminCode?.message} placeholder="ADM001" optional />} />}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function EditStaffModal({ visible, staff, onClose, onSaved }: {
  visible: boolean; staff: StaffAccountResponse; onClose: () => void; onSaved: (updated: StaffAccountResponse) => void;
}) {
  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: { firstName: staff.firstName, lastName: staff.lastName, email: staff.email, role: staff.role, licenseNumber: staff.licenseNumber ?? '', employeeCode: staff.employeeCode ?? '', adminCode: staff.adminCode ?? '' },
  });
  const role = watch('role');
  useEffect(() => { reset({ firstName: staff.firstName, lastName: staff.lastName, email: staff.email, role: staff.role, licenseNumber: staff.licenseNumber ?? '', employeeCode: staff.employeeCode ?? '', adminCode: staff.adminCode ?? '' }); }, [reset, staff]);
  const onSubmit = async (data: EditFormData) => {
    try {
      const body: UpdateStaffBody = { firstName: data.firstName, lastName: data.lastName, email: data.email, role: data.role, ...(data.role === 'EMPLOYEE' && { licenseNumber: data.licenseNumber, employeeCode: data.employeeCode }), ...(data.role === 'ADMIN' && { adminCode: data.adminCode }) };
      const res = await adminStaffApi.update(staff.id, body);
      onSaved(res.data);
      onClose();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message ?? 'Echec de la mise a jour');
    }
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={mStyles.safe}>
        <View style={mStyles.header}>
          <TouchableOpacity onPress={onClose} style={mStyles.closeBtn}><AppIcon family="Feather" name="x" size={16} color={colors.white} /></TouchableOpacity>
          <Text style={mStyles.title}>Modifier un agent</Text>
          <TouchableOpacity onPress={handleSubmit(onSubmit)} style={mStyles.saveBtn}><Text style={mStyles.saveTxt}>Enregistrer</Text></TouchableOpacity>
        </View>
        <ScrollView style={mStyles.body} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          <Text style={fStyles.label}>Role</Text>
          <Controller control={control} name="role" render={({ field: { value, onChange } }) => <RoleSelector value={value} onChange={onChange} />} />
          <Controller control={control} name="firstName" render={({ field: { value, onChange, onBlur } }) => <Field label="Prenom" value={value ?? ''} onChange={onChange} onBlur={onBlur} error={errors.firstName?.message} />} />
          <Controller control={control} name="lastName" render={({ field: { value, onChange, onBlur } }) => <Field label="Nom" value={value ?? ''} onChange={onChange} onBlur={onBlur} error={errors.lastName?.message} />} />
          <Controller control={control} name="email" render={({ field: { value, onChange, onBlur } }) => <Field label="Email" value={value ?? ''} onChange={onChange} onBlur={onBlur} error={errors.email?.message} keyboard="email-address" />} />
          {role === 'EMPLOYEE' && <>
            <Controller control={control} name="employeeCode" render={({ field: { value, onChange, onBlur } }) => <Field label="Code employe" value={value ?? ''} onChange={onChange} onBlur={onBlur} optional />} />
            <Controller control={control} name="licenseNumber" render={({ field: { value, onChange, onBlur } }) => <Field label="Numero de permis" value={value ?? ''} onChange={onChange} onBlur={onBlur} optional />} />
          </>}
          {role === 'ADMIN' && <Controller control={control} name="adminCode" render={({ field: { value, onChange, onBlur } }) => <Field label="Code admin" value={value ?? ''} onChange={onChange} onBlur={onBlur} optional />} />}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function StaffCard({ staff, onEdit, onToggle, onDelete }: {
  staff: StaffAccountResponse; onEdit: () => void; onToggle: () => void; onDelete: () => void;
}) {
  return (
    <View style={cStyles.card}>
      <View style={cStyles.row}>
        <View style={[cStyles.avatar, { backgroundColor: ROLE_COLOR[staff.role] }]}><Text style={cStyles.avatarTxt}>{initials(staff.firstName, staff.lastName)}</Text></View>
        <View style={cStyles.info}>
          <Text style={cStyles.name}>{staff.firstName} {staff.lastName}</Text>
          <Text style={cStyles.email}>{staff.email}</Text>
          <View style={cStyles.badges}>
            <View style={[cStyles.badge, { backgroundColor: ROLE_COLOR[staff.role] + '22' }]}><Text style={[cStyles.badgeTxt, { color: ROLE_COLOR[staff.role] }]}>{getRoleLabel(staff.role)}</Text></View>
            <View style={[cStyles.badge, { backgroundColor: STATUS_COLOR[staff.status] + '22' }]}><Text style={[cStyles.badgeTxt, { color: STATUS_COLOR[staff.status] }]}>{getStatusLabel(staff.status)}</Text></View>
            <View style={[cStyles.badge, { backgroundColor: TWO_FACTOR_COLOR + '22' }]}><Text style={[cStyles.badgeTxt, { color: TWO_FACTOR_COLOR }]}>{getTwoFactorLabel(staff.twoFactorEnabled)}</Text></View>
          </View>
        </View>
      </View>
      {(staff.employeeCode || staff.licenseNumber || staff.adminCode) && <View style={cStyles.codes}>
        {staff.employeeCode && <Text style={cStyles.code}>Code : {staff.employeeCode}</Text>}
        {staff.licenseNumber && <Text style={cStyles.code}>Permis : {staff.licenseNumber}</Text>}
        {staff.adminCode && <Text style={cStyles.code}>Admin : {staff.adminCode}</Text>}
      </View>}
      <View style={cStyles.actions}>
        <TouchableOpacity style={cStyles.btn} onPress={onEdit} activeOpacity={0.8}><View style={cStyles.btnInner}><AppIcon family="Feather" name="edit-2" size={13} color={colors.navy} /><Text style={cStyles.btnTxt}>Modifier</Text></View></TouchableOpacity>
        <TouchableOpacity style={[cStyles.btn, { borderColor: staff.status === 'ACTIVE' ? colors.red : colors.green }]} onPress={onToggle} activeOpacity={0.8}><View style={cStyles.btnInner}><AppIcon family="Feather" name={staff.status === 'ACTIVE' ? 'pause-circle' : 'play-circle'} size={13} color={staff.status === 'ACTIVE' ? colors.red : colors.green} /><Text style={[cStyles.btnTxt, { color: staff.status === 'ACTIVE' ? colors.red : colors.green }]}>{staff.status === 'ACTIVE' ? 'Desactiver' : 'Activer'}</Text></View></TouchableOpacity>
        <TouchableOpacity style={cStyles.deleteBtn} onPress={onDelete} activeOpacity={0.8}><AppIcon family="Feather" name="trash-2" size={14} color={colors.red} /></TouchableOpacity>
      </View>
    </View>
  );
}

export function AdminStaffScreen() {
  const [staff, setStaff] = useState<StaffAccountResponse[]>(FALLBACK_STAFF);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | StaffRole>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffAccountResponse | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try { const res = await adminStaffApi.list(); setStaff(res.data); } catch { } finally { if (isRefresh) setRefreshing(false); else setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = staff.filter((s) => {
    const matchRole = roleFilter === 'ALL' || s.role === roleFilter;
    const term = search.toLowerCase();
    const matchSearch = !term || s.firstName.toLowerCase().includes(term) || s.lastName.toLowerCase().includes(term) || s.email.toLowerCase().includes(term);
    return matchRole && matchSearch;
  });

  const handleToggle = (s: StaffAccountResponse) => {
    const next: StaffStatus = s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    Alert.alert('Changer le statut', `Passer ${s.firstName} ${s.lastName} en ${getStatusLabel(next).toLowerCase()} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: async () => { try { await adminStaffApi.setStatus(s.id, { status: next }); setStaff((prev) => prev.map((x) => x.id === s.id ? { ...x, status: next } : x)); } catch (err: any) { Alert.alert('Erreur', err?.response?.data?.message ?? 'Echec de la mise a jour du statut'); } } },
    ]);
  };
  const handleDelete = (s: StaffAccountResponse) => {
    Alert.alert('Supprimer le compte', `Supprimer ${s.firstName} ${s.lastName} ? Cette action est irreversible.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => { try { await adminStaffApi.remove(s.id); setStaff((prev) => prev.filter((x) => x.id !== s.id)); } catch (err: any) { Alert.alert('Erreur', err?.response?.data?.message ?? 'Echec de la suppression du compte'); } } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topbar}>
        <View><Text style={styles.topTitle}>Comptes du personnel</Text><Text style={styles.topSub}>{staff.length} au total - {staff.filter((s) => s.status === 'ACTIVE').length} actifs</Text></View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setCreateOpen(true)} activeOpacity={0.8}><View style={styles.addBtnInner}><AppIcon family="Feather" name="plus" size={14} color={colors.white} /><Text style={styles.addBtnTxt}>Ajouter</Text></View></TouchableOpacity>
      </View>
      <View style={styles.searchRow}><AppIcon family="Feather" name="search" size={15} color={colors.muted} /><TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Rechercher un agent..." placeholderTextColor={colors.muted} autoCorrect={false} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {(['ALL', 'EMPLOYEE', 'ADMIN'] as const).map((r) => <TouchableOpacity key={r} style={[styles.chip, roleFilter === r && styles.chipOn]} onPress={() => setRoleFilter(r)}><Text style={[styles.chipTxt, roleFilter === r && styles.chipTxtOn]}>{r === 'ALL' ? 'Tous' : getRoleLabel(r)}</Text></TouchableOpacity>)}
      </ScrollView>
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.amber} />}>
        {loading ? <ActivityIndicator color={colors.amber} style={{ marginTop: 48 }} /> : filtered.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTxt}>Aucun agent trouve</Text></View> : filtered.map((s) => <StaffCard key={s.id} staff={s} onEdit={() => setEditTarget(s)} onToggle={() => handleToggle(s)} onDelete={() => handleDelete(s)} />)}
      </ScrollView>
      <CreateStaffModal visible={createOpen} onClose={() => setCreateOpen(false)} onCreated={(created) => setStaff((prev) => [...prev, created])} />
      {editTarget && <EditStaffModal visible={!!editTarget} staff={editTarget} onClose={() => setEditTarget(null)} onSaved={(updated) => { setStaff((prev) => prev.map((s) => s.id === updated.id ? updated : s)); setEditTarget(null); }} />}
    </SafeAreaView>
  );
}

const fStyles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: colors.navy, marginBottom: 6 },
  input: { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: colors.navy },
  inputError: { borderColor: colors.red },
  error: { fontSize: 11, color: colors.red, marginTop: 4 },
});
const rStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  chip: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white },
  chipOn: { borderColor: colors.amber, backgroundColor: 'rgba(245,166,35,0.15)' },
  chipTxt: { fontSize: 13, fontWeight: '700', color: colors.muted },
  chipTxtOn: { color: colors.navy },
});
const mStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgLight },
  header: { backgroundColor: colors.navy, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'space-between' },
  closeBtn: { width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '800', color: colors.white, flex: 1, textAlign: 'center' },
  saveBtn: { backgroundColor: colors.red, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  saveTxt: { fontSize: 12, fontWeight: '800', color: colors.white },
  body: { flex: 1 },
});
const cStyles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: colors.border },
  row: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  avatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarTxt: { fontSize: 16, fontWeight: '800', color: colors.white },
  info: { flex: 1 },
  name: { fontSize: 13, fontWeight: '700', color: colors.navy },
  email: { fontSize: 11, color: colors.muted, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 6 },
  badge: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
  codes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, backgroundColor: colors.bgLight, borderRadius: 8, padding: 8, marginBottom: 10 },
  code: { fontSize: 10, fontWeight: '700', color: colors.muted },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, backgroundColor: colors.bgLight, borderRadius: 10, paddingVertical: 9, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnTxt: { fontSize: 11, fontWeight: '700', color: colors.navy },
  deleteBtn: { width: 40, backgroundColor: '#ffe8e3', borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border },
});
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  topbar: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { fontSize: 15, fontWeight: '800', color: colors.white },
  topSub: { fontSize: 10, color: colors.muted, marginTop: 1 },
  addBtn: { backgroundColor: colors.red, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addBtnTxt: { fontSize: 12, fontWeight: '800', color: colors.white },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, marginHorizontal: 12, marginTop: 8, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1.5, borderColor: colors.border, gap: 8 },
  searchInput: { flex: 1, fontSize: 12, color: colors.navy },
  filterBar: { marginTop: 8, marginBottom: 4, flexGrow: 0 },
  filterContent: { paddingHorizontal: 12, gap: 6, flexDirection: 'row' },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.12)' },
  chipOn: { backgroundColor: colors.amber },
  chipTxt: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  chipTxtOn: { color: colors.navy },
  body: { flex: 1, backgroundColor: colors.bgLight, marginTop: 8 },
  bodyContent: { padding: 12, paddingBottom: 24 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyTxt: { fontSize: 14, color: colors.muted },
});
