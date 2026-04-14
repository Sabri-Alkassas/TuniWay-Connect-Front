import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { employeeApi } from '../../api/employee';
import { parseApiError } from '../../api/client';
import { logout } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/colors';
import type { EmployeeScheduleShiftDto } from '../../types/employee';

function formatDateTime(value: string | null) {
  if (!value) return '--';
  try {
    return new Date(value).toLocaleString('fr-TN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function pickCurrentOrNextShift(shifts: EmployeeScheduleShiftDto[]) {
  return shifts.find((shift) => shift.status === 'IN_PROGRESS')
    ?? shifts.find((shift) => shift.status === 'SCHEDULED')
    ?? null;
}

export function DriverProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shifts, setShifts] = useState<EmployeeScheduleShiftDto[]>([]);

  const loadProfileData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeeApi.getSchedule();
      setShifts(res.data.data.shifts);
      setError(null);
    } catch (err) {
      setError(parseApiError(err).message);
      setShifts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [loadProfileData]),
  );

  const activeCount = shifts.filter((shift) => shift.status === 'IN_PROGRESS').length;
  const upcomingCount = shifts.filter((shift) => shift.status === 'SCHEDULED').length;
  const completedCount = shifts.filter((shift) => shift.status === 'COMPLETED').length;
  const currentOrNext = pickCurrentOrNextShift(shifts);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        style={s.body}
        contentContainerStyle={s.bodyContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProfileData(); }} tintColor={colors.amber} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.hero}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user?.email?.slice(0, 2).toUpperCase() ?? 'EM'}</Text>
          </View>
          <Text style={s.rolePill}>EMPLOYEE</Text>
          <Text style={s.email}>{user?.email ?? 'Compte employee'}</Text>
          <Text style={s.helper}>Ce profil est synchronise avec la session employee connectee.</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.amber} style={{ marginTop: 40 }} />
        ) : (
          <>
            {!!error && (
              <View style={s.errorBanner}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={s.statValue}>{activeCount}</Text>
                <Text style={s.statLabel}>Service actif</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statValue}>{upcomingCount}</Text>
                <Text style={s.statLabel}>A venir</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statValue}>{completedCount}</Text>
                <Text style={s.statLabel}>Historique</Text>
              </View>
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Compte connecte</Text>
              <View style={s.row}>
                <Text style={s.label}>Email</Text>
                <Text style={s.value}>{user?.email ?? '--'}</Text>
              </View>
              <View style={s.row}>
                <Text style={s.label}>Role app</Text>
                <Text style={s.value}>{user?.role ?? '--'}</Text>
              </View>
              <View style={s.row}>
                <Text style={s.label}>ID session</Text>
                <Text style={s.value}>{user?.id || '--'}</Text>
              </View>
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Prochain service utile</Text>
              {currentOrNext ? (
                <>
                  <Text style={s.shiftName}>{currentOrNext.transportName ?? 'Transport non defini'}</Text>
                  <Text style={s.shiftMeta}>{currentOrNext.transportType ?? 'Transport'} • {currentOrNext.transportZone ?? 'Zone -'}</Text>
                  <Text style={s.shiftMeta}>Debut: {formatDateTime(currentOrNext.scheduleStart)}</Text>
                  <Text style={s.shiftMeta}>Fin: {formatDateTime(currentOrNext.scheduleEnd)}</Text>
                  <Text style={s.shiftStatus}>{currentOrNext.status}</Text>
                </>
              ) : (
                <Text style={s.emptyText}>Aucun shift disponible dans le planning actuel.</Text>
              )}
            </View>

            <TouchableOpacity
              style={[s.logoutBtn, loggingOut && s.logoutBtnDisabled]}
              disabled={loggingOut}
              onPress={async () => {
                setLoggingOut(true);
                try {
                  await logout();
                } finally {
                  setLoggingOut(false);
                }
              }}
              activeOpacity={0.88}
            >
              {loggingOut
                ? <ActivityIndicator color={colors.white} />
                : <>
                    <AppIcon family="Feather" name="log-out" size={16} color={colors.white} />
                    <Text style={s.logoutText}>Se deconnecter</Text>
                  </>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  body: { flex: 1, backgroundColor: colors.bgLight },
  bodyContent: { padding: 14, paddingBottom: 28 },
  hero: {
    backgroundColor: colors.navy,
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: colors.navy },
  rolePill: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: colors.amber,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 10,
    fontWeight: '800',
  },
  email: { fontSize: 16, fontWeight: '800', color: colors.white, marginTop: 12 },
  helper: { fontSize: 11, color: colors.muted, marginTop: 6, textAlign: 'center', lineHeight: 17 },
  errorBanner: {
    backgroundColor: '#fff0f0',
    borderWidth: 1.5,
    borderColor: '#f6b5b5',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { fontSize: 11, fontWeight: '700', color: colors.red },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.navy },
  statLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, marginTop: 2 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.navy, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: colors.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 8,
  },
  label: { fontSize: 11, fontWeight: '700', color: colors.muted },
  value: { fontSize: 11, fontWeight: '700', color: colors.navy, flexShrink: 1, textAlign: 'right' },
  shiftName: { fontSize: 14, fontWeight: '800', color: colors.navy },
  shiftMeta: { fontSize: 11, color: colors.muted, marginTop: 5 },
  shiftStatus: { fontSize: 11, fontWeight: '800', color: colors.blue, marginTop: 8 },
  emptyText: { fontSize: 12, color: colors.muted },
  logoutBtn: {
    backgroundColor: colors.red,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoutBtnDisabled: { opacity: 0.75 },
  logoutText: { fontSize: 12, fontWeight: '800', color: colors.white },
});
