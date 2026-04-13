import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { adminShiftApi, adminPlanningApi, adminTransportApi } from '../../api/admin';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/colors';
import type {
  AdminShiftResponse,
  ShiftStatus,
  UpdateShiftBody,
  ReassignTransportBody,
  TransportResponse,
} from '../../types/admin';

const FALLBACK: AdminShiftResponse[] = [
  { id: 's1', employeeId: 'e1', employeeName: 'Karim Ben Ali', transportId: 't1', transportName: 'Ligne 5 - Lac vers Bardo', startTime: '2026-04-11T06:00:00', endTime: '2026-04-11T14:00:00', status: 'ACTIVE' },
  { id: 's2', employeeId: 'e2', employeeName: 'Sana Mejri', transportId: 't2', transportName: 'Metro 2 - Ariana', startTime: '2026-04-11T07:30:00', endTime: '2026-04-11T15:30:00', status: 'ACTIVE' },
  { id: 's3', employeeId: 'e4', employeeName: 'Leila Boussaid', transportId: 't4', transportName: 'Tram T1 - Centre', startTime: '2026-04-11T14:00:00', endTime: '2026-04-11T22:00:00', status: 'SCHEDULED' },
  { id: 's4', employeeId: 'e5', employeeName: 'Mehdi Slama', transportId: 't1', transportName: 'Ligne 5 - Lac vers Bardo', startTime: '2026-04-11T22:00:00', endTime: '2026-04-12T06:00:00', status: 'SCHEDULED' },
  { id: 's5', employeeId: 'e3', employeeName: 'Rami Chatti', transportId: 't3', transportName: 'Ligne 8 - Bab Bhar', startTime: '2026-04-10T06:00:00', endTime: '2026-04-10T14:00:00', status: 'COMPLETED' },
];

const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
const updateShiftSchema = z.object({
  startTime: z.string().regex(ISO_DATETIME_RE, 'Format : AAAA-MM-JJTHH:mm'),
  endTime: z.string().regex(ISO_DATETIME_RE, 'Format : AAAA-MM-JJTHH:mm'),
});
const reassignSchema = z.object({
  transportId: z.string().min(1, 'Le transport est obligatoire'),
});

type UpdateShiftFormData = z.infer<typeof updateShiftSchema>;
type ReassignFormData = z.infer<typeof reassignSchema>;

function formatTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('fr-TN', { weekday: 'short', month: 'short', day: 'numeric' }); }
  catch { return iso; }
}

function getStatusLabel(status: ShiftStatus | 'ALL') {
  const labels: Record<ShiftStatus | 'ALL', string> = {
    ALL: 'Tous',
    SCHEDULED: 'Planifie',
    ACTIVE: 'Actif',
    COMPLETED: 'Termine',
    CANCELLED: 'Annule',
  };
  return labels[status];
}

const STATUS_COLOR: Record<ShiftStatus, string> = {
  SCHEDULED: colors.amber,
  ACTIVE: colors.green,
  COMPLETED: colors.blue,
  CANCELLED: colors.red,
};
const STATUS_BG: Record<ShiftStatus, string> = {
  SCHEDULED: 'rgba(245,166,35,0.18)',
  ACTIVE: '#eaf3de',
  COMPLETED: '#e6f1fb',
  CANCELLED: '#ffe8e3',
};

