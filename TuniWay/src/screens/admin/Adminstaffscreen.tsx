import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { adminStaffApi }  from '../../api/admin';
import { colors }         from '../../theme/colors';
import type {
  StaffAccountResponse,
  StaffRole,
  StaffStatus,
  RegisterStaffBody,
  UpdateStaffBody,
} from '../../types/admin';


const FALLBACK_STAFF: StaffAccountResponse[] = [
  { id: '1', firstName: 'Karim',  lastName: 'Ben Ali',  email: 'karim@tuniway.tn',  role: 'EMPLOYEE', status: 'ACTIVE',    employeeCode: 'EMP001', licenseNumber: 'TN-2021-004', createdAt: '2024-01-10' },
  { id: '2', firstName: 'Sana',   lastName: 'Mejri',    email: 'sana@tuniway.tn',   role: 'EMPLOYEE', status: 'ACTIVE',    employeeCode: 'EMP002', licenseNumber: 'TN-2020-118', createdAt: '2024-02-14' },
  { id: '3', firstName: 'Rami',   lastName: 'Chatti',   email: 'rami@tuniway.tn',   role: 'ADMIN',    status: 'ACTIVE',    adminCode: 'ADM001',    createdAt: '2023-11-05' },
  { id: '4', firstName: 'Leila',  lastName: 'Boussaid', email: 'leila@tuniway.tn',  role: 'EMPLOYEE', status: 'INACTIVE',  employeeCode: 'EMP003', licenseNumber: 'TN-2019-077', createdAt: '2023-09-22' },
  { id: '5', firstName: 'Mehdi',  lastName: 'Slama',    email: 'mehdi@tuniway.tn',  role: 'EMPLOYEE', status: 'SUSPENDED', employeeCode: 'EMP004', licenseNumber: 'TN-2022-033', createdAt: '2024-03-01' },
];



const createSchema = z.object({
  firstName:    z.string().min(2, 'Minimum 2 characters'),
  lastName:     z.string().min(2, 'Minimum 2 characters'),
  email:        z.string().email('Invalid email'),
  password:     z.string().min(8, 'Minimum 8 characters'),
  role:         z.enum(['EMPLOYEE', 'ADMIN']),
  licenseNumber:z.string().optional(),
  employeeCode: z.string().optional(),
  adminCode:    z.string().optional(),
});

const editSchema = createSchema.omit({ password: true });

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData   = z.infer<typeof editSchema>;


function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

const STATUS_COLOR: Record<StaffStatus, string> = {
  ACTIVE:    colors.green,
  INACTIVE:  colors.muted,
  SUSPENDED: colors.red,
};

const ROLE_COLOR: Record<StaffRole, string> = {
  EMPLOYEE: colors.blue,
  ADMIN:    colors.amber,
};


interface FieldProps {
  label:          string;
  value:          string;
  onChange:       (v: string) => void;
  onBlur?:        () => void;
  error?:         string;
  placeholder?:   string;
  secure?:        boolean;
  keyboard?:      'default' | 'email-address' | 'number-pad';
  optional?:      boolean;
}

function Field({ label, value, onChange, onBlur, error, placeholder, secure, keyboard, optional }: FieldProps) {
  return (
    <View style={fStyles.wrap}>
      <Text style={fStyles.label}>{label}{optional ? ' (optional)' : ''}</Text>
      <TextInput
        style={[fStyles.input, !!error && fStyles.inputError]}
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secure}
        keyboardType={keyboard ?? 'default'}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {!!error && <Text style={fStyles.error}>{error}</Text>}
    </View>
  );
}

const fStyles = StyleSheet.create({
  wrap:       { marginBottom: 14 },
  label:      { fontSize: 12, fontWeight: '700', color: colors.navy, marginBottom: 6 },
  input:      { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: colors.navy },
  inputError: { borderColor: colors.red },
  error:      { fontSize: 11, color: colors.red, marginTop: 4 },
});


interface RoleSelectorProps {
  value:    StaffRole;
  onChange: (r: StaffRole) => void;
}

