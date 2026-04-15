import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, RefreshControl, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { adminTransportApi } from '../../api/admin';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/colors';
import type { TransportResponse, TransportType, CreateTransportBody, UpdateTransportBody, TransportStopItem } from '../../types/admin';

const TRANSPORT_TYPES: TransportType[] = ['BUS', 'METRO', 'TRAIN'];
const TYPE_COLOR: Record<TransportType, string> = { BUS: colors.red, METRO: colors.blue, TRAIN: colors.green };
const FALLBACK_STOPS: TransportStopItem[] = [
  { id: 's1', stopOrder: 1, name: 'Terminus Lac', zone: 'A', active: true },
  { id: 's2', stopOrder: 2, name: 'Place Pasteur', zone: 'A', active: true },
  { id: 's3', stopOrder: 3, name: 'Avenue Bourguiba', zone: 'A', active: true },
];
const transportSchema = z.object({
  name: z.string().min(2, 'Minimum 2 caracteres'),
  type: z.enum(['BUS', 'METRO', 'TRAIN']),
  zone: z.string().min(1, 'La zone est obligatoire'),
  active: z.boolean(),
});
type TransportFormData = z.infer<typeof transportSchema>;

function getTypeLabel(type: TransportType) {
  const labels: Record<TransportType, string> = { BUS: 'Bus', METRO: 'Metro', TRAIN: 'Train' };
  return labels[type];
}
function typeIcon(type: TransportType, color: string) {
  if (type === 'BUS') return <AppIcon family="MaterialIcons" name="directions-bus" size={20} color={color} />;
  if (type === 'METRO') return <AppIcon family="MaterialIcons" name="train" size={20} color={color} />;
  return <AppIcon family="MaterialCommunityIcons" name="train" size={20} color={color} />;
}

function Field({ label, value, onChange, onBlur, error, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; onBlur?: () => void; error?: string; placeholder?: string;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={fStyles.label}>{label}</Text>
      <TextInput style={[fStyles.input, !!error && fStyles.inputError]} value={value} onChangeText={onChange} onBlur={onBlur} placeholder={placeholder} placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} />
      {!!error && <Text style={fStyles.error}>{error}</Text>}
    </View>
  );
}

