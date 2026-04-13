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
import { colors } from '../../theme/colors';
import type {
  AdminShiftResponse,
  ShiftStatus,
  UpdateShiftBody,
  ReassignTransportBody,
  TransportResponse,
} from '../../types/admin';

const FALLBACK: AdminShiftResponse[] = [
  { id: 's1', employeeId: 'e1', employeeName: 'Karim Ben Ali', transportId: 't1', transportName: 'Line 5 · Lac → Bardo', startTime: '2026-04-11T06:00:00', endTime: '2026-04-11T14:00:00', status: 'ACTIVE' },
  { id: 's2', employeeId: 'e2', employeeName: 'Sana Mejri', transportId: 't2', transportName: 'Metro 2 · Ariana', startTime: '2026-04-11T07:30:00', endTime: '2026-04-11T15:30:00', status: 'ACTIVE' },
  { id: 's3', employeeId: 'e4', employeeName: 'Leila Boussaid', transportId: 't4', transportName: 'Tram T1 · Centre', startTime: '2026-04-11T14:00:00', endTime: '2026-04-11T22:00:00', status: 'SCHEDULED' },
  { id: 's4', employeeId: 'e5', employeeName: 'Mehdi Slama', transportId: 't1', transportName: 'Line 5 · Lac → Bardo', startTime: '2026-04-11T22:00:00', endTime: '2026-04-12T06:00:00', status: 'SCHEDULED' },
  { id: 's5', employeeId: 'e3', employeeName: 'Rami Chatti', transportId: 't3', transportName: 'Line 8 · Bab Bhar', startTime: '2026-04-10T06:00:00', endTime: '2026-04-10T14:00:00', status: 'COMPLETED' },
];

const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

const updateShiftSchema = z.object({
  startTime: z.string().regex(ISO_DATETIME_RE, 'Format: YYYY-MM-DDTHH:mm'),
  endTime: z.string().regex(ISO_DATETIME_RE, 'Format: YYYY-MM-DDTHH:mm'),
});