function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <View style={rStyles.row}>
      {(['EMPLOYEE', 'ADMIN'] as StaffRole[]).map((r) => (
        <TouchableOpacity
          key={r}
          style={[rStyles.chip, value === r && rStyles.chipOn]}
          onPress={() => onChange(r)}
          activeOpacity={0.8}
        >
          <Text style={[rStyles.chipTxt, value === r && rStyles.chipTxtOn]}>{r}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const rStyles = StyleSheet.create({
  row:      { flexDirection: 'row', gap: 10, marginBottom: 16 },
  chip:     { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white },
  chipOn:   { borderColor: colors.amber, backgroundColor: 'rgba(245,166,35,0.15)' },
  chipTxt:  { fontSize: 13, fontWeight: '700', color: colors.muted },
  chipTxtOn:{ color: colors.navy },
});


interface CreateModalProps {
  visible:  boolean;
  onClose:  () => void;
  onCreated:(staff: StaffAccountResponse) => void;
}

function CreateStaffModal({ visible, onClose, onCreated }: CreateModalProps) {
  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'EMPLOYEE' },
  });
  const role = watch('role');

  const onSubmit = async (data: CreateFormData) => {
    try {
      const body: RegisterStaffBody = {
        firstName: data.firstName,
        lastName:  data.lastName,
        email:     data.email,
        password:  data.password,
        role:      data.role,
        ...(data.role === 'EMPLOYEE' && {
          licenseNumber: data.licenseNumber,
          employeeCode:  data.employeeCode,
        }),
        ...(data.role === 'ADMIN' && {
          adminCode: data.adminCode,
        }),
      };
      const res = await adminStaffApi.create(body);
      onCreated(res.data);
      reset();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to create account');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={mStyles.safe}>
        <View style={mStyles.header}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }} style={mStyles.closeBtn}>
            <Text style={mStyles.closeTxt}>✕</Text>
          </TouchableOpacity>
          <Text style={mStyles.title}>New Staff Account</Text>
          <TouchableOpacity onPress={handleSubmit(onSubmit)} style={mStyles.saveBtn}>
            <Text style={mStyles.saveTxt}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={mStyles.body} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          <Text style={fStyles.label}>Role</Text>
          <Controller
            control={control} name="role"
            render={({ field: { value, onChange } }) => (
              <RoleSelector value={value} onChange={onChange} />
            )}
          />

          <Controller control={control} name="firstName"
            render={({ field: { value, onChange, onBlur } }) => (
              <Field label="First Name" value={value ?? ''} onChange={onChange} onBlur={onBlur} error={errors.firstName?.message} placeholder="Ahmed" />
            )}
          />
          <Controller control={control} name="lastName"
            render={({ field: { value, onChange, onBlur } }) => (
              <Field label="Last Name" value={value ?? ''} onChange={onChange} onBlur={onBlur} error={errors.lastName?.message} placeholder="Ben Ali" />
            )}
          />
          <Controller control={control} name="email"
            render={({ field: { value, onChange, onBlur } }) => (
              <Field label="Email" value={value ?? ''} onChange={onChange} onBlur={onBlur} error={errors.email?.message} placeholder="name@tuniway.tn" keyboard="email-address" />
            )}
          />
          <Controller control={control} name="password"
            render={({ field: { value, onChange, onBlur } }) => (
              <Field label="Password" value={value ?? ''} onChange={onChange} onBlur={onBlur} error={errors.password?.message} placeholder="Min. 8 characters" secure />
            )}
          />

          {role === 'EMPLOYEE' && (
            <>
              <Controller control={control} name="employeeCode"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Field label="Employee Code" value={value ?? ''} onChange={onChange} onBlur={onBlur} error={errors.employeeCode?.message} placeholder="EMP001" optional />
                )}
              />
              <Controller control={control} name="licenseNumber"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Field label="License Number" value={value ?? ''} onChange={onChange} onBlur={onBlur} error={errors.licenseNumber?.message} placeholder="TN-2024-001" optional />
                )}
              />
            </>
          )}
          {role === 'ADMIN' && (
            <Controller control={control} name="adminCode"
              render={({ field: { value, onChange, onBlur } }) => (
                <Field label="Admin Code" value={value ?? ''} onChange={onChange} onBlur={onBlur} error={errors.adminCode?.message} placeholder="ADM001" optional />
              )}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}



interface EditModalProps {
  visible:  boolean;
  staff:    StaffAccountResponse;
  onClose:  () => void;
  onSaved:  (updated: StaffAccountResponse) => void;
}

function EditStaffModal({ visible, staff, onClose, onSaved }: EditModalProps) {
  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      firstName:    staff.firstName,
      lastName:     staff.lastName,
      email:        staff.email,
      role:         staff.role,
      licenseNumber:staff.licenseNumber ?? '',
      employeeCode: staff.employeeCode  ?? '',
      adminCode:    staff.adminCode     ?? '',
    },
  });
  const role = watch('role');


  useEffect(() => {
    reset({
      firstName:    staff.firstName,
      lastName:     staff.lastName,
      email:        staff.email,
      role:         staff.role,
      licenseNumber:staff.licenseNumber ?? '',
      employeeCode: staff.employeeCode  ?? '',
      adminCode:    staff.adminCode     ?? '',
    });
  }, [
    reset,
    staff.adminCode,
    staff.email,
    staff.employeeCode,
    staff.firstName,
    staff.lastName,
    staff.licenseNumber,
    staff.role,
  ]);

  const onSubmit = async (data: EditFormData) => {
    try {
      const body: UpdateStaffBody = {
        firstName: data.firstName,
        lastName:  data.lastName,
        email:     data.email,
        role:      data.role,
        ...(data.role === 'EMPLOYEE' && {
          licenseNumber: data.licenseNumber,
          employeeCode:  data.employeeCode,
        }),
        ...(data.role === 'ADMIN' && {
          adminCode: data.adminCode,
        }),
      };
      const res = await adminStaffApi.update(staff.id, body);
      onSaved(res.data);
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to update');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={mStyles.safe}>
        <View style={mStyles.header}>
          <TouchableOpacity onPress={onClose} style={mStyles.closeBtn}>
            <Text style={mStyles.closeTxt}>✕</Text>
          </TouchableOpacity>
          <Text style={mStyles.title}>Edit Staff</Text>
          <TouchableOpacity onPress={handleSubmit(onSubmit)} style={mStyles.saveBtn}>
            <Text style={mStyles.saveTxt}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={mStyles.body} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          <Text style={fStyles.label}>Role</Text>
          <Controller
            control={control} name="role"
            render={({ field: { value, onChange } }) => (
              <RoleSelector value={value} onChange={onChange} />
            )}
          />
          <Controller control={control} name="firstName"
            render={({ field: { value, onChange, onBlur } }) => (
              <Field label="First Name" value={value ?? ''} onChange={onChange} onBlur={onBlur} error={errors.firstName?.message} />
            )}
          />
          <Controller control={control} name="lastName"
            render={({ field: { value, onChange, onBlur } }) => (
              <Field label="Last Name" value={value ?? ''} onChange={onChange} onBlur={onBlur} error={errors.lastName?.message} />
            )}
          />
          <Controller control={control} name="email"
            render={({ field: { value, onChange, onBlur } }) => (
              <Field label="Email" value={value ?? ''} onChange={onChange} onBlur={onBlur} error={errors.email?.message} keyboard="email-address" />
            )}
          />
          {role === 'EMPLOYEE' && (
            <>
              <Controller control={control} name="employeeCode"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Field label="Employee Code" value={value ?? ''} onChange={onChange} onBlur={onBlur} optional />
                )}
              />
              <Controller control={control} name="licenseNumber"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Field label="License Number" value={value ?? ''} onChange={onChange} onBlur={onBlur} optional />
                )}
              />
            </>
          )}
          {role === 'ADMIN' && (
            <Controller control={control} name="adminCode"
              render={({ field: { value, onChange, onBlur } }) => (
                <Field label="Admin Code" value={value ?? ''} onChange={onChange} onBlur={onBlur} optional />
              )}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const mStyles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: colors.bgLight },
  header:   { backgroundColor: colors.navy, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'space-between' },
  closeBtn: { width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 14, color: colors.white, fontWeight: '700' },
  title:    { fontSize: 15, fontWeight: '800', color: colors.white, flex: 1, textAlign: 'center' },
  saveBtn:  { backgroundColor: colors.red, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  saveTxt:  { fontSize: 12, fontWeight: '800', color: colors.white },
  body:     { flex: 1 },
});