function TransportFormModal({ visible, transport, onClose, onSaved }: {
  visible: boolean; transport: TransportResponse | null; onClose: () => void; onSaved: (t: TransportResponse) => void;
}) {
  const isEdit = !!transport;
  const { control, handleSubmit, reset, formState: { errors } } = useForm<TransportFormData>({ resolver: zodResolver(transportSchema), defaultValues: { name: '', type: 'BUS', zone: '', active: true } });
  useEffect(() => {
    reset(transport ? { name: transport.name, type: transport.type, zone: transport.zone, active: transport.active } : { name: '', type: 'BUS', zone: '', active: true });
  }, [transport, visible, reset]);
  const onSubmit = async (data: TransportFormData) => {
    try {
      if (isEdit && transport) {
        const res = await adminTransportApi.update(transport.id, data as UpdateTransportBody);
        onSaved(res.data);
      } else {
        const res = await adminTransportApi.create(data as CreateTransportBody);
        onSaved(res.data);
      }
      onClose();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message ?? 'Echec de l enregistrement du transport');
    }
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={mStyles.safe}>
        <View style={mStyles.header}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }} style={mStyles.closeBtn}><AppIcon family="Feather" name="x" size={16} color={colors.white} /></TouchableOpacity>
          <Text style={mStyles.title}>{isEdit ? 'Modifier le transport' : 'Nouveau transport'}</Text>
          <TouchableOpacity onPress={handleSubmit(onSubmit)} style={mStyles.saveBtn}><Text style={mStyles.saveTxt}>Enregistrer</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          <Text style={fStyles.label}>Type de transport</Text>
          <Controller control={control} name="type" render={({ field: { value, onChange } }) => (
            <View style={mStyles.typeGrid}>
              {TRANSPORT_TYPES.map((t) => <TouchableOpacity key={t} style={[mStyles.typeChip, value === t && { borderColor: TYPE_COLOR[t], backgroundColor: TYPE_COLOR[t] + '18' }]} onPress={() => onChange(t)} activeOpacity={0.8}>{typeIcon(t, TYPE_COLOR[t])}<Text style={[mStyles.typeChipTxt, value === t && { color: TYPE_COLOR[t] }]}>{getTypeLabel(t)}</Text></TouchableOpacity>)}
            </View>
          )} />
          <Controller control={control} name="name" render={({ field: { value, onChange, onBlur } }) => <Field label="Nom / trajet" value={value} onChange={onChange} onBlur={onBlur} error={errors.name?.message} placeholder="Ligne 5 - Lac vers Bardo" />} />
          <Controller control={control} name="zone" render={({ field: { value, onChange, onBlur } }) => <Field label="Zone" value={value} onChange={onChange} onBlur={onBlur} error={errors.zone?.message} placeholder="A, B, C..." />} />
          <Controller control={control} name="active" render={({ field: { value, onChange } }) => <View style={mStyles.switchRow}><View><Text style={fStyles.label}>Actif</Text><Text style={{ fontSize: 11, color: colors.muted }}>Le transport est operationnel</Text></View><Switch value={value} onValueChange={onChange} trackColor={{ true: colors.green, false: colors.border }} thumbColor={colors.white} /></View>} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function StopsEditorModal({ visible, transportId, transportName, onClose }: {
  visible: boolean; transportId: string; transportName: string; onClose: () => void;
}) {
  const [stops, setStops] = useState<TransportStopItem[]>(FALLBACK_STOPS);
  const [saving, setSaving] = useState(false);
  const updateStop = (idx: number, key: keyof TransportStopItem, val: any) => setStops((prev) => prev.map((s, i) => i === idx ? { ...s, [key]: val } : s));
  const addStop = () => setStops((prev) => [...prev, { stopOrder: prev.length + 1, name: '', zone: '', active: true }]);
  const removeStop = (idx: number) => setStops((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stopOrder: i + 1 })));
  const handleSave = async () => {
    if (stops.some((s) => !s.name || !s.zone)) { Alert.alert('Validation', 'Tous les arrets doivent avoir un nom et une zone.'); return; }
    setSaving(true);
    try { await adminTransportApi.updateStops(transportId, { stops }); onClose(); } catch (err: any) { Alert.alert('Erreur', err?.response?.data?.message ?? 'Echec de l enregistrement des arrets'); } finally { setSaving(false); }
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={mStyles.safe}>
        <View style={mStyles.header}>
          <TouchableOpacity onPress={onClose} style={mStyles.closeBtn}><AppIcon family="Feather" name="x" size={16} color={colors.white} /></TouchableOpacity>
          <Text style={mStyles.title} numberOfLines={1}>Arrets - {transportName}</Text>
          <TouchableOpacity onPress={handleSave} style={mStyles.saveBtn} disabled={saving}>{saving ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={mStyles.saveTxt}>Enregistrer</Text>}</TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          {stops.map((stop, idx) => <View key={idx} style={sStyles.card}>
            <View style={sStyles.header}>
              <View style={sStyles.order}><Text style={sStyles.orderTxt}>{idx + 1}</Text></View>
              <Text style={sStyles.stopTitle} numberOfLines={1}>{stop.name || `Arret ${idx + 1}`}</Text>
              <Switch value={stop.active} onValueChange={(v) => updateStop(idx, 'active', v)} trackColor={{ true: colors.green, false: colors.border }} thumbColor={colors.white} style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }} />
              <TouchableOpacity onPress={() => removeStop(idx)} style={sStyles.removeBtn}><AppIcon family="Feather" name="x" size={12} color={colors.red} /></TouchableOpacity>
            </View>
            <View style={sStyles.fields}>
              <TextInput style={[sStyles.input, { flex: 2 }]} value={stop.name} onChangeText={(v) => updateStop(idx, 'name', v)} placeholder="Nom de l'arret" placeholderTextColor={colors.muted} />
              <TextInput style={[sStyles.input, { flex: 1 }]} value={stop.zone} onChangeText={(v) => updateStop(idx, 'zone', v)} placeholder="Zone" placeholderTextColor={colors.muted} />
            </View>
          </View>)}
          <TouchableOpacity style={sStyles.addBtn} onPress={addStop} activeOpacity={0.8}><View style={sStyles.addBtnInner}><AppIcon family="Feather" name="plus" size={14} color={colors.white} /><Text style={sStyles.addBtnTxt}>Ajouter un arret</Text></View></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function TransportCard({ transport: t, onEdit, onStops, onToggle }: {
  transport: TransportResponse; onEdit: () => void; onStops: () => void; onToggle: () => void;
}) {
  const color = TYPE_COLOR[t.type];
  return (
    <View style={tcStyles.card}>
      <View style={tcStyles.top}>
        <View style={[tcStyles.icon, { backgroundColor: color + '22' }]}>{typeIcon(t.type, color)}</View>
        <View style={tcStyles.info}>
          <Text style={tcStyles.name} numberOfLines={1}>{t.name}</Text>
          <View style={tcStyles.metaRow}>
            <View style={[tcStyles.badge, { backgroundColor: color + '22' }]}><Text style={[tcStyles.badgeTxt, { color }]}>{getTypeLabel(t.type)}</Text></View>
            <Text style={tcStyles.zone}>Zone {t.zone}</Text>
            <View style={[tcStyles.badge, { backgroundColor: t.active ? '#eaf3de' : colors.border }]}><Text style={[tcStyles.badgeTxt, { color: t.active ? colors.green : colors.muted }]}>{t.active ? 'Actif' : 'Inactif'}</Text></View>
          </View>
        </View>
      </View>
      <View style={tcStyles.stats}>
        <View style={tcStyles.statItem}><Text style={tcStyles.statVal}>{t.stopsCount}</Text><Text style={tcStyles.statLbl}>Arrets</Text></View>
        <View style={tcStyles.statDiv} />
        <View style={tcStyles.statItem}><Text style={tcStyles.statVal}>{t.departuresCount}</Text><Text style={tcStyles.statLbl}>Departs</Text></View>
        <View style={tcStyles.statDiv} />
        <View style={tcStyles.statItem}><Text style={[tcStyles.statVal, { color: t.active ? colors.green : colors.muted }]}>{t.active ? 'En ligne' : 'Arret'}</Text><Text style={tcStyles.statLbl}>Statut</Text></View>
      </View>
      <View style={tcStyles.actions}>
        <TouchableOpacity style={tcStyles.btn} onPress={onEdit} activeOpacity={0.8}><View style={tcStyles.btnInner}><AppIcon family="Feather" name="edit-2" size={13} color={colors.navy} /><Text style={tcStyles.btnTxt}>Modifier</Text></View></TouchableOpacity>
        <TouchableOpacity style={tcStyles.btn} onPress={onStops} activeOpacity={0.8}><View style={tcStyles.btnInner}><AppIcon family="Feather" name="map-pin" size={13} color={colors.navy} /><Text style={tcStyles.btnTxt}>Arrets</Text></View></TouchableOpacity>
        <TouchableOpacity style={[tcStyles.btn, { borderColor: t.active ? colors.red : colors.green }]} onPress={onToggle} activeOpacity={0.8}><View style={tcStyles.btnInner}><AppIcon family="Feather" name={t.active ? 'pause-circle' : 'play-circle'} size={13} color={t.active ? colors.red : colors.green} /><Text style={[tcStyles.btnTxt, { color: t.active ? colors.red : colors.green }]}>{t.active ? 'Couper' : 'Activer'}</Text></View></TouchableOpacity>
      </View>
    </View>
  );
}