const reassignSchema = z.object({
  transportId: z.string().min(1, 'Transport is required'),
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

interface EditShiftModalProps {
  visible: boolean;
  shift: AdminShiftResponse | null;
  onClose: () => void;
  onSaved: (updated: AdminShiftResponse) => void;
}

function EditShiftModal({ visible, shift, onClose, onSaved }: EditShiftModalProps) {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<UpdateShiftFormData>({
    resolver: zodResolver(updateShiftSchema),
    defaultValues: { startTime: '', endTime: '' },
  });

  useEffect(() => {
    if (!shift) return;
    reset({
      startTime: shift.startTime.slice(0, 16),
      endTime: shift.endTime.slice(0, 16),
    });
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
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to update shift');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <SafeAreaView style={mStyles.safe}>
        <View style={mStyles.header}>
          <TouchableOpacity onPress={onClose} style={mStyles.closeBtn}>
            <Text style={mStyles.closeTxt}>✕</Text>
          </TouchableOpacity>
          <Text style={mStyles.title}>Reschedule Shift</Text>
          <TouchableOpacity onPress={handleSubmit(onSubmit)} style={mStyles.saveBtn}>
            <Text style={mStyles.saveTxt}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          {shift && (
            <View style={mStyles.infoBox}>
              <Text style={mStyles.infoEmployee}>👤 {shift.employeeName}</Text>
              <Text style={mStyles.infoTransport}>🚌 {shift.transportName}</Text>
            </View>
          )}

          <Text style={fStyles.label}>Start Time</Text>
          <Controller
            control={control}
            name="startTime"
            render={({ field: { value, onChange, onBlur } }) => (
              <View style={{ marginBottom: 14 }}>
                <TextInput
                  style={[fStyles.input, !!errors.startTime && fStyles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="2026-04-11T06:00"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                />
                {!!errors.startTime && <Text style={fStyles.error}>{errors.startTime.message}</Text>}
              </View>
            )}
          />

          <Text style={fStyles.label}>End Time</Text>
          <Controller
            control={control}
            name="endTime"
            render={({ field: { value, onChange, onBlur } }) => (
              <View style={{ marginBottom: 14 }}>
                <TextInput
                  style={[fStyles.input, !!errors.endTime && fStyles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="2026-04-11T14:00"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                />
                {!!errors.endTime && <Text style={fStyles.error}>{errors.endTime.message}</Text>}
              </View>
            )}
          />
          <View style={mStyles.hint}>
            <Text style={mStyles.hintTxt}>Format: YYYY-MM-DDTHH:mm</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

interface ReassignModalProps {
  visible: boolean;
  shift: AdminShiftResponse | null;
  onClose: () => void;
  onSaved: (updated: AdminShiftResponse) => void;
}

function ReassignModal({ visible, shift, onClose, onSaved }: ReassignModalProps) {
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
        if (mounted) setTransports(res.data.filter((transport) => transport.active));
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
      onSaved({
        ...shift,
        transportId: data.transportId,
        transportName: selectedTransport?.name ?? shift.transportName,
      });
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to reassign transport');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <SafeAreaView style={mStyles.safe}>
        <View style={mStyles.header}>
          <TouchableOpacity onPress={onClose} style={mStyles.closeBtn}>
            <Text style={mStyles.closeTxt}>✕</Text>
          </TouchableOpacity>
          <Text style={mStyles.title}>Reassign Transport</Text>
          <TouchableOpacity onPress={handleSubmit(onSubmit)} style={mStyles.saveBtn}>
            <Text style={mStyles.saveTxt}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          {shift && (
            <View style={mStyles.infoBox}>
              <Text style={mStyles.infoEmployee}>👤 {shift.employeeName}</Text>
              <Text style={mStyles.infoTransport}>Current: 🚌 {shift.transportName}</Text>
            </View>
          )}

          <Text style={fStyles.label}>Available Transports</Text>
          {loadingTransports ? (
            <ActivityIndicator color={colors.amber} style={{ marginBottom: 14 }} />
          ) : (
            <Controller
              control={control}
              name="transportId"
              render={({ field: { value, onChange } }) => (
                <View style={styles.transportPicker}>
                  {transports.map((transport) => (
                    <TouchableOpacity
                      key={transport.id}
                      style={[styles.transportOption, value === transport.id && styles.transportOptionOn]}
                      onPress={() => onChange(transport.id)}
                    >
                      <Text style={styles.transportOptionName}>{transport.name}</Text>
                      <Text style={styles.transportOptionMeta}>Zone {transport.zone}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          )}

          <Text style={fStyles.label}>Transport ID</Text>
          <Controller
            control={control}
            name="transportId"
            render={({ field: { value, onChange, onBlur } }) => (
              <View style={{ marginBottom: 14 }}>
                <TextInput
                  style={[fStyles.input, !!errors.transportId && fStyles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Paste transport id"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {!!errors.transportId && <Text style={fStyles.error}>{errors.transportId.message}</Text>}
              </View>
            )}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const mStyles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: colors.bgLight },
  header:        { backgroundColor: colors.navy, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'space-between' },
  closeBtn:      { width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  closeTxt:      { fontSize: 14, color: colors.white, fontWeight: '700' },
  title:         { fontSize: 15, fontWeight: '800', color: colors.white, flex: 1, textAlign: 'center' },
  saveBtn:       { backgroundColor: colors.red, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  saveTxt:       { fontSize: 12, fontWeight: '800', color: colors.white },
  infoBox:       { backgroundColor: colors.navy, borderRadius: 12, padding: 14, marginBottom: 16 },
  infoEmployee:  { fontSize: 13, fontWeight: '700', color: colors.white, marginBottom: 4 },
  infoTransport: { fontSize: 12, color: colors.muted },
  hint:          { backgroundColor: 'rgba(245,166,35,0.15)', borderRadius: 9, padding: 10 },
  hintTxt:       { fontSize: 11, color: colors.navy, fontWeight: '700' },
});

const fStyles = StyleSheet.create({
  label:      { fontSize: 12, fontWeight: '700', color: colors.navy, marginBottom: 6 },
  input:      { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: colors.navy },
  inputError: { borderColor: colors.red },
  error:      { fontSize: 11, color: colors.red, marginTop: 4 },
});

interface ShiftCardProps {
  shift: AdminShiftResponse;
  onEdit: () => void;
  onReassign: () => void;
}

function ShiftCard({ shift, onEdit, onReassign }: ShiftCardProps) {
  const canEdit = shift.status !== 'COMPLETED' && shift.status !== 'CANCELLED';

  return (
    <View style={scStyles.card}>
      <View style={[scStyles.strip, { backgroundColor: STATUS_COLOR[shift.status] }]} />
      <View style={scStyles.content}>
        <View style={scStyles.topRow}>
          <View style={[scStyles.statusBadge, { backgroundColor: STATUS_BG[shift.status] }]}>
            <Text style={[scStyles.statusTxt, { color: STATUS_COLOR[shift.status] }]}>{shift.status}</Text>
          </View>
          <Text style={scStyles.date}>{formatDate(shift.startTime)}</Text>
        </View>
        <Text style={scStyles.employee}>👤 {shift.employeeName}</Text>
        <Text style={scStyles.transport}>🚌 {shift.transportName}</Text>
        <View style={scStyles.times}>
          <View style={scStyles.timeChip}>
            <Text style={scStyles.timeLbl}>Start</Text>
            <Text style={scStyles.timeVal}>{formatTime(shift.startTime)}</Text>
          </View>
          <Text style={scStyles.arrow}>→</Text>
          <View style={scStyles.timeChip}>
            <Text style={scStyles.timeLbl}>End</Text>
            <Text style={scStyles.timeVal}>{formatTime(shift.endTime)}</Text>
          </View>
        </View>
        {canEdit && (
          <View style={scStyles.actions}>
            <TouchableOpacity style={scStyles.btn} onPress={onEdit} activeOpacity={0.8}>
              <Text style={scStyles.btnTxt}>✏️ Reschedule</Text>
            </TouchableOpacity>
            <TouchableOpacity style={scStyles.btn} onPress={onReassign} activeOpacity={0.8}>
              <Text style={scStyles.btnTxt}>🔄 Reassign</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const scStyles = StyleSheet.create({
  card:        { backgroundColor: colors.white, borderRadius: 16, marginBottom: 10, borderWidth: 1.5, borderColor: colors.border, flexDirection: 'row', overflow: 'hidden' },
  strip:       { width: 4 },
  content:     { flex: 1, padding: 13 },
  topRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusTxt:   { fontSize: 10, fontWeight: '800' },
  date:        { fontSize: 11, fontWeight: '700', color: colors.muted },
  employee:    { fontSize: 13, fontWeight: '700', color: colors.navy, marginBottom: 4 },
  transport:   { fontSize: 12, color: colors.muted, marginBottom: 10 },
  times:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  timeChip:    { flex: 1, backgroundColor: colors.bgLight, borderRadius: 10, padding: 9, alignItems: 'center' },
  timeLbl:     { fontSize: 10, fontWeight: '700', color: colors.muted },
  timeVal:     { fontSize: 16, fontWeight: '800', color: colors.navy },
  arrow:       { color: colors.muted, fontSize: 16 },
  actions:     { flexDirection: 'row', gap: 8 },
  btn:         { flex: 1, backgroundColor: colors.bgLight, borderRadius: 10, paddingVertical: 9, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border },
  btnTxt:      { fontSize: 11, fontWeight: '700', color: colors.navy },
});

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
    Alert.alert(
      '🚀 Publish Planning',
      `Publish ${ids.length} scheduled shift${ids.length !== 1 ? 's' : ''} and go live?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          style: 'destructive',
          onPress: async () => {
            setPublishing(true);
            try {
              await adminPlanningApi.publish({ shiftIds: ids });
              await load();
              Alert.alert('✅ Published', 'Planning changes are now live!');
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message ?? 'Failed to publish');
            } finally {
              setPublishing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topbar}>
        <View>
          <Text style={styles.topTitle}>Shift Planning</Text>
          <Text style={styles.topSub}>
            {shifts.filter((shift) => shift.status === 'ACTIVE').length} active · {scheduledCount} scheduled
          </Text>
        </View>
      </View>

      {scheduledCount > 0 && (
        <TouchableOpacity style={styles.publishBar} onPress={handlePublish} disabled={publishing} activeOpacity={0.9}>
          {publishing ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <View style={styles.publishDot} />
              <Text style={styles.publishTxt}>{scheduledCount} shift{scheduledCount !== 1 ? 's' : ''} pending · Tap to publish</Text>
              <Text>🚀</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {(['ALL', 'ACTIVE', 'SCHEDULED', 'COMPLETED', 'CANCELLED'] as const).map((status) => (
          <TouchableOpacity key={status} style={[styles.chip, statusFilter === status && styles.chipOn]} onPress={() => setStatusFilter(status)}>
            <Text style={[styles.chipTxt, statusFilter === status && styles.chipTxtOn]}>{status}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor={colors.amber}
          />
        )}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyTxt}>No shifts found</Text></View>
        ) : (
          filtered.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              onEdit={() => setEditTarget(shift)}
              onReassign={() => setReassignTarget(shift)}
            />
          ))
        )}
      </ScrollView>

      <EditShiftModal
        visible={!!editTarget}
        shift={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={(updated) => {
          setShifts((prev) => prev.map((shift) => (shift.id === updated.id ? updated : shift)));
          setEditTarget(null);
        }}
      />
      <ReassignModal
        visible={!!reassignTarget}
        shift={reassignTarget}
        onClose={() => setReassignTarget(null)}
        onSaved={(updated) => {
          setShifts((prev) => prev.map((shift) => (shift.id === updated.id ? updated : shift)));
          setReassignTarget(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.navy },
  topbar:       { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 11 },
  topTitle:     { fontSize: 15, fontWeight: '800', color: colors.white },
  topSub:       { fontSize: 10, color: colors.muted, marginTop: 1 },
  publishBar:   { backgroundColor: colors.red, marginHorizontal: 12, marginBottom: 4, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  publishDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white },
  publishTxt:   { flex: 1, fontSize: 12, fontWeight: '800', color: colors.white },
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
  transportPicker: { gap: 8, marginBottom: 14 },
  transportOption: { backgroundColor: colors.white, borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: colors.border },
  transportOptionOn: { borderColor: colors.amber, backgroundColor: 'rgba(245,166,35,0.15)' },
  transportOptionName: { fontSize: 12, fontWeight: '700', color: colors.navy },
  transportOptionMeta: { fontSize: 10, color: colors.muted, marginTop: 2 },
});
