import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { adminDashboardApi, adminPlanningApi, adminShiftApi } from '../../api/admin';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/colors';
import type { AdminDashboardResponse } from '../../types/admin';
import type { AdminTabParamLista } from '../../navigation/types';

const FALLBACK: AdminDashboardResponse = {
  totalStaff: 48,
  activeStaff: 41,
  employeeCount: 43,
  adminCount: 5,
  totalTransports: 24,
  activeTransports: 19,
  shiftsPending: 6,
  shiftsActive: 13,
  shiftsCompleted: 87,
};

const RECENT_ACTIVITY = [
  { id: '1', action: 'Compte agent cree', detail: 'Karim Ben Ali - EMPLOYE', time: 'il y a 2 min', dot: colors.green },
  { id: '2', action: 'Transport mis a jour', detail: 'Ligne 5 - arrets de la zone A modifies', time: 'il y a 18 min', dot: colors.blue },
  { id: '3', action: 'Service reattribue', detail: 'Bus #12 vers Chauffeur Mejri', time: 'il y a 1 h', dot: colors.amber },
  { id: '4', action: 'Planning publie', detail: '3 services pour demain', time: 'il y a 2 h', dot: colors.red },
];

const QUICK_ACTIONS = [
  {
    key: 'addStaff',
    label: 'Ajouter un agent',
    sub: 'Creer un compte',
    bg: '#ffe8e3',
    icon: { family: 'Feather' as const, name: 'user-plus' as const, color: colors.red },
  },
  {
    key: 'newTransport',
    label: 'Nouveau transport',
    sub: 'Ajouter une ligne',
    bg: colors.bgLight,
    icon: { family: 'MaterialIcons' as const, name: 'directions-bus' as const, color: colors.blue },
  },
  {
    key: 'planShifts',
    label: 'Planifier les services',
    sub: 'Affectations',
    bg: '#eaf3de',
    icon: { family: 'Feather' as const, name: 'calendar' as const, color: colors.green },
  },
  {
    key: 'publishPlan',
    label: 'Publier le planning',
    sub: 'Mettre en ligne',
    bg: 'rgba(245,166,35,0.15)',
    icon: { family: 'Feather' as const, name: 'send' as const, color: colors.amber },
  },
];

interface StatTileProps {
  label: string;
  value: number;
  accent?: string;
}

function StatTile({ label, value, accent = colors.amber }: StatTileProps) {
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statTileVal, { color: accent }]}>{value}</Text>
      <Text style={styles.statTileLbl}>{label}</Text>
    </View>
  );
}

