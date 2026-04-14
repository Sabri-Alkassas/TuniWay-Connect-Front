import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';

import { employeeApi } from '../../api/employee';
import { parseApiError } from '../../api/client';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/colors';
import type {
  EmployeeShiftProgressResponse,
  EmployeeShiftStatus,
  EmployeeShiftStopDto,
  EmployeeStopStatus,
  EmployeeScheduleShiftDto,
} from '../../types/employee';

const LOCATION_SYNC_INTERVAL_MS = 30000;

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

function formatTime(value: string | null) {
  if (!value) return '--:--';
  try {
    return new Date(value).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return value;
  }
}

function getShiftStatusColor(status: EmployeeShiftStatus) {
  switch (status) {
    case 'IN_PROGRESS':
      return colors.green;
    case 'COMPLETED':
      return colors.blue;
    default:
      return colors.amber;
  }
}

function getShiftStatusLabel(status: EmployeeShiftStatus) {
  switch (status) {
    case 'IN_PROGRESS':
      return 'En service';
    case 'COMPLETED':
      return 'Termine';
    default:
      return 'Planifie';
  }
}

function getStopStatusColor(status: EmployeeStopStatus) {
  switch (status) {
    case 'ARRIVED':
      return colors.amber;
    case 'DEPARTED':
      return colors.green;
    case 'SKIPPED':
      return colors.red;
    default:
      return colors.blue;
  }
}

function getStopStatusLabel(status: EmployeeStopStatus) {
  switch (status) {
    case 'ARRIVED':
      return 'Arrive';
    case 'DEPARTED':
      return 'Passe';
    case 'SKIPPED':
      return 'Ignore';
    default:
      return 'En attente';
  }
}

function pickPrimaryShift(shifts: EmployeeScheduleShiftDto[]) {
  return (
    shifts.find((shift) => shift.status === 'IN_PROGRESS') ??
    shifts.find((shift) => shift.status === 'SCHEDULED') ??
    shifts[0] ??
    null
  );
}

function canArrive(status: EmployeeStopStatus) {
  return status === 'PENDING';
}

function canDepart(status: EmployeeStopStatus) {
  return status === 'PENDING' || status === 'ARRIVED';
}

