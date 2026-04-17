import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';

import { employeeApi } from '../../api/employee';
import { parseApiError } from '../../api/client';
import { AppIcon } from '../../components/AppIcon';
import { parseTicketQrPayload } from '../../lib/ticketQr';
import { colors } from '../../theme/colors';
import type { EmployeeScheduleShiftDto } from '../../types/employee';

function formatDateTime(value: string) {
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

function pickActiveShift(shifts: EmployeeScheduleShiftDto[]) {
  return shifts.find((shift) => shift.status === 'IN_PROGRESS') ?? null;
}

export function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [loadingShift, setLoadingShift] = useState(true);
  const [activeShift, setActiveShift] = useState<EmployeeScheduleShiftDto | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedValue, setScannedValue] = useState<string | null>(null);

  const parsedTicket = useMemo(
    () => (scannedValue ? parseTicketQrPayload(scannedValue) : null),
    [scannedValue],
  );

  const loadShiftContext = useCallback(async () => {
    setLoadingShift(true);
    try {
      const res = await employeeApi.getSchedule();
      setActiveShift(pickActiveShift(res.data.data.shifts));
      setScanError(null);
    } catch (err) {
      setScanError(parseApiError(err).message);
      setActiveShift(null);
    } finally {
      setLoadingShift(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadShiftContext();
    }, [loadShiftContext]),
  );

  const handleScan = useCallback((result: BarcodeScanningResult) => {
    setScannedValue(result.data);
  }, []);

  const isMatchingTransport = parsedTicket && activeShift?.transportName
    ? parsedTicket.transportName.trim().toLowerCase() === activeShift.transportName.trim().toLowerCase()
    : null;

  if (!permission) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <ActivityIndicator color={colors.amber} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <Text style={s.title}>Scanner QR</Text>
          <Text style={s.subtitle}>Le scanner a besoin de la camera pour lire les billets.</Text>
        </View>
        <View style={s.permissionCard}>
          <AppIcon family="Feather" name="camera" size={34} color={colors.amber} />
          <Text style={s.permissionTitle}>Autorisation requise</Text>
          <Text style={s.permissionText}>Autorisez la camera pour scanner les QR codes des billets voyageurs.</Text>
          <TouchableOpacity style={s.allowBtn} onPress={requestPermission} activeOpacity={0.88}>
            <Text style={s.allowBtnText}>Autoriser la camera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Scanner QR</Text>
        <Text style={s.subtitle}>Lecture locale du QR et affichage du billet scanne pour controle visuel.</Text>
      </View>

      <View style={s.cameraWrap}>
        <CameraView
          style={s.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scannedValue ? undefined : handleScan}
        />
        <View pointerEvents="none" style={s.overlay}>
          <View style={s.targetFrame} />
          <Text style={s.overlayText}>Cadrez le QR du billet dans le rectangle</Text>
        </View>
      </View>

      <View style={s.panel}>
        <View style={s.panelHeader}>
          <Text style={s.panelTitle}>Contexte du service</Text>
          <TouchableOpacity style={s.reloadBtn} onPress={loadShiftContext} activeOpacity={0.88}>
            <AppIcon family="Feather" name="refresh-cw" size={14} color={colors.navy} />
          </TouchableOpacity>
        </View>

        {loadingShift ? (
          <ActivityIndicator color={colors.amber} />
        ) : scanError ? (
          <Text style={s.errorText}>{scanError}</Text>
        ) : activeShift ? (
          <>
            <Text style={s.serviceName}>{activeShift.transportName ?? 'Service actif'}</Text>
            <Text style={s.serviceMeta}>
              {activeShift.transportType ?? 'Transport'} • {activeShift.transportZone ?? 'Zone -'}
            </Text>
            <Text style={s.serviceMeta}>Demarre le {activeShift.actualStart ? formatDateTime(activeShift.actualStart) : '--'}</Text>
          </>
        ) : (
          <Text style={s.helperText}>Aucun service en cours. Le scanner fonctionne quand meme, mais il ne peut pas comparer le billet a une ligne active.</Text>
        )}
      </View>

      <View style={s.panel}>
        <Text style={s.panelTitle}>Resultat du scan</Text>
        {!scannedValue ? (
          <Text style={s.helperText}>Aucun QR scanne pour le moment.</Text>
        ) : parsedTicket ? (
          <>
            <View style={[s.resultBadge, isMatchingTransport === true && s.resultBadgeOk, isMatchingTransport === false && s.resultBadgeWarn]}>
              <Text style={s.resultBadgeText}>
                {isMatchingTransport === true
                  ? 'Billet coherent avec le service actif'
                  : isMatchingTransport === false
                    ? 'Transport du billet different du service actif'
                    : 'Billet decode'}
              </Text>
            </View>
            <View style={s.ticketGrid}>
              <View style={s.ticketTile}>
                <Text style={s.ticketLabel}>Ticket ID</Text>
                <Text style={s.ticketValue}>{parsedTicket.ticketId}</Text>
              </View>
              <View style={s.ticketTile}>
                <Text style={s.ticketLabel}>Statut</Text>
                <Text style={s.ticketValue}>{parsedTicket.status}</Text>
              </View>
              <View style={s.ticketTile}>
                <Text style={s.ticketLabel}>Ligne</Text>
                <Text style={s.ticketValue}>{parsedTicket.transportName}</Text>
              </View>
              <View style={s.ticketTile}>
                <Text style={s.ticketLabel}>Trajet</Text>
                <Text style={s.ticketValue}>{parsedTicket.fromStop} vers {parsedTicket.toStop}</Text>
              </View>
              <View style={s.ticketTile}>
                <Text style={s.ticketLabel}>Achat</Text>
                <Text style={s.ticketValue}>{formatDateTime(parsedTicket.purchasedAt)}</Text>
              </View>
              <View style={s.ticketTile}>
                <Text style={s.ticketLabel}>Depart prevu</Text>
                <Text style={s.ticketValue}>{formatDateTime(parsedTicket.plannedDeparture)}</Text>
              </View>
            </View>
            <Text style={s.noteText}>
              Ce QR est decode localement depuis le format genere cote client. Aucun endpoint backend de validation/consommation de billet n existe encore dans le projet actuel.
            </Text>
          </>
        ) : (
          <>
            <Text style={s.errorText}>Le QR a ete lu, mais son format ne correspond pas au payload billet actuel.</Text>
            <Text style={s.rawText}>{scannedValue}</Text>
          </>
        )}

        <TouchableOpacity style={s.scanAgainBtn} onPress={() => setScannedValue(null)} activeOpacity={0.88}>
          <Text style={s.scanAgainText}>Scanner a nouveau</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 14 },
  title: { fontSize: 22, fontWeight: '800', color: colors.white },
  subtitle: { fontSize: 12, color: colors.muted, marginTop: 4, maxWidth: 320 },
  permissionCard: {
    margin: 14,
    borderRadius: 20,
    backgroundColor: colors.white,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  permissionTitle: { fontSize: 16, fontWeight: '800', color: colors.navy, marginTop: 12 },
  permissionText: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  allowBtn: {
    marginTop: 18,
    backgroundColor: colors.red,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  allowBtnText: { fontSize: 12, fontWeight: '800', color: colors.white },
  cameraWrap: {
    marginHorizontal: 14,
    borderRadius: 22,
    overflow: 'hidden',
    height: 280,
    backgroundColor: '#091221',
    position: 'relative',
  },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(9,18,33,0.18)',
  },
  targetFrame: {
    width: 220,
    height: 220,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: colors.amber,
    backgroundColor: 'transparent',
  },
  overlayText: {
    marginTop: 16,
    backgroundColor: 'rgba(15,35,84,0.82)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  panel: {
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { fontSize: 15, fontWeight: '800', color: colors.navy },
  reloadBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceName: { fontSize: 14, fontWeight: '800', color: colors.navy, marginTop: 10 },
  serviceMeta: { fontSize: 11, color: colors.muted, marginTop: 4 },
  helperText: { fontSize: 11, color: colors.muted, marginTop: 10, lineHeight: 17 },
  errorText: { fontSize: 11, fontWeight: '700', color: colors.red, marginTop: 10, lineHeight: 17 },
  resultBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: colors.blue,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resultBadgeOk: { backgroundColor: colors.green },
  resultBadgeWarn: { backgroundColor: colors.red },
  resultBadgeText: { fontSize: 10, fontWeight: '800', color: colors.white },
  ticketGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  ticketTile: { width: '48%', backgroundColor: colors.bg, borderRadius: 12, padding: 10 },
  ticketLabel: { fontSize: 10, fontWeight: '700', color: colors.muted, marginBottom: 3 },
  ticketValue: { fontSize: 11, fontWeight: '700', color: colors.navy },
  noteText: { fontSize: 11, color: colors.muted, marginTop: 12, lineHeight: 17 },
  rawText: {
    fontSize: 10,
    color: colors.navy,
    marginTop: 10,
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: 10,
  },
  scanAgainBtn: {
    marginTop: 14,
    backgroundColor: colors.bgLight,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  scanAgainText: { fontSize: 12, fontWeight: '800', color: colors.navy },
});