interface StaffCardProps {
  staff:        StaffAccountResponse;
  onEdit:       () => void;
  onToggle:     () => void;
  onDelete:     () => void;
}

function StaffCard({ staff, onEdit, onToggle, onDelete }: StaffCardProps) {
  return (
    <View style={cStyles.card}>
      <View style={cStyles.row}>
        <View style={[cStyles.avatar, { backgroundColor: ROLE_COLOR[staff.role] }]}>
          <Text style={cStyles.avatarTxt}>{initials(staff.firstName, staff.lastName)}</Text>
        </View>
        <View style={cStyles.info}>
          <Text style={cStyles.name}>{staff.firstName} {staff.lastName}</Text>
          <Text style={cStyles.email}>{staff.email}</Text>
          <View style={cStyles.badges}>
            <View style={[cStyles.badge, { backgroundColor: ROLE_COLOR[staff.role] + '22' }]}>
              <Text style={[cStyles.badgeTxt, { color: ROLE_COLOR[staff.role] }]}>{staff.role}</Text>
            </View>
            <View style={[cStyles.badge, { backgroundColor: STATUS_COLOR[staff.status] + '22' }]}>
              <Text style={[cStyles.badgeTxt, { color: STATUS_COLOR[staff.status] }]}>{staff.status}</Text>
            </View>
          </View>
        </View>
      </View>

      {(staff.employeeCode || staff.licenseNumber || staff.adminCode) && (
        <View style={cStyles.codes}>
          {staff.employeeCode  && <Text style={cStyles.code}>Code: {staff.employeeCode}</Text>}
          {staff.licenseNumber && <Text style={cStyles.code}>License: {staff.licenseNumber}</Text>}
          {staff.adminCode     && <Text style={cStyles.code}>Admin: {staff.adminCode}</Text>}
        </View>
      )}

      <View style={cStyles.actions}>
        <TouchableOpacity style={cStyles.btn} onPress={onEdit} activeOpacity={0.8}>
          <Text style={cStyles.btnTxt}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[cStyles.btn, { borderColor: staff.status === 'ACTIVE' ? colors.red : colors.green }]}
          onPress={onToggle}
          activeOpacity={0.8}
        >
          <Text style={[cStyles.btnTxt, { color: staff.status === 'ACTIVE' ? colors.red : colors.green }]}>
            {staff.status === 'ACTIVE' ? '⏸ Deactivate' : '▶ Activate'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={cStyles.deleteBtn} onPress={onDelete} activeOpacity={0.8}>
          <Text>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cStyles = StyleSheet.create({
  card:      { backgroundColor: colors.white, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: colors.border },
  row:       { flexDirection: 'row', gap: 12, marginBottom: 10 },
  avatar:    { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarTxt: { fontSize: 16, fontWeight: '800', color: colors.white },
  info:      { flex: 1 },
  name:      { fontSize: 13, fontWeight: '700', color: colors.navy },
  email:     { fontSize: 11, color: colors.muted, marginTop: 2 },
  badges:    { flexDirection: 'row', gap: 6, marginTop: 6 },
  badge:     { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt:  { fontSize: 10, fontWeight: '700' },
  codes:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, backgroundColor: colors.bgLight, borderRadius: 8, padding: 8, marginBottom: 10 },
  code:      { fontSize: 10, fontWeight: '700', color: colors.muted },
  actions:   { flexDirection: 'row', gap: 8 },
  btn:       { flex: 1, backgroundColor: colors.bgLight, borderRadius: 10, paddingVertical: 9, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border },
  btnTxt:    { fontSize: 11, fontWeight: '700', color: colors.navy },
  deleteBtn: { width: 40, backgroundColor: '#ffe8e3', borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border },
});


export function AdminStaffScreen() {
  const [staff, setStaff]         = useState<StaffAccountResponse[]>(FALLBACK_STAFF);
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | StaffRole>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffAccountResponse | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await adminStaffApi.list();
      setStaff(res.data);
    } catch { }
    finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = staff.filter((s) => {
    const matchRole = roleFilter === 'ALL' || s.role === roleFilter;
    const term = search.toLowerCase();
    const matchSearch = !term
      || s.firstName.toLowerCase().includes(term)
      || s.lastName.toLowerCase().includes(term)
      || s.email.toLowerCase().includes(term);
    return matchRole && matchSearch;
  });

  const handleToggle = (s: StaffAccountResponse) => {
    const next: StaffStatus = s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    Alert.alert(
      'Change Status',
      `Set ${s.firstName} ${s.lastName} to ${next}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: async () => {
          try {
            await adminStaffApi.setStatus(s.id, { status: next });
            setStaff((prev) => prev.map((x) => x.id === s.id ? { ...x, status: next } : x));
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message ?? 'Failed to update staff status');
          }
        }},
      ]
    );
  };

  const handleDelete = (s: StaffAccountResponse) => {
    Alert.alert(
      'Delete Account',
      `Delete ${s.firstName} ${s.lastName}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await adminStaffApi.remove(s.id);
            setStaff((prev) => prev.filter((x) => x.id !== s.id));
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message ?? 'Failed to delete account');
          }
        }},
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>


      <View style={styles.topbar}>
        <View>
          <Text style={styles.topTitle}>Staff Accounts</Text>
          <Text style={styles.topSub}>
            {staff.length} total · {staff.filter((s) => s.status === 'ACTIVE').length} active
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setCreateOpen(true)} activeOpacity={0.8}>
          <Text style={styles.addBtnTxt}>+ Add</Text>
        </TouchableOpacity>
      </View>


      <View style={styles.searchRow}>
        <Text>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search staff…"
          placeholderTextColor={colors.muted}
          autoCorrect={false}
        />
      </View>


      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {(['ALL', 'EMPLOYEE', 'ADMIN'] as const).map((r) => (
          <TouchableOpacity key={r} style={[styles.chip, roleFilter === r && styles.chipOn]} onPress={() => setRoleFilter(r)}>
            <Text style={[styles.chipTxt, roleFilter === r && styles.chipTxtOn]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.amber} />
        }
      >
        {loading ? (
          <ActivityIndicator color={colors.amber} style={{ marginTop: 48 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyTxt}>No staff found</Text></View>
        ) : (
          filtered.map((s) => (
            <StaffCard
              key={s.id}
              staff={s}
              onEdit={() => setEditTarget(s)}
              onToggle={() => handleToggle(s)}
              onDelete={() => handleDelete(s)}
            />
          ))
        )}
      </ScrollView>

      <CreateStaffModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(created) => setStaff((prev) => [...prev, created])}
      />

      {editTarget && (
        <EditStaffModal
          visible={!!editTarget}
          staff={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(updated) => {
            setStaff((prev) => prev.map((s) => s.id === updated.id ? updated : s));
            setEditTarget(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.navy },
  topbar:       { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle:     { fontSize: 15, fontWeight: '800', color: colors.white },
  topSub:       { fontSize: 10, color: colors.muted, marginTop: 1 },
  addBtn:       { backgroundColor: colors.red, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnTxt:    { fontSize: 12, fontWeight: '800', color: colors.white },
  searchRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, marginHorizontal: 12, marginTop: 8, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1.5, borderColor: colors.border, gap: 8 },
  searchInput:  { flex: 1, fontSize: 12, color: colors.navy },
  filterBar:    { marginTop: 8, marginBottom: 4, flexGrow: 0 },
  filterContent:{ paddingHorizontal: 12, gap: 6, flexDirection: 'row' },
  chip:         { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.12)' },
  chipOn:       { backgroundColor: colors.amber },
  chipTxt:      { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  chipTxtOn:    { color: colors.navy },
  body:         { flex: 1, backgroundColor: colors.bgLight, marginTop: 8 },
  bodyContent:  { padding: 12, paddingBottom: 24 },
  empty:        { alignItems: 'center', marginTop: 60 },
  emptyTxt:     { fontSize: 14, color: colors.muted },
});