export function AdminTransportsScreen() {
  const [transports, setTransports] = useState<TransportResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | TransportType>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TransportResponse | null>(null);
  const [stopsTarget, setStopsTarget] = useState<TransportResponse | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      const res = await adminTransportApi.list();
      setTransports(res.data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Impossible de charger les transports');
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = transports.filter((t) => {
    const matchType = typeFilter === 'ALL' || t.type === typeFilter;
    const term = search.toLowerCase();
    const matchSearch = !term || t.name.toLowerCase().includes(term) || t.zone.toLowerCase().includes(term);
    return matchType && matchSearch;
  });
  const handleSaved = (saved: TransportResponse) => {
    setTransports((prev) => {
      const exists = prev.find((t) => t.id === saved.id);
      return exists ? prev.map((t) => t.id === saved.id ? saved : t) : [...prev, saved];
    });
    setEditTarget(null);
    setFormOpen(false);
  };
  const handleToggle = (t: TransportResponse) => {
    Alert.alert('Changer le statut du transport', `Passer "${t.name}" en ${t.active ? 'inactif' : 'actif'} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: async () => { try { const res = await adminTransportApi.update(t.id, { active: !t.active }); setTransports((prev) => prev.map((x) => x.id === t.id ? res.data : x)); } catch (err: any) { Alert.alert('Erreur', err?.response?.data?.message ?? 'Echec de la mise a jour du transport'); } } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topbar}>
        <View><Text style={styles.topTitle}>Transports</Text><Text style={styles.topSub}>{transports.length} lignes - {transports.filter((t) => t.active).length} actives</Text></View>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setEditTarget(null); setFormOpen(true); }} activeOpacity={0.8}><View style={styles.addBtnInner}><AppIcon family="Feather" name="plus" size={14} color={colors.white} /><Text style={styles.addBtnTxt}>Nouvelle ligne</Text></View></TouchableOpacity>
      </View>
      <View style={styles.searchRow}><AppIcon family="Feather" name="search" size={15} color={colors.muted} /><TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Rechercher un transport..." placeholderTextColor={colors.muted} autoCorrect={false} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {(['ALL', ...TRANSPORT_TYPES] as const).map((r) => <TouchableOpacity key={r} style={[styles.chip, typeFilter === r && styles.chipOn]} onPress={() => setTypeFilter(r as any)}><Text style={[styles.chipTxt, typeFilter === r && styles.chipTxtOn]}>{r === 'ALL' ? 'Tous' : getTypeLabel(r as TransportType)}</Text></TouchableOpacity>)}
      </ScrollView>
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.amber} />}>
        {!!error && <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>}
        {filtered.map((t) => <TransportCard key={t.id} transport={t} onEdit={() => { setEditTarget(t); setFormOpen(true); }} onStops={() => setStopsTarget(t)} onToggle={() => handleToggle(t)} />)}
      </ScrollView>
      <TransportFormModal visible={formOpen} transport={editTarget} onClose={() => { setFormOpen(false); setEditTarget(null); }} onSaved={handleSaved} />
      {stopsTarget && <StopsEditorModal visible={!!stopsTarget} transportId={stopsTarget.id} transportName={stopsTarget.name} onClose={() => setStopsTarget(null)} />}
    </SafeAreaView>
  );
}

const fStyles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', color: colors.navy, marginBottom: 6 },
  input: { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: colors.navy },
  inputError: { borderColor: colors.red },
  error: { fontSize: 11, color: colors.red, marginTop: 4 },
});
const sStyles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1.5, borderColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  order: { width: 24, height: 24, borderRadius: 7, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  orderTxt: { fontSize: 11, fontWeight: '800', color: colors.white },
  stopTitle: { flex: 1, fontSize: 12, fontWeight: '700', color: colors.navy },
  removeBtn: { width: 24, height: 24, borderRadius: 7, backgroundColor: '#ffe8e3', alignItems: 'center', justifyContent: 'center' },
  fields: { flexDirection: 'row', gap: 8 },
  input: { backgroundColor: colors.bgLight, borderRadius: 9, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: colors.navy },
  addBtn: { backgroundColor: colors.navy, borderRadius: 12, padding: 13, alignItems: 'center' },
  addBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtnTxt: { fontSize: 13, fontWeight: '800', color: colors.white },
});
const mStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgLight },
  header: { backgroundColor: colors.navy, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'space-between' },
  closeBtn: { width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '800', color: colors.white, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  saveBtn: { backgroundColor: colors.red, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, minWidth: 56, alignItems: 'center' },
  saveTxt: { fontSize: 12, fontWeight: '800', color: colors.white },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: { width: '47%', borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white, gap: 4 },
  typeChipTxt: { fontSize: 11, fontWeight: '700', color: colors.muted },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.white, borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: colors.border },
});
const tcStyles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: colors.border },
  top: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  icon: { width: 48, height: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 13, fontWeight: '700', color: colors.navy },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 5, alignItems: 'center' },
  badge: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
  zone: { fontSize: 10, color: colors.muted, fontWeight: '700' },
  stats: { flexDirection: 'row', backgroundColor: colors.bgLight, borderRadius: 10, padding: 10, marginBottom: 10, alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '800', color: colors.navy },
  statLbl: { fontSize: 10, fontWeight: '700', color: colors.muted, marginTop: 2 },
  statDiv: { width: 1, height: 28, backgroundColor: colors.border },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, backgroundColor: colors.bgLight, borderRadius: 10, paddingVertical: 9, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnTxt: { fontSize: 11, fontWeight: '700', color: colors.navy },
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
  errorBanner: { backgroundColor: '#fff0f0', borderWidth: 1.5, borderColor: '#f6b5b5', borderRadius: 14, padding: 12, marginBottom: 10 },
  errorText: { fontSize: 11, fontWeight: '700', color: colors.red },
});