function EditShiftModal({ visible, shift, onClose, onSaved }: {
  visible: boolean;
  shift: AdminShiftResponse | null;
  onClose: () => void;
  onSaved: (updated: AdminShiftResponse) => void;
}) {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<UpdateShiftFormData>({
    resolver: zodResolver(updateShiftSchema),
    defaultValues: { startTime: '', endTime: '' },
  });

  useEffect(() => {
    if (!shift) return;
    reset({ startTime: shift.startTime.slice(0, 16), endTime: shift.endTime.slice(0, 16) });
  }, [reset, shift, visible]);

  const onSubmit = async (data: UpdateShiftFormData) => {
    if (!shift) return;
    try {
      const body: UpdateShiftBody = {
        startTime: data.startTime.length === 16 ? `${data.startTime}:00` : data.startTime,
        endTime: data.endTime.length === 16 ? `${data.endTime}:00` : data.endTime,
      };
      const res = await adminShiftApi.update(shift.id, body);
      onSaved(res.data);
      onClose();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message ?? 'Echec de la mise a jour du service');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <SafeAreaView style={mStyles.safe}>
        <View style={mStyles.header}>
          <TouchableOpacity onPress={onClose} style={mStyles.closeBtn}>
            <AppIcon family="Feather" name="x" size={16} color={colors.white} />
          </TouchableOpacity>
          <Text style={mStyles.title}>Reprogrammer le service</Text>
          <TouchableOpacity onPress={handleSubmit(onSubmit)} style={mStyles.saveBtn}>
            <Text style={mStyles.saveTxt}>Enregistrer</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          {shift && (
            <View style={mStyles.infoBox}>
              <View style={mStyles.infoRow}>
                <AppIcon family="Feather" name="user" size={14} color={colors.white} />
                <Text style={mStyles.infoEmployee}>{shift.employeeName}</Text>
              </View>
              <View style={mStyles.infoRow}>
                <AppIcon family="MaterialIcons" name="directions-bus" size={14} color={colors.muted} />
                <Text style={mStyles.infoTransport}>{shift.transportName}</Text>
              </View>
            </View>
          )}

          <Text style={fStyles.label}>Heure de debut</Text>
          <Controller
            control={control}
            name="startTime"
            render={({ field: { value, onChange, onBlur } }) => (
              <View style={{ marginBottom: 14 }}>
                <TextInput style={[fStyles.input, !!errors.startTime && fStyles.inputError]} value={value} onChangeText={onChange} onBlur={onBlur} placeholder="2026-04-11T06:00" placeholderTextColor={colors.muted} autoCapitalize="none" />
                {!!errors.startTime && <Text style={fStyles.error}>{errors.startTime.message}</Text>}
              </View>
            )}
          />

          <Text style={fStyles.label}>Heure de fin</Text>
          <Controller
            control={control}
            name="endTime"
            render={({ field: { value, onChange, onBlur } }) => (
              <View style={{ marginBottom: 14 }}>
                <TextInput style={[fStyles.input, !!errors.endTime && fStyles.inputError]} value={value} onChangeText={onChange} onBlur={onBlur} placeholder="2026-04-11T14:00" placeholderTextColor={colors.muted} autoCapitalize="none" />
                {!!errors.endTime && <Text style={fStyles.error}>{errors.endTime.message}</Text>}
              </View>
            )}
          />
          <View style={mStyles.hint}><Text style={mStyles.hintTxt}>Format : AAAA-MM-JJTHH:mm</Text></View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function ReassignModal({ visible, shift, onClose, onSaved }: {
  visible: boolean;
  shift: AdminShiftResponse | null;
  onClose: () => void;
  onSaved: (updated: AdminShiftResponse) => void;
}) {
  const [transports, setTransports] = useState<TransportResponse[]>([]);
  const [loadingTransports, setLoadingTransports] = useState(false);
  const { control, handleSubmit, reset, formState: { errors } } = useForm<ReassignFormData>({
    resolver: zodResolver(reassignSchema),
    defaultValues: { transportId: shift?.transportId ?? '' },
  });

  useEffect(() => {
    if (shift) reset({ transportId: shift.transportId });
  }, [reset, shift, visible]);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    const loadTransports = async () => {
      setLoadingTransports(true);
      try {
        const res = await adminTransportApi.list();
        if (mounted) setTransports(res.data.filter((transport: TransportResponse) => transport.active));
      } catch {
        if (mounted) setTransports([]);
      } finally {
        if (mounted) setLoadingTransports(false);
      }
    };
    loadTransports();
    return () => { mounted = false; };
  }, [visible]);

  const onSubmit = async (data: ReassignFormData) => {
    if (!shift) return;
    try {
      const body: ReassignTransportBody = { transportId: data.transportId };
      await adminShiftApi.reassignTransport(shift.id, body);
      const selectedTransport = transports.find((transport) => transport.id === data.transportId);
      onSaved({ ...shift, transportId: data.transportId, transportName: selectedTransport?.name ?? shift.transportName });
      onClose();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message ?? 'Echec de la reaffectation du transport');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <SafeAreaView style={mStyles.safe}>
        <View style={mStyles.header}>
          <TouchableOpacity onPress={onClose} style={mStyles.closeBtn}>
            <AppIcon family="Feather" name="x" size={16} color={colors.white} />
          </TouchableOpacity>
          <Text style={mStyles.title}>Reaffecter un transport</Text>
          <TouchableOpacity onPress={handleSubmit(onSubmit)} style={mStyles.saveBtn}>
            <Text style={mStyles.saveTxt}>Enregistrer</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          {shift && (
            <View style={mStyles.infoBox}>
              <View style={mStyles.infoRow}>
                <AppIcon family="Feather" name="user" size={14} color={colors.white} />
                <Text style={mStyles.infoEmployee}>{shift.employeeName}</Text>
              </View>
              <View style={mStyles.infoRow}>
                <AppIcon family="MaterialIcons" name="directions-bus" size={14} color={colors.muted} />
                <Text style={mStyles.infoTransport}>Actuel : {shift.transportName}</Text>
              </View>
            </View>
          )}
          <Text style={fStyles.label}>Transports disponibles</Text>
          {loadingTransports ? (
            <ActivityIndicator color={colors.amber} style={{ marginBottom: 14 }} />
          ) : (
            <Controller
              control={control}
              name="transportId"
              render={({ field: { value, onChange } }) => (
                <View style={styles.transportPicker}>
                  {transports.map((transport) => (
                    <TouchableOpacity key={transport.id} style={[styles.transportOption, value === transport.id && styles.transportOptionOn]} onPress={() => onChange(transport.id)}>
                      <Text style={styles.transportOptionName}>{transport.name}</Text>
                      <Text style={styles.transportOptionMeta}>Zone {transport.zone}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          )}
          <Text style={fStyles.label}>Identifiant du transport</Text>
          <Controller
            control={control}
            name="transportId"
            render={({ field: { value, onChange, onBlur } }) => (
              <View style={{ marginBottom: 14 }}>
                <TextInput style={[fStyles.input, !!errors.transportId && fStyles.inputError]} value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Coller l'identifiant du transport" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} />
                {!!errors.transportId && <Text style={fStyles.error}>{errors.transportId.message}</Text>}
              </View>
            )}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function ShiftCard({ shift, onEdit, onReassign }: {
  shift: AdminShiftResponse;
  onEdit: () => void;
  onReassign: () => void;
}) {
  const canEdit = shift.status !== 'COMPLETED' && shift.status !== 'CANCELLED';
  return (
    <View style={scStyles.card}>
      <View style={[scStyles.strip, { backgroundColor: STATUS_COLOR[shift.status] }]} />
      <View style={scStyles.content}>
        <View style={scStyles.topRow}>
          <View style={[scStyles.statusBadge, { backgroundColor: STATUS_BG[shift.status] }]}>
            <Text style={[scStyles.statusTxt, { color: STATUS_COLOR[shift.status] }]}>{getStatusLabel(shift.status)}</Text>
          </View>
          <Text style={scStyles.date}>{formatDate(shift.startTime)}</Text>
        </View>
        <View style={scStyles.infoRow}><AppIcon family="Feather" name="user" size={14} color={colors.navy} /><Text style={scStyles.employee}>{shift.employeeName}</Text></View>
        <View style={scStyles.infoRow}><AppIcon family="MaterialIcons" name="directions-bus" size={14} color={colors.muted} /><Text style={scStyles.transport}>{shift.transportName}</Text></View>
        <View style={scStyles.times}>
          <View style={scStyles.timeChip}><Text style={scStyles.timeLbl}>Debut</Text><Text style={scStyles.timeVal}>{formatTime(shift.startTime)}</Text></View>
          <AppIcon family="Feather" name="arrow-right" size={16} color={colors.muted} />
          <View style={scStyles.timeChip}><Text style={scStyles.timeLbl}>Fin</Text><Text style={scStyles.timeVal}>{formatTime(shift.endTime)}</Text></View>
        </View>
        {canEdit && (
          <View style={scStyles.actions}>
            <TouchableOpacity style={scStyles.btn} onPress={onEdit} activeOpacity={0.8}>
              <View style={scStyles.btnInner}><AppIcon family="Feather" name="edit-2" size={13} color={colors.navy} /><Text style={scStyles.btnTxt}>Reprogrammer</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={scStyles.btn} onPress={onReassign} activeOpacity={0.8}>
              <View style={scStyles.btnInner}><AppIcon family="Feather" name="repeat" size={13} color={colors.navy} /><Text style={scStyles.btnTxt}>Reaffecter</Text></View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

export function AdminPlanningScreen() {
  const [shifts, setShifts] = useState<AdminShiftResponse[]>(FALLBACK);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | ShiftStatus>('ALL');
  const [editTarget, setEditTarget] = useState<AdminShiftResponse | null>(null);
  const [reassignTarget, setReassignTarget] = useState<AdminShiftResponse | null>(null);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      const res = await adminShiftApi.list();
      setShifts(res.data);
    } catch {
      setShifts(FALLBACK);
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const filtered = shifts.filter((shift) => statusFilter === 'ALL' || shift.status === statusFilter);
  const scheduledCount = shifts.filter((shift) => shift.status === 'SCHEDULED').length;

  const handlePublish = () => {
    const ids = shifts.filter((shift) => shift.status === 'SCHEDULED').map((shift) => shift.id);
    Alert.alert('Publier le planning', `Publier ${ids.length} service${ids.length !== 1 ? 's' : ''} planifie${ids.length !== 1 ? 's' : ''} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Publier',
        style: 'destructive',
        onPress: async () => {
          setPublishing(true);
          try {
            await adminPlanningApi.publish({ shiftIds: ids });
            await load();
            Alert.alert('Publication terminee', 'Les modifications du planning sont maintenant en ligne.');
          } catch (err: any) {
            Alert.alert('Erreur', err?.response?.data?.message ?? 'Echec de la publication');
          } finally {
            setPublishing(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topbar}>
        <View>
          <Text style={styles.topTitle}>Planning des services</Text>
          <Text style={styles.topSub}>{shifts.filter((shift) => shift.status === 'ACTIVE').length} actifs - {scheduledCount} planifies</Text>
        </View>
      </View>
      {scheduledCount > 0 && (
        <TouchableOpacity style={styles.publishBar} onPress={handlePublish} disabled={publishing} activeOpacity={0.9}>
          {publishing ? <ActivityIndicator color={colors.white} size="small" /> : <><View style={styles.publishDot} /><Text style={styles.publishTxt}>{scheduledCount} service{scheduledCount !== 1 ? 's' : ''} en attente - Appuyer pour publier</Text><AppIcon family="Feather" name="send" size={16} color={colors.white} /></>}
        </TouchableOpacity>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {(['ALL', 'ACTIVE', 'SCHEDULED', 'COMPLETED', 'CANCELLED'] as const).map((status) => (
          <TouchableOpacity key={status} style={[styles.chip, statusFilter === status && styles.chipOn]} onPress={() => setStatusFilter(status)}>
            <Text style={[styles.chipTxt, statusFilter === status && styles.chipTxtOn]}>{getStatusLabel(status)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.amber} />}
      >
        {filtered.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTxt}>Aucun service trouve</Text></View> : filtered.map((shift) => <ShiftCard key={shift.id} shift={shift} onEdit={() => setEditTarget(shift)} onReassign={() => setReassignTarget(shift)} />)}
      </ScrollView>
      <EditShiftModal visible={!!editTarget} shift={editTarget} onClose={() => setEditTarget(null)} onSaved={(updated) => { setShifts((prev) => prev.map((shift) => (shift.id === updated.id ? updated : shift))); setEditTarget(null); }} />
      <ReassignModal visible={!!reassignTarget} shift={reassignTarget} onClose={() => setReassignTarget(null)} onSaved={(updated) => { setShifts((prev) => prev.map((shift) => (shift.id === updated.id ? updated : shift))); setReassignTarget(null); }} />
    </SafeAreaView>
  );
}

const mStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgLight },
  header: { backgroundColor: colors.navy, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'space-between' },
  closeBtn: { width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '800', color: colors.white, flex: 1, textAlign: 'center' },
  saveBtn: { backgroundColor: colors.red, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  saveTxt: { fontSize: 12, fontWeight: '800', color: colors.white },
  infoBox: { backgroundColor: colors.navy, borderRadius: 12, padding: 14, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  infoEmployee: { fontSize: 13, fontWeight: '700', color: colors.white },
  infoTransport: { fontSize: 12, color: colors.muted },
  hint: { backgroundColor: 'rgba(245,166,35,0.15)', borderRadius: 9, padding: 10 },
  hintTxt: { fontSize: 11, color: colors.navy, fontWeight: '700' },
});

const fStyles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', color: colors.navy, marginBottom: 6 },
  input: { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: colors.navy },
  inputError: { borderColor: colors.red },
  error: { fontSize: 11, color: colors.red, marginTop: 4 },
});

const scStyles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 16, marginBottom: 10, borderWidth: 1.5, borderColor: colors.border, flexDirection: 'row', overflow: 'hidden' },
  strip: { width: 4 },
  content: { flex: 1, padding: 13 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusTxt: { fontSize: 10, fontWeight: '800' },
  date: { fontSize: 11, fontWeight: '700', color: colors.muted },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  employee: { fontSize: 13, fontWeight: '700', color: colors.navy },
  transport: { fontSize: 12, color: colors.muted, marginBottom: 6 },
  times: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  timeChip: { flex: 1, backgroundColor: colors.bgLight, borderRadius: 10, padding: 9, alignItems: 'center' },
  timeLbl: { fontSize: 10, fontWeight: '700', color: colors.muted },
  timeVal: { fontSize: 16, fontWeight: '800', color: colors.navy },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, backgroundColor: colors.bgLight, borderRadius: 10, paddingVertical: 9, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnTxt: { fontSize: 11, fontWeight: '700', color: colors.navy },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  topbar: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 11 },
  topTitle: { fontSize: 15, fontWeight: '800', color: colors.white },
  topSub: { fontSize: 10, color: colors.muted, marginTop: 1 },
  publishBar: { backgroundColor: colors.red, marginHorizontal: 12, marginBottom: 4, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  publishDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white },
  publishTxt: { flex: 1, fontSize: 12, fontWeight: '800', color: colors.white },
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
  transportPicker: { gap: 8, marginBottom: 14 },
  transportOption: { backgroundColor: colors.white, borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: colors.border },
  transportOptionOn: { borderColor: colors.amber, backgroundColor: 'rgba(245,166,35,0.15)' },
  transportOptionName: { fontSize: 12, fontWeight: '700', color: colors.navy },
  transportOptionMeta: { fontSize: 10, color: colors.muted, marginTop: 2 },
});
