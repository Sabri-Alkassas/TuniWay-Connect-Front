import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { clientTransportApi, parseApiError } from '../../api/client';
import { colors } from '../../theme/colors';
import type {
  ClientTransportDetailsResponse,
  ClientTransportStopDto,
  ClientTransportDepartureDto,
} from '../../types/client';
import type { UserStackParamList } from '../../navigation/types';
import { AppIcon } from '../../components/AppIcon';

type Nav = NativeStackNavigationProp<UserStackParamList>;
type Route = { params: { transportId: string } };
type Tab = 'stops' | 'departures';

const TYPE_COLOR: Record<string, string> = {
  BUS: colors.red,
  TRAIN: colors.green,
  METRO: colors.blue,
};

const TYPE_ICON: Record<string, string> = {
  BUS: 'bus',
  TRAIN: 'train',
  METRO: 'subway-variant',
};

function formatDateParam(date: Date) {
  return date.toISOString().slice(0, 10);
}

interface StopsTabProps {
  stops: ClientTransportStopDto[];
  onBuyPress: () => void;
}

function StopsTab({ stops, onBuyPress }: StopsTabProps) {
  if (stops.length === 0) {
    return (
      <View style={sd.empty}>
        <AppIcon family="Feather" name="map-pin" size={36} color={colors.muted} />
        <Text style={sd.emptyTxt}>Aucun arrêt disponible</Text>
      </View>
    );
  }

  return (
    <>
      {stops.map((stop, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === stops.length - 1;
        return (
          <View key={stop.id} style={sd.row}>
            <View style={sd.timeline}>
              <View style={[
                sd.dot,
                isFirst && { backgroundColor: colors.red },
                isLast && { backgroundColor: colors.green },
              ]} />
              {!isLast && <View style={sd.connector} />}
            </View>
            <TouchableOpacity style={sd.content} onPress={onBuyPress} activeOpacity={0.8}>
              <View style={{ flex: 1 }}>
                <Text style={sd.stopOrder}>Arrêt {stop.stopOrder}</Text>
                <Text style={sd.stopName}>{stop.name}</Text>
                <Text style={sd.stopZone}>Zone {stop.zone}</Text>
              </View>
              <View style={[sd.statePill, stop.active ? sd.statePillActive : sd.statePillMuted]}>
                <Text style={[sd.stateText, stop.active ? sd.stateTextActive : sd.stateTextMuted]}>
                  {stop.active ? 'Disponible' : 'Inactif'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        );
      })}
    </>
  );
}

const sd = StyleSheet.create({
  row: { flexDirection: 'row', minHeight: 64 },
  timeline: { width: 32, alignItems: 'center', paddingTop: 16 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.navy, borderWidth: 2, borderColor: colors.white },
  connector: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingRight: 4, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 },
  stopOrder: { fontSize: 10, fontWeight: '700', color: colors.muted, marginBottom: 2 },
  stopName: { fontSize: 13, fontWeight: '700', color: colors.navy },
  stopZone: { fontSize: 10, color: colors.muted, marginTop: 2 },
  statePill: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  statePillActive: { backgroundColor: colors.bgLight },
  statePillMuted: { backgroundColor: colors.bgLight },
  stateText: { fontSize: 10, fontWeight: '700' },
  stateTextActive: { color: colors.red },
  stateTextMuted: { color: colors.muted },
  empty: { alignItems: 'center', paddingTop: 48, gap: 10 },
  emptyTxt: { fontSize: 14, fontWeight: '700', color: colors.muted },
});

interface DeparturesTabProps {
  date: Date;
  departures: ClientTransportDepartureDto[];
  loading: boolean;
  error: string | null;
  onOpenPicker: () => void;
}