export function DriverHomeScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [syncingLocation, setSyncingLocation] = useState(false);
  const [schedule, setSchedule] = useState<EmployeeScheduleShiftDto[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [stops, setStops] = useState<EmployeeShiftStopDto[]>([]);
  const [progress, setProgress] = useState<EmployeeShiftProgressResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);

  const selectedShift = useMemo(
    () => schedule.find((shift) => shift.shiftId === selectedShiftId) ?? null,
    [schedule, selectedShiftId],
  );

  const loadShiftDetails = useCallback(async (shiftId: string) => {
    const [stopsRes, progressRes] = await Promise.all([
      employeeApi.getStops(shiftId),
      employeeApi.getProgress(shiftId),
    ]);
    setStops(stopsRes.data.data.stops);
    setProgress(progressRes.data.data);
  }, []);

  const loadAll = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const scheduleRes = await employeeApi.getSchedule();
      const shifts = scheduleRes.data.data.shifts;
      setSchedule(shifts);
      setError(null);

      const targetShiftId =
        (selectedShiftId && shifts.some((shift) => shift.shiftId === selectedShiftId) ? selectedShiftId : null) ??
        pickPrimaryShift(shifts)?.shiftId ??
        null;

      setSelectedShiftId(targetShiftId);

      if (targetShiftId) {
        await loadShiftDetails(targetShiftId);
      } else {
        setStops([]);
        setProgress(null);
      }
    } catch (err) {
      setError(parseApiError(err).message);
      setSchedule([]);
      setStops([]);
      setProgress(null);
    } finally {
      if (!options?.silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [loadShiftDetails, selectedShiftId]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  useEffect(() => {
    if (!selectedShiftId) return;
    loadShiftDetails(selectedShiftId).catch((err) => setError(parseApiError(err).message));
  }, [loadShiftDetails, selectedShiftId]);

  const syncCurrentLocation = useCallback(async (shiftId: string, options?: { silent?: boolean }) => {
    if (!options?.silent) setSyncingLocation(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('L autorisation de localisation est necessaire pour envoyer la position.');
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const res = await employeeApi.updateLocation(
        shiftId,
        current.coords.latitude,
        current.coords.longitude,
      );
      setLocationNote(
        `Position envoyee a ${formatTime(res.data.data.updatedAt)} (${res.data.data.latitude.toFixed(5)}, ${res.data.data.longitude.toFixed(5)})`,
      );
      const progressRes = await employeeApi.getProgress(shiftId);
      setProgress(progressRes.data.data);
    } catch (err) {
      setLocationNote(parseApiError(err).message);
    } finally {
      if (!options?.silent) setSyncingLocation(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedShift || selectedShift.status !== 'IN_PROGRESS') return;

    const intervalId = setInterval(() => {
      syncCurrentLocation(selectedShift.shiftId, { silent: true }).catch(() => undefined);
    }, LOCATION_SYNC_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [selectedShift, syncCurrentLocation]);

  const handleShiftAction = useCallback(async (kind: 'start' | 'end') => {
    if (!selectedShift) return;
    setActionLoading(kind);
    try {
      if (kind === 'start') {
        const res = await employeeApi.startShift(selectedShift.shiftId);
        setLocationNote(res.data.data.message);
        await syncCurrentLocation(selectedShift.shiftId, { silent: true });
      } else {
        const res = await employeeApi.endShift(selectedShift.shiftId);
        setLocationNote(res.data.data.message);
      }
      await loadAll({ silent: true });
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setActionLoading(null);
    }
  }, [loadAll, selectedShift, syncCurrentLocation]);

  const handleStopAction = useCallback(async (stopId: string, kind: 'arrive' | 'depart') => {
    if (!selectedShift) return;
    setActionLoading(`${kind}-${stopId}`);
    try {
      if (kind === 'arrive') {
        await employeeApi.arriveAtStop(selectedShift.shiftId, stopId);
      } else {
        await employeeApi.departFromStop(selectedShift.shiftId, stopId);
      }
      await loadShiftDetails(selectedShift.shiftId);
      setError(null);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setActionLoading(null);
    }
  }, [loadShiftDetails, selectedShift]);

  const inProgressCount = schedule.filter((shift) => shift.status === 'IN_PROGRESS').length;
  const scheduledCount = schedule.filter((shift) => shift.status === 'SCHEDULED').length;
  const completedCount = schedule.filter((shift) => shift.status === 'COMPLETED').length;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hero}>
        <View>
          <Text style={s.brand}>TuniWay Driver</Text>
          <Text style={s.title}>Espace employee</Text>
          <Text style={s.subtitle}>Planning, progression, arrets et position en direct.</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={() => { setRefreshing(true); loadAll(); }} activeOpacity={0.85}>
          <AppIcon family="Feather" name="refresh-cw" size={16} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.body}
        contentContainerStyle={s.bodyContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAll(); }} tintColor={colors.amber} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statValue}>{scheduledCount}</Text>
            <Text style={s.statLabel}>Planifies</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{inProgressCount}</Text>
            <Text style={s.statLabel}>Actifs</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{completedCount}</Text>
            <Text style={s.statLabel}>Termines</Text>
          </View>
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

            {!!locationNote && (
              <View style={s.infoBanner}>
                <Text style={s.infoText}>{locationNote}</Text>
              </View>
            )}

            {schedule.length === 0 ? (
              <View style={s.empty}>
                <AppIcon family="MaterialCommunityIcons" name="calendar-remove-outline" size={36} color={colors.muted} />
                <Text style={s.emptyTitle}>Aucun service assigne</Text>
                <Text style={s.emptySub}>Le planning employee est bien connecte, mais aucun shift n est disponible pour ce compte.</Text>
              </View>
            ) : (
              <>
                <Text style={s.sectionTitle}>Mes services</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.shiftRow}>
                  {schedule.map((shift) => {
                    const active = shift.shiftId === selectedShiftId;
                    return (
                      <TouchableOpacity
                        key={shift.shiftId}
                        style={[s.shiftCard, active && s.shiftCardActive]}
                        onPress={() => setSelectedShiftId(shift.shiftId)}
                        activeOpacity={0.88}
                      >
                        <View style={s.shiftTop}>
                          <Text style={[s.shiftBadge, { backgroundColor: getShiftStatusColor(shift.status) }]}>
                            {getShiftStatusLabel(shift.status)}
                          </Text>
                          <Text style={s.shiftZone}>{shift.transportZone ?? 'Zone -'}</Text>
                        </View>
                        <Text style={s.shiftName} numberOfLines={2}>{shift.transportName ?? 'Transport non defini'}</Text>
                        <Text style={s.shiftMeta}>{shift.transportType ?? 'Transport'} • {formatDateTime(shift.scheduleStart)}</Text>
                        <Text style={s.shiftMeta}>Fin prevue • {formatDateTime(shift.scheduleEnd)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {selectedShift && (
                  <>
                    <View style={s.panel}>
                      <View style={s.panelHeader}>
                        <View>
                          <Text style={s.panelTitle}>{selectedShift.transportName ?? 'Service selectionne'}</Text>
                          <Text style={s.panelSub}>
                            {selectedShift.transportType ?? 'Transport'} • {selectedShift.transportZone ?? 'Zone -'}
                          </Text>
                        </View>
                        <View style={[s.statusChip, { backgroundColor: getShiftStatusColor(selectedShift.status) }]}>
                          <Text style={s.statusChipText}>{getShiftStatusLabel(selectedShift.status)}</Text>
                        </View>
                      </View>

                      <View style={s.detailGrid}>
                        <View style={s.detailTile}>
                          <Text style={s.detailLabel}>Debut prevu</Text>
                          <Text style={s.detailValue}>{formatDateTime(selectedShift.scheduleStart)}</Text>
                        </View>
                        <View style={s.detailTile}>
                          <Text style={s.detailLabel}>Fin prevue</Text>
                          <Text style={s.detailValue}>{formatDateTime(selectedShift.scheduleEnd)}</Text>
                        </View>
                        <View style={s.detailTile}>
                          <Text style={s.detailLabel}>Debut reel</Text>
                          <Text style={s.detailValue}>{formatDateTime(selectedShift.actualStart)}</Text>
                        </View>
                        <View style={s.detailTile}>
                          <Text style={s.detailLabel}>Fin reelle</Text>
                          <Text style={s.detailValue}>{formatDateTime(selectedShift.actualEnd)}</Text>
                        </View>
                      </View>

                      <View style={s.actionRow}>
                        {selectedShift.status === 'SCHEDULED' && (
                          <TouchableOpacity
                            style={[s.primaryBtn, actionLoading === 'start' && s.btnDisabled]}
                            onPress={() => handleShiftAction('start')}
                            disabled={actionLoading === 'start'}
                            activeOpacity={0.88}
                          >
                            {actionLoading === 'start'
                              ? <ActivityIndicator color={colors.white} />
                              : <>
                                  <AppIcon family="Feather" name="play" size={16} color={colors.white} />
                                  <Text style={s.primaryBtnText}>Demarrer le service</Text>
                                </>}
                          </TouchableOpacity>
                        )}

                        {selectedShift.status === 'IN_PROGRESS' && (
                          <>
                            <TouchableOpacity
                              style={[s.secondaryBtn, syncingLocation && s.btnDisabled]}
                              onPress={() => syncCurrentLocation(selectedShift.shiftId)}
                              disabled={syncingLocation}
                              activeOpacity={0.88}
                            >
                              {syncingLocation
                                ? <ActivityIndicator color={colors.navy} />
                                : <>
                                    <AppIcon family="Feather" name="navigation" size={16} color={colors.navy} />
                                    <Text style={s.secondaryBtnText}>Envoyer ma position</Text>
                                  </>}
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[s.primaryBtn, actionLoading === 'end' && s.btnDisabled]}
                              onPress={() => handleShiftAction('end')}
                              disabled={actionLoading === 'end'}
                              activeOpacity={0.88}
                            >
                              {actionLoading === 'end'
                                ? <ActivityIndicator color={colors.white} />
                                : <>
                                    <AppIcon family="Feather" name="square" size={16} color={colors.white} />
                                    <Text style={s.primaryBtnText}>Terminer le service</Text>
                                  </>}
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>

                    <View style={s.panel}>
                      <Text style={s.panelTitle}>Progression</Text>
                      <View style={s.progressRow}>
                        <View style={s.progressTile}>
                          <Text style={s.progressValue}>{progress?.completedStopsCount ?? 0}/{progress?.totalStops ?? stops.length}</Text>
                          <Text style={s.progressLabel}>Arrets traites</Text>
                        </View>
                        <View style={s.progressTile}>
                          <Text style={s.progressValue}>{progress?.delayMinutes ?? 0} min</Text>
                          <Text style={s.progressLabel}>Retard estime</Text>
                        </View>
                      </View>
                      <View style={s.currentStopBox}>
                        <Text style={s.currentStopLabel}>Arret actuel</Text>
                        <Text style={s.currentStopValue}>{progress?.currentStop?.stopName ?? 'Aucun arret en cours'}</Text>
                        <Text style={s.currentStopHint}>Suivant: {progress?.nextStop?.stopName ?? 'Aucun'}</Text>
                        <Text style={s.currentStopHint}>
                          Derniere position: {progress?.currentLocationUpdatedAt ? formatDateTime(progress.currentLocationUpdatedAt) : 'Pas encore envoyee'}
                        </Text>
                      </View>
                    </View>

                    <View style={s.panel}>
                      <Text style={s.panelTitle}>Arrets du service</Text>
                      {stops.length === 0 ? (
                        <Text style={s.emptyInline}>Aucun arret n a encore ete charge pour ce shift.</Text>
                      ) : (
                        stops.map((stop) => {
                          const actionKeyArrive = `arrive-${stop.stopId}`;
                          const actionKeyDepart = `depart-${stop.stopId}`;
                          return (
                            <View key={stop.stopId} style={s.stopCard}>
                              <View style={s.stopTop}>
                                <View style={s.stopOrder}><Text style={s.stopOrderText}>{stop.stopOrder ?? '-'}</Text></View>
                                <View style={{ flex: 1 }}>
                                  <Text style={s.stopName}>{stop.stopName}</Text>
                                  <Text style={s.stopMeta}>Heure prevue: {formatTime(stop.expectedDepartureTime)}</Text>
                                  <Text style={s.stopMeta}>
                                    Arrive: {formatTime(stop.arrivedAt)} • Depart: {formatTime(stop.departedAt)}
                                  </Text>
                                </View>
                                <View style={[s.stopBadge, { backgroundColor: getStopStatusColor(stop.status) }]}>
                                  <Text style={s.stopBadgeText}>{getStopStatusLabel(stop.status)}</Text>
                                </View>
                              </View>

                              {selectedShift.status === 'IN_PROGRESS' && (
                                <View style={s.stopActions}>
                                  <TouchableOpacity
                                    style={[s.stopBtn, !canArrive(stop.status) && s.stopBtnDisabled]}
                                    disabled={!canArrive(stop.status) || actionLoading === actionKeyArrive}
                                    onPress={() => handleStopAction(stop.stopId, 'arrive')}
                                    activeOpacity={0.88}
                                  >
                                    {actionLoading === actionKeyArrive
                                      ? <ActivityIndicator color={colors.navy} size="small" />
                                      : <Text style={s.stopBtnText}>Arrivee</Text>}
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[s.stopBtn, !canDepart(stop.status) && s.stopBtnDisabled]}
                                    disabled={!canDepart(stop.status) || actionLoading === actionKeyDepart}
                                    onPress={() => handleStopAction(stop.stopId, 'depart')}
                                    activeOpacity={0.88}
                                  >
                                    {actionLoading === actionKeyDepart
                                      ? <ActivityIndicator color={colors.navy} size="small" />
                                      : <Text style={s.stopBtnText}>Depart</Text>}
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          );
                        })
                      )}
                    </View>
                  </>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  hero: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  brand: { fontSize: 12, fontWeight: '700', color: colors.amber },
  title: { fontSize: 22, fontWeight: '800', color: colors.white, marginTop: 2 },
  subtitle: { fontSize: 12, color: colors.muted, marginTop: 4, maxWidth: 260 },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, backgroundColor: colors.bgLight },
  bodyContent: { padding: 14, paddingBottom: 28 },
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
  statValue: { fontSize: 24, fontWeight: '800', color: colors.navy },
  statLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, marginTop: 2 },
  errorBanner: {
    backgroundColor: '#fff0f0',
    borderWidth: 1.5,
    borderColor: '#f6b5b5',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { fontSize: 11, fontWeight: '700', color: colors.red },
  infoBanner: {
    backgroundColor: colors.blueLt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  infoText: { fontSize: 11, fontWeight: '700', color: colors.navy },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.navy, marginBottom: 10 },
  shiftRow: { gap: 10, paddingBottom: 4 },
  shiftCard: {
    width: 240,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
  },
  shiftCardActive: {
    borderColor: colors.navy,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  shiftTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  shiftBadge: {
    color: colors.white,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 10,
    fontWeight: '800',
  },
  shiftZone: { fontSize: 11, fontWeight: '700', color: colors.muted },
  shiftName: { fontSize: 15, fontWeight: '800', color: colors.navy, marginBottom: 8 },
  shiftMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  panel: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    marginTop: 14,
  },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  panelTitle: { fontSize: 15, fontWeight: '800', color: colors.navy },
  panelSub: { fontSize: 11, color: colors.muted, marginTop: 3 },
  statusChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  statusChipText: { fontSize: 10, fontWeight: '800', color: colors.white },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailTile: { width: '48%', backgroundColor: colors.bg, borderRadius: 12, padding: 10 },
  detailLabel: { fontSize: 10, fontWeight: '700', color: colors.muted, marginBottom: 3 },
  detailValue: { fontSize: 12, fontWeight: '700', color: colors.navy },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.red,
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.bgLight,
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: { fontSize: 12, fontWeight: '800', color: colors.white },
  secondaryBtnText: { fontSize: 12, fontWeight: '800', color: colors.navy },
  progressRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  progressTile: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  progressValue: { fontSize: 20, fontWeight: '800', color: colors.navy },
  progressLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, marginTop: 2 },
  currentStopBox: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: colors.navy,
    padding: 14,
  },
  currentStopLabel: { fontSize: 11, fontWeight: '700', color: colors.muted },
  currentStopValue: { fontSize: 16, fontWeight: '800', color: colors.white, marginTop: 4 },
  currentStopHint: { fontSize: 11, color: '#d9e3f5', marginTop: 4 },
  stopCard: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  stopTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stopOrder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopOrderText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  stopName: { fontSize: 13, fontWeight: '800', color: colors.navy },
  stopMeta: { fontSize: 10, color: colors.muted, marginTop: 3 },
  stopBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  stopBadgeText: { fontSize: 10, fontWeight: '800', color: colors.white },
  stopActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  stopBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtnDisabled: { opacity: 0.45 },
  stopBtnText: { fontSize: 11, fontWeight: '800', color: colors.navy },
  empty: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    padding: 24,
    marginTop: 18,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.navy, marginTop: 10 },
  emptySub: { fontSize: 12, color: colors.muted, marginTop: 6, textAlign: 'center', lineHeight: 18 },
  emptyInline: { fontSize: 12, color: colors.muted, marginTop: 8 },
});
