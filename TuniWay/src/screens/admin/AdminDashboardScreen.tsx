import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { adminDashboardApi, adminPlanningApi, adminShiftApi } from '../../api/admin';
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
  { id: '1', action: 'Staff account created', detail: 'Karim Ben Ali · EMPLOYEE', time: '2m ago', dot: colors.green },
  { id: '2', action: 'Transport updated', detail: 'Line 5 · Zone A stops modified', time: '18m ago', dot: colors.blue },
  { id: '3', action: 'Shift reassigned', detail: 'Bus #12 → Driver Mejri', time: '1h ago', dot: colors.amber },
  { id: '4', action: 'Planning published', detail: '3 shifts for tomorrow', time: '2h ago', dot: colors.red },
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
      'Publish Planning',
      'Publish all scheduled shifts now?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          onPress: async () => {
            setPublishing(true);
            try {
              const shiftsRes = await adminShiftApi.list();
              const shiftIds = shiftsRes.data
                .filter((shift) => shift.status === 'SCHEDULED')
                .map((shift) => shift.id);

              if (shiftIds.length === 0) {
                Alert.alert('Nothing to publish', 'There are no scheduled shifts waiting to go live.');
                return;
              }

              await adminPlanningApi.publish({ shiftIds });
              await load();
              Alert.alert('Published', 'Planning changes are now live.');
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message ?? 'Failed to publish planning');
            } finally {
              setPublishing(false);
            }
          },
        },
      ]
    );
  }, [load]);

  const handleQuickAction = useCallback((label: string) => {
    if (label === 'Add Staff') {
      navigation.navigate('AdminStaff');
      return;
    }
    if (label === 'New Transport') {
      navigation.navigate('AdminTransports');
      return;
    }
    if (label === 'Plan Shifts') {
      navigation.navigate('AdminPlanning');
      return;
    }
    if (label === 'Publish Plan') {
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
            <Text style={styles.logoSub}>ADMIN CONSOLE</Text>
          </View>
        </View>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeTxt}>ADMIN</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroGreeting}>Control Panel</Text>
        <Text style={styles.heroTitle}>Operations Overview</Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{stats.activeStaff}</Text>
            <Text style={styles.heroStatLbl}>Active Staff</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{stats.activeTransports}</Text>
            <Text style={styles.heroStatLbl}>Live Transports</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{stats.shiftsActive}</Text>
            <Text style={styles.heroStatLbl}>Active Shifts</Text>
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
            <Text style={styles.sectionTitle}>Staff Overview</Text>
            <View style={styles.tileGrid}>
              <StatTile label="Total" value={stats.totalStaff} accent={colors.blue} />
              <StatTile label="Active" value={stats.activeStaff} accent={colors.green} />
              <StatTile label="Employees" value={stats.employeeCount} accent={colors.navy} />
              <StatTile label="Admins" value={stats.adminCount} accent={colors.amber} />
            </View>

            <Text style={styles.sectionTitle}>Transport Fleet</Text>
            <View style={styles.fleetRow}>
              <View style={styles.fleetCard}>
                <Text style={styles.fleetVal}>{stats.totalTransports}</Text>
                <Text style={styles.fleetLbl}>Total Transports</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.round(activeRatio * 100)}%` as const }]} />
                </View>
                <Text style={styles.fleetSub}>
                  {stats.activeTransports} active · {stats.totalTransports - stats.activeTransports} idle
                </Text>
              </View>
              <View style={styles.shiftCol}>
                {([
                  { lbl: 'Pending', val: stats.shiftsPending, color: colors.amber },
                  { lbl: 'Active', val: stats.shiftsActive, color: colors.green },
                  { lbl: 'Done', val: stats.shiftsCompleted, color: colors.blue },
                ] as const).map((row) => (
                  <View key={row.lbl} style={[styles.shiftChip, { borderLeftColor: row.color }]}>
                    <Text style={styles.shiftChipVal}>{row.val}</Text>
                    <Text style={styles.shiftChipLbl}>{row.lbl}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.secHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AdminPlanning')}>
                <Text style={styles.secLink}>See all</Text>
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

            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.qaGrid}>
              {([
                { icon: '👤', label: 'Add Staff', sub: 'Create account', bg: '#ffe8e3' },
                { icon: '🚌', label: 'New Transport', sub: 'Add line', bg: colors.bgLight },
                { icon: '📆', label: 'Plan Shifts', sub: 'Scheduling', bg: '#eaf3de' },
                { icon: '🚀', label: 'Publish Plan', sub: 'Go live', bg: 'rgba(245,166,35,0.15)' },
              ] as const).map((qa) => (
                <TouchableOpacity
                  key={qa.label}
                  style={styles.qaCard}
                  onPress={() => handleQuickAction(qa.label)}
                  disabled={publishing && qa.label === 'Publish Plan'}
                >
                  <View style={[styles.qaIcon, { backgroundColor: qa.bg }]}>
                    {publishing && qa.label === 'Publish Plan'
                      ? <ActivityIndicator color={colors.red} size="small" />
                      : <Text style={{ fontSize: 22 }}>{qa.icon}</Text>}
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
  safe:    { flex: 1, backgroundColor: colors.navy },
  topbar:       { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBadge:    { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  logoBadgeTxt: { color: colors.white, fontSize: 10, fontWeight: '800' },
  logoText:     { fontSize: 14, fontWeight: '800', color: colors.white },
  logoAccent:   { color: colors.amber },
  logoSub:      { fontSize: 8, fontWeight: '700', color: '#6ec0f5', letterSpacing: 2 },
  adminBadge:   { backgroundColor: 'rgba(245,166,35,0.18)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  adminBadgeTxt:{ fontSize: 11, fontWeight: '800', color: colors.amber },
  hero:         { paddingHorizontal: 14, paddingBottom: 16 },
  heroGreeting: { fontSize: 12, fontWeight: '700', color: colors.muted },
  heroTitle:    { fontSize: 18, fontWeight: '800', color: colors.white, marginBottom: 12 },
  heroStats:    { flexDirection: 'row', gap: 8 },
  heroStat:     { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, alignItems: 'center' },
  heroStatVal:  { fontSize: 18, fontWeight: '800', color: colors.white },
  heroStatLbl:  { fontSize: 10, fontWeight: '700', color: colors.muted, marginTop: 3, textAlign: 'center' },
  body:         { flex: 1, backgroundColor: colors.bgLight },
  bodyContent:  { padding: 12, paddingBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.navy, marginBottom: 8, marginTop: 4 },
  secHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 4 },
  secLink:      { fontSize: 11, fontWeight: '700', color: colors.blue },
  tileGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statTile:     { width: '47%', backgroundColor: colors.white, borderRadius: 14, padding: 13, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  statTileVal:  { fontSize: 22, fontWeight: '800' },
  statTileLbl:  { fontSize: 11, fontWeight: '700', color: colors.navy, marginTop: 2 },
  fleetRow:     { flexDirection: 'row', gap: 8, marginBottom: 16 },
  fleetCard:    { flex: 1.3, backgroundColor: colors.navy, borderRadius: 14, padding: 14 },
  fleetVal:     { fontSize: 28, fontWeight: '800', color: colors.white },
  fleetLbl:     { fontSize: 11, fontWeight: '700', color: colors.muted, marginTop: 2 },
  progressTrack:{ height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, marginTop: 10, marginBottom: 6 },
  progressFill: { height: 5, backgroundColor: colors.amber, borderRadius: 3 },
  fleetSub:     { fontSize: 10, color: colors.muted },
  shiftCol:     { flex: 1, gap: 6 },
  shiftChip:    { flex: 1, backgroundColor: colors.white, borderRadius: 10, padding: 10, borderLeftWidth: 3, borderWidth: 1.5, borderColor: colors.border, justifyContent: 'center' },
  shiftChipVal: { fontSize: 18, fontWeight: '800', color: colors.navy },
  shiftChipLbl: { fontSize: 10, fontWeight: '700', color: colors.muted },
  actRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 12, padding: 12, marginBottom: 6, borderWidth: 1.5, borderColor: colors.border, gap: 10 },
  actDot:       { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  actBody:      { flex: 1 },
  actAction:    { fontSize: 12, fontWeight: '700', color: colors.navy },
  actDetail:    { fontSize: 11, color: colors.muted, marginTop: 2 },
  actTime:      { fontSize: 10, fontWeight: '700', color: colors.muted },
  qaGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  qaCard:       { width: '47%', backgroundColor: colors.white, borderRadius: 16, padding: 13, gap: 7, borderWidth: 1.5, borderColor: colors.border },
  qaIcon:       { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  qaLabel:      { fontSize: 12, fontWeight: '700', color: colors.navy, lineHeight: 16 },
  qaSub:        { fontSize: 10, color: colors.muted },
});