function DeparturesTab({ date, departures, loading, error, onOpenPicker }: DeparturesTabProps) {
  const todayParam = formatDateParam(date);
  const now = new Date();

  return (
    <>
      <View style={dd.dateRow}>
        <TouchableOpacity style={dd.datePill} onPress={onOpenPicker} activeOpacity={0.8}>
          <AppIcon family="Feather" name="calendar" size={14} color={colors.navy} />
          <Text style={dd.dateTxt}>{todayParam}</Text>
        </TouchableOpacity>
      </View>

      {!!error && (
        <View style={dd.errorBanner}>
          <Text style={dd.errorTxt}>{error}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.amber} style={{ marginTop: 24 }} />
      ) : departures.length === 0 ? (
        <View style={dd.empty}>
          <AppIcon family="Feather" name="clock" size={36} color={colors.muted} />
          <Text style={dd.emptyTxt}>Aucun départ pour cette date</Text>
        </View>
      ) : (
        departures.map((dep, index) => {
          const depTime = new Date(`${todayParam}T${dep.departureTime}`);
          const isPast = depTime < now;
          const statusColor =
            dep.status === 'DELAYED' ? colors.amber :
            dep.status === 'CANCELLED' ? colors.red :
            colors.green;

          return (
            <View key={`${dep.id}-${dep.departureTime}-${index}`} style={[dd.row, isPast && dd.rowPast]}>
              <View style={dd.timeCol}>
                <Text style={[dd.time, isPast && dd.timePast]}>{dep.departureTime}</Text>
                <Text style={dd.arrival}>Vers {dep.arrivalTime ?? dep.expectedArrivalTime ?? '--:--'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={dd.direction} numberOfLines={1}>{dep.direction ?? 'Service programmé'}</Text>
              </View>
              <View style={[dd.statusBadge, { backgroundColor: `${statusColor}18` }]}>
                <Text style={[dd.statusTxt, { color: statusColor }]}>
                  {isPast ? 'Passé' : dep.status ?? 'ON_TIME'}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </>
  );
}

const dd = StyleSheet.create({
  dateRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: colors.border },
  dateTxt: { fontSize: 13, fontWeight: '700', color: colors.navy },
  errorBanner: { backgroundColor: colors.redLt, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1.5, borderColor: '#f1b5b5' },
  errorTxt: { fontSize: 11, fontWeight: '700', color: colors.red },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 12, padding: 12, marginBottom: 6, borderWidth: 1.5, borderColor: colors.border, gap: 12 },
  rowPast: { opacity: 0.5 },
  timeCol: { minWidth: 72 },
  time: { fontSize: 16, fontWeight: '800', color: colors.navy },
  timePast: { color: colors.muted },
  arrival: { fontSize: 10, color: colors.muted, marginTop: 2 },
  direction: { fontSize: 11, fontWeight: '700', color: colors.navy },
  statusBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  statusTxt: { fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyTxt: { fontSize: 13, fontWeight: '700', color: colors.muted },
});

export function TransportDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute() as unknown as Route;
  const { transportId } = route.params;

  const [detail, setDetail] = useState<ClientTransportDetailsResponse | null>(null);
  const [stops, setStops] = useState<ClientTransportStopDto[]>([]);
  const [departures, setDepartures] = useState<ClientTransportDepartureDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDepartures, setLoadingDepartures] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departuresError, setDeparturesError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('stops');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const loadHeaderAndStops = useCallback(async () => {
    setLoading(true);
    try {
      const [detailRes, stopsRes] = await Promise.all([
        clientTransportApi.get(transportId),
        clientTransportApi.getStops(transportId),
      ]);
      setDetail(detailRes.data.data);
      setStops(stopsRes.data.data.stops ?? []);
      setError(null);
    } catch (err) {
      setError(parseApiError(err).message);
      setDetail(null);
      setStops([]);
    } finally {
      setLoading(false);
    }
  }, [transportId]);

  const loadDepartures = useCallback(async (date: Date) => {
    setLoadingDepartures(true);
    try {
      const res = await clientTransportApi.getDepartures(transportId, formatDateParam(date));
      setDepartures(res.data.data.departures ?? []);
      setDeparturesError(null);
    } catch (err) {
      setDepartures([]);
      setDeparturesError(parseApiError(err).message);
    } finally {
      setLoadingDepartures(false);
    }
  }, [transportId]);

  useEffect(() => { loadHeaderAndStops(); }, [loadHeaderAndStops]);
  useEffect(() => { loadDepartures(selectedDate); }, [loadDepartures, selectedDate]);

  const onDateChange = (event: DateTimePickerEvent, nextDate?: Date) => {
    if (Platform.OS !== 'ios') setShowPicker(false);
    if (event.type === 'set' && nextDate) setSelectedDate(nextDate);
  };

  const typeColor = detail ? (TYPE_COLOR[detail.type] ?? colors.muted) : colors.muted;
  const typeIcon = detail ? (TYPE_ICON[detail.type] ?? 'bus') : 'bus';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <AppIcon family="Feather" name="chevron-left" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.topTitle} numberOfLines={1}>
          {detail?.name ?? 'Détail du trajet'}
        </Text>
        <View style={{ width: 34 }} />
      </View>

      {detail && (
        <View style={[s.hero, { borderBottomColor: typeColor }]}>
          <View style={s.heroRow}>
            <View style={[s.heroIcon, { backgroundColor: `${typeColor}22` }]}>
              <AppIcon family="MaterialCommunityIcons" name={typeIcon as never} size={28} color={typeColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.heroName}>{detail.name}</Text>
              <View style={s.heroMeta}>
                <View style={[s.typeBadge, { backgroundColor: typeColor }]}>
                  <Text style={s.typeBadgeTxt}>{detail.type}</Text>
                </View>
                <Text style={s.zoneText}>Zone {detail.zone}</Text>
                <View style={[s.activePill, { backgroundColor: detail.active ? colors.greenLt : colors.bgLight }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: detail.active ? '#27500A' : colors.muted }}>
                    {detail.active ? 'Actif' : 'Inactif'}
                  </Text>
                </View>
              </View>
              {!!detail.description && <Text style={s.heroDesc} numberOfLines={2}>{detail.description}</Text>}
            </View>
          </View>
        </View>
      )}

      <View style={s.tabs}>
        {(['stops', 'departures'] as Tab[]).map((value) => (
          <TouchableOpacity
            key={value}
            style={[s.tabBtn, tab === value && s.tabBtnOn]}
            onPress={() => setTab(value)}
            activeOpacity={0.8}
          >
            <Text style={[s.tabTxt, tab === value && s.tabTxtOn]}>
              {value === 'stops' ? 'Arrêts' : 'Départs'}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={s.buyTabBtn}
          onPress={() => {
            if (detail) navigation.navigate('BuyTicket', { transportId: detail.id, transportName: detail.name });
          }}
          activeOpacity={0.8}
        >
          <Text style={s.buyTabTxt}>Acheter</Text>
        </TouchableOpacity>
      </View>

      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.amber} size="large" />
        </View>
      ) : error ? (
        <View style={s.centered}>
          <View style={s.errorBanner}>
            <Text style={s.errorTxt}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={loadHeaderAndStops} activeOpacity={0.8}>
              <Text style={s.retryTxt}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView style={s.body} contentContainerStyle={s.bodyContent} showsVerticalScrollIndicator={false}>
          {tab === 'stops' ? (
            <StopsTab
              stops={stops}
              onBuyPress={() => {
                if (detail) {
                  navigation.navigate('BuyTicket', {
                    transportId: detail.id,
                    transportName: detail.name,
                  });
                }
              }}
            />
          ) : (
            <DeparturesTab
              date={selectedDate}
              departures={departures}
              loading={loadingDepartures}
              error={departuresError}
              onOpenPicker={() => setShowPicker(true)}
            />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  topbar: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.white, textAlign: 'center' },
  hero: { paddingHorizontal: 14, paddingBottom: 14, borderBottomWidth: 3 },
  heroRow: { flexDirection: 'row', gap: 12 },
  heroIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  heroName: { fontSize: 15, fontWeight: '800', color: colors.white, marginBottom: 6 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  typeBadge: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeTxt: { fontSize: 10, fontWeight: '800', color: colors.white },
  zoneText: { fontSize: 10, fontWeight: '700', color: colors.muted },
  activePill: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  heroDesc: { fontSize: 11, color: colors.muted, marginTop: 6 },
  tabs: { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnOn: { borderBottomColor: colors.navy },
  tabTxt: { fontSize: 11, fontWeight: '700', color: colors.muted },
  tabTxtOn: { color: colors.navy },
  buyTabBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', backgroundColor: colors.bgLight, borderBottomWidth: 2, borderBottomColor: colors.red },
  buyTabTxt: { fontSize: 11, fontWeight: '700', color: colors.red },
  body: { flex: 1, backgroundColor: colors.bgLight },
  bodyContent: { padding: 14, paddingBottom: 24 },
  centered: { flex: 1, backgroundColor: colors.bgLight, alignItems: 'center', justifyContent: 'center', padding: 20 },
  errorBanner: { backgroundColor: colors.redLt, borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#f1b5b5', gap: 10, width: '100%' },
  errorTxt: { fontSize: 12, fontWeight: '700', color: colors.red },
  retryBtn: { alignSelf: 'flex-start', backgroundColor: colors.navy, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  retryTxt: { fontSize: 11, fontWeight: '800', color: colors.white },
});