export function AdminDashboardScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<AdminTabParamLista>>();
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      const res = await adminDashboardApi.get();
      setData(res.data);
    } catch {
      setData(FALLBACK);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handlePublishPlan = useCallback(() => {
    Alert.alert(
      'Publier le planning',
      'Publier maintenant tous les services planifies ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Publier',
          onPress: async () => {
            setPublishing(true);
            try {
              const shiftsRes = await adminShiftApi.list();
              const shiftIds = shiftsRes.data
                .filter((shift: any) => shift.status === 'SCHEDULED')
                .map((shift: any) => shift.id);

              if (shiftIds.length === 0) {
                Alert.alert('Rien a publier', 'Aucun service planifie n attend une publication.');
                return;
              }

              await adminPlanningApi.publish({ shiftIds });
              await load();
              Alert.alert('Publication terminee', 'Les modifications du planning sont maintenant en ligne.');
            } catch (err: any) {
              Alert.alert('Erreur', err?.response?.data?.message ?? 'Echec de la publication du planning');
            } finally {
              setPublishing(false);
            }
          },
        },
      ]
    );
  }, [load]);

  const handleQuickAction = useCallback((key: string) => {
    if (key === 'addStaff') {
      navigation.navigate('AdminStaff');
      return;
    }
    if (key === 'newTransport') {
      navigation.navigate('AdminTransports');
      return;
    }
    if (key === 'planShifts') {
      navigation.navigate('AdminPlanning');
      return;
    }
    if (key === 'publishPlan') {
      handlePublishPlan();
    }
  }, [handlePublishPlan, navigation]);

  const stats = data ?? FALLBACK;
  const activeRatio = stats.totalTransports > 0
    ? stats.activeTransports / stats.totalTransports
    : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topbar}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}><Text style={styles.logoBadgeTxt}>TW</Text></View>
          <View>
            <Text style={styles.logoText}>Tuni<Text style={styles.logoAccent}>Way</Text></Text>
            <Text style={styles.logoSub}>CONSOLE ADMIN</Text>
          </View>
        </View>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeTxt}>ADMIN</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroGreeting}>Tableau de bord</Text>
        <Text style={styles.heroTitle}>Vue generale des operations</Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{stats.activeStaff}</Text>
            <Text style={styles.heroStatLbl}>Agents actifs</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{stats.activeTransports}</Text>
            <Text style={styles.heroStatLbl}>Transports en service</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{stats.shiftsActive}</Text>
            <Text style={styles.heroStatLbl}>Services actifs</Text>
          </View>
        </View>
      </View>

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
        {loading && !data ? (
          <ActivityIndicator color={colors.amber} style={{ marginTop: 48 }} />
        ) : (
          <>
            <Text style={styles.sectionTitle}>Synthese du personnel</Text>
            <View style={styles.tileGrid}>
              <StatTile label="Total" value={stats.totalStaff} accent={colors.blue} />
              <StatTile label="Actifs" value={stats.activeStaff} accent={colors.green} />
              <StatTile label="Employes" value={stats.employeeCount} accent={colors.navy} />
              <StatTile label="Admins" value={stats.adminCount} accent={colors.amber} />
            </View>

            <Text style={styles.sectionTitle}>Flotte de transport</Text>
            <View style={styles.fleetRow}>
              <View style={styles.fleetCard}>
                <Text style={styles.fleetVal}>{stats.totalTransports}</Text>
                <Text style={styles.fleetLbl}>Transports au total</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.round(activeRatio * 100)}%` as const }]} />
                </View>
                <Text style={styles.fleetSub}>
                  {stats.activeTransports} actifs - {stats.totalTransports - stats.activeTransports} inactifs
                </Text>
              </View>
              <View style={styles.shiftCol}>
                {([
                  { lbl: 'En attente', val: stats.shiftsPending, color: colors.amber },
                  { lbl: 'Actifs', val: stats.shiftsActive, color: colors.green },
                  { lbl: 'Termines', val: stats.shiftsCompleted, color: colors.blue },
                ] as const).map((row) => (
                  <View key={row.lbl} style={[styles.shiftChip, { borderLeftColor: row.color }]}>
                    <Text style={styles.shiftChipVal}>{row.val}</Text>
                    <Text style={styles.shiftChipLbl}>{row.lbl}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.secHeader}>
              <Text style={styles.sectionTitle}>Activite recente</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AdminPlanning')}>
                <Text style={styles.secLink}>Tout voir</Text>
              </TouchableOpacity>
            </View>
            {RECENT_ACTIVITY.map((item) => (
              <View key={item.id} style={styles.actRow}>
                <View style={[styles.actDot, { backgroundColor: item.dot }]} />
                <View style={styles.actBody}>
                  <Text style={styles.actAction}>{item.action}</Text>
                  <Text style={styles.actDetail}>{item.detail}</Text>
                </View>
                <Text style={styles.actTime}>{item.time}</Text>
              </View>
            ))}

            <Text style={styles.sectionTitle}>Actions rapides</Text>
            <View style={styles.qaGrid}>
              {QUICK_ACTIONS.map((qa) => (
                <TouchableOpacity
                  key={qa.key}
                  style={styles.qaCard}
                  onPress={() => handleQuickAction(qa.key)}
                  disabled={publishing && qa.key === 'publishPlan'}
                >
                  <View style={[styles.qaIcon, { backgroundColor: qa.bg }]}>
                    {publishing && qa.key === 'publishPlan'
                      ? <ActivityIndicator color={colors.red} size="small" />
                      : <AppIcon family={qa.icon.family} name={qa.icon.name} size={20} color={qa.icon.color} />}
                  </View>
                  <Text style={styles.qaLabel}>{qa.label}</Text>
                  <Text style={styles.qaSub}>{qa.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  topbar: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBadge: { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  logoBadgeTxt: { color: colors.white, fontSize: 10, fontWeight: '800' },
  logoText: { fontSize: 14, fontWeight: '800', color: colors.white },
  logoAccent: { color: colors.amber },
  logoSub: { fontSize: 8, fontWeight: '700', color: '#6ec0f5', letterSpacing: 2 },
  adminBadge: { backgroundColor: 'rgba(245,166,35,0.18)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  adminBadgeTxt: { fontSize: 11, fontWeight: '800', color: colors.amber },
  hero: { paddingHorizontal: 14, paddingBottom: 16 },
  heroGreeting: { fontSize: 12, fontWeight: '700', color: colors.muted },
  heroTitle: { fontSize: 18, fontWeight: '800', color: colors.white, marginBottom: 12 },
  heroStats: { flexDirection: 'row', gap: 8 },
  heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, alignItems: 'center' },
  heroStatVal: { fontSize: 18, fontWeight: '800', color: colors.white },
  heroStatLbl: { fontSize: 10, fontWeight: '700', color: colors.muted, marginTop: 3, textAlign: 'center' },
  body: { flex: 1, backgroundColor: colors.bgLight },
  bodyContent: { padding: 12, paddingBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.navy, marginBottom: 8, marginTop: 4 },
  secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 4 },
  secLink: { fontSize: 11, fontWeight: '700', color: colors.blue },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statTile: { width: '47%', backgroundColor: colors.white, borderRadius: 14, padding: 13, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  statTileVal: { fontSize: 22, fontWeight: '800' },
  statTileLbl: { fontSize: 11, fontWeight: '700', color: colors.navy, marginTop: 2 },
  fleetRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  fleetCard: { flex: 1.3, backgroundColor: colors.navy, borderRadius: 14, padding: 14 },
  fleetVal: { fontSize: 28, fontWeight: '800', color: colors.white },
  fleetLbl: { fontSize: 11, fontWeight: '700', color: colors.muted, marginTop: 2 },
  progressTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, marginTop: 10, marginBottom: 6 },
  progressFill: { height: 5, backgroundColor: colors.amber, borderRadius: 3 },
  fleetSub: { fontSize: 10, color: colors.muted },
  shiftCol: { flex: 1, gap: 6 },
  shiftChip: { flex: 1, backgroundColor: colors.white, borderRadius: 10, padding: 10, borderLeftWidth: 3, borderWidth: 1.5, borderColor: colors.border, justifyContent: 'center' },
  shiftChipVal: { fontSize: 18, fontWeight: '800', color: colors.navy },
  shiftChipLbl: { fontSize: 10, fontWeight: '700', color: colors.muted },
  actRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 12, padding: 12, marginBottom: 6, borderWidth: 1.5, borderColor: colors.border, gap: 10 },
  actDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  actBody: { flex: 1 },
  actAction: { fontSize: 12, fontWeight: '700', color: colors.navy },
  actDetail: { fontSize: 11, color: colors.muted, marginTop: 2 },
  actTime: { fontSize: 10, fontWeight: '700', color: colors.muted },
  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  qaCard: { width: '47%', backgroundColor: colors.white, borderRadius: 16, padding: 13, gap: 7, borderWidth: 1.5, borderColor: colors.border },
  qaIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontSize: 12, fontWeight: '700', color: colors.navy, lineHeight: 16 },
  qaSub: { fontSize: 10, color: colors.muted },
});
