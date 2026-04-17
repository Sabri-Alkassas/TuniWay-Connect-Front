import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Modal, Platform,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { clientTransportApi, parseApiError } from '../../api/client';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/colors';
import type {
  ClientNearbyTransportDto,
  ClientTransportDetailsResponse,
  ClientTransportDepartureDto,
  ClientTransportStopDto,
} from '../../types/client';
import type { UserStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<UserStackParamList>;

const DEFAULT_COORDS = { latitude: 36.8190, longitude: 10.1658 };
const MAP_REFRESH_MS = 3000;
const DEFAULT_DELTA = { latitudeDelta: 0.02, longitudeDelta: 0.02 };
const RELOCATE_DELTA = { latitudeDelta: 0.01, longitudeDelta: 0.01 };

const RADIUS_OPTS = [
  { label: '500m', value: 500 },
  { label: '1km', value: 1000 },
  { label: '2km', value: 2000 },
  { label: '5km', value: 5000 },
];

const TYPE_FILTERS = [
  { key: '', label: 'All' },
  { key: 'BUS', label: 'Bus' },
  { key: 'TRAIN', label: 'Train' },
  { key: 'METRO', label: 'Metro' },
];

const TYPE_COLOR: Record<string, string> = {
  BUS: colors.red,
  TRAIN: colors.green,
  METRO: colors.blue,
};

const TYPE_ICON = {
  BUS: 'bus',
  TRAIN: 'train',
  METRO: 'subway-variant',
} as const;

function fmtDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
}

function formatDateParam(date: Date) {
  return date.toISOString().slice(0, 10);
}

interface MarkerCoordinate {
  latitude: number;
  longitude: number;
}

interface DrawerProps {
  item: ClientNearbyTransportDto;
  detail: ClientTransportDetailsResponse | null;
  stops: ClientTransportStopDto[];
  departures: ClientTransportDepartureDto[];
  date: Date;
  loading: boolean;
  error: string | null;
  isFollowingRoute: boolean;
  onClose: () => void;
  onBuy: () => void;
  onOpenDate: () => void;
  onToggleFollowRoute: () => void;
}

interface CompactRouteBarProps {
  item: ClientNearbyTransportDto;
  detail: ClientTransportDetailsResponse | null;
  stops: ClientTransportStopDto[];
  isFollowingRoute: boolean;
  onClose: () => void;
  onBuy: () => void;
  onToggleFollowRoute: () => void;
}

function CompactRouteBar({
  item,
  detail,
  stops,
  isFollowingRoute,
  onClose,
  onBuy,
  onToggleFollowRoute,
}: CompactRouteBarProps) {
  const transport = detail ?? item.transport;
  const typeColor = TYPE_COLOR[transport.type] ?? colors.muted;
  const typeIcon = TYPE_ICON[transport.type as keyof typeof TYPE_ICON] ?? 'bus';
  const firstStop = stops[0]?.name ?? 'Depart';
  const lastStop = stops[stops.length - 1]?.name ?? 'Arrivee';

  return (
    <View style={cb.wrap}>
      <View style={cb.sheet}>
        <View style={cb.topRow}>
          <View style={[cb.iconWrap, { backgroundColor: `${typeColor}20` }]}>
            <AppIcon family="MaterialCommunityIcons" name={typeIcon} size={20} color={typeColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={cb.title} numberOfLines={1}>{transport.name}</Text>
            <Text style={cb.subtitle} numberOfLines={1}>
              {firstStop} {'->'} {lastStop}
            </Text>
          </View>
          <TouchableOpacity style={cb.iconBtn} onPress={onClose} activeOpacity={0.8}>
            <AppIcon family="Feather" name="x" size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={cb.infoRow}>
          <View style={cb.infoPill}>
            <AppIcon family="Feather" name="map" size={12} color={colors.blue} />
            <Text style={cb.infoTxt}>{stops.length} arrets visibles</Text>
          </View>
          <View style={cb.infoPill}>
            <AppIcon family="Feather" name="navigation" size={12} color={colors.amber} />
            <Text style={cb.infoTxt}>{isFollowingRoute ? 'Parcours suivi' : 'Parcours pret'}</Text>
          </View>
        </View>

        <View style={cb.actions}>
          <TouchableOpacity style={cb.secondaryBtn} onPress={onToggleFollowRoute} activeOpacity={0.85}>
            <AppIcon family="Feather" name="maximize-2" size={14} color={colors.navy} />
            <Text style={cb.secondaryTxt}>Voir les details</Text>
          </TouchableOpacity>
          <TouchableOpacity style={cb.primaryBtn} onPress={onBuy} activeOpacity={0.85}>
            <AppIcon family="MaterialCommunityIcons" name="ticket-confirmation-outline" size={16} color={colors.white} />
            <Text style={cb.primaryTxt}>Acheter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function TransportDrawer({
  item,
  detail,
  stops,
  departures,
  date,
  loading,
  error,
  isFollowingRoute,
  onClose,
  onBuy,
  onOpenDate,
  onToggleFollowRoute,
}: DrawerProps) {
  const transport = detail ?? item.transport;
  const typeColor = TYPE_COLOR[transport.type] ?? colors.muted;
  const typeIcon = TYPE_ICON[transport.type as keyof typeof TYPE_ICON] ?? 'bus';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={dr.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={dr.sheet}>
        <View style={dr.handle} />

        <View style={dr.header}>
          <View style={[dr.typeIcon, { backgroundColor: `${typeColor}22` }]}>
            <AppIcon family="MaterialCommunityIcons" name={typeIcon} size={28} color={typeColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={dr.name} numberOfLines={1}>{transport.name}</Text>
            <View style={dr.metaRow}>
              <View style={[dr.typePill, { backgroundColor: typeColor }]}>
                <Text style={dr.typePillTxt}>{transport.type}</Text>
              </View>
              <Text style={dr.zone}>Zone {transport.zone}</Text>
              <View style={dr.inlineMeta}>
                <AppIcon family="Feather" name="map-pin" size={12} color={colors.amber} />
                <Text style={dr.dist}>{fmtDist(item.distanceMeters)}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={dr.closeBtn} onPress={onClose}>
            <AppIcon family="Feather" name="x" size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {!isFollowingRoute && !!detail?.description && <Text style={dr.description}>{detail.description}</Text>}

        <TouchableOpacity style={dr.followBtn} onPress={onToggleFollowRoute} activeOpacity={0.85}>
          <AppIcon
            family="Feather"
            name="navigation"
            size={16}
            color={colors.navy}
          />
          <Text style={dr.followBtnTxt}>Suivre son parcours</Text>
        </TouchableOpacity>

        <View style={dr.nearestRow}>
          <AppIcon family="Feather" name="navigation" size={16} color={colors.red} />
          <View>
            <Text style={dr.nearestLbl}>Arret le plus proche</Text>
            <Text style={dr.nearestName}>{item.nearestStopName}</Text>
          </View>
          <Text style={dr.stopsCount}>{item.matchingStopCount} arrets a proximite</Text>
        </View>

        <TouchableOpacity style={dr.datePill} onPress={onOpenDate} activeOpacity={0.8}>
          <AppIcon family="Feather" name="calendar" size={14} color={colors.navy} />
          <Text style={dr.dateTxt}>{formatDateParam(date)}</Text>
        </TouchableOpacity>

        {!!error && (
          <View style={dr.errorBanner}>
            <Text style={dr.errorTxt}>{error}</Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={colors.amber} style={{ marginVertical: 16 }} />
        ) : (
          <>
            <Text style={dr.sectionTitle}>Arrets du trajet</Text>
            <ScrollView style={{ maxHeight: 140 }} showsVerticalScrollIndicator={false}>
              {stops.map((stop, idx) => (
                <View key={stop.id} style={dr.stopRow}>
                  <View style={dr.stopTimeline}>
                    <View style={[
                      dr.stopDot,
                      idx === 0 && { backgroundColor: colors.red },
                      idx === stops.length - 1 && { backgroundColor: colors.green },
                    ]} />
                    {idx < stops.length - 1 && <View style={dr.stopLine} />}
                  </View>
                  <Text style={dr.stopName}>{stop.name}</Text>
                  <Text style={dr.stopZone}>Zone {stop.zone}</Text>
                </View>
              ))}
            </ScrollView>

            <Text style={[dr.sectionTitle, { marginTop: 12 }]}>Departs</Text>
            {departures.length === 0 ? (
              <Text style={dr.emptyTxt}>Aucun depart pour cette date</Text>
            ) : (
              <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={false}>
                {departures.map((departure, index) => (
                  <View key={`${departure.id}-${departure.departureTime}-${index}`} style={dr.departureRow}>
                    <Text style={dr.departureTime}>{departure.departureTime}</Text>
                    <Text style={dr.departureDirection} numberOfLines={1}>
                      {departure.direction ?? 'Service programme'}
                    </Text>
                    <Text style={dr.departureArrival}>
                      {departure.arrivalTime ?? departure.expectedArrivalTime ?? '--:--'}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </>
        )}

        <TouchableOpacity style={dr.buyBtn} onPress={onBuy} activeOpacity={0.8}>
          <AppIcon family="MaterialCommunityIcons" name="ticket-confirmation-outline" size={18} color={colors.white} />
          <Text style={dr.buyBtnTxt}>Acheter un billet pour cette ligne</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const dr = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
    paddingBottom: 34,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
      },
      android: { elevation: 12 },
    }),
  },
  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  typeIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '800', color: colors.navy, marginBottom: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  inlineMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  typePill: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  typePillTxt: { fontSize: 10, fontWeight: '800', color: colors.white },
  zone: { fontSize: 10, fontWeight: '700', color: colors.muted },
  dist: { fontSize: 10, fontWeight: '700', color: colors.amber },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  description: { fontSize: 11, color: colors.muted, lineHeight: 16, marginBottom: 12 },
  nearestRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg, borderRadius: 12, padding: 12, marginBottom: 14 },
  nearestLbl: { fontSize: 10, fontWeight: '700', color: colors.muted },
  nearestName: { fontSize: 13, fontWeight: '700', color: colors.navy },
  stopsCount: { marginLeft: 'auto', fontSize: 10, fontWeight: '700', color: colors.blue },
  datePill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  dateTxt: { fontSize: 12, fontWeight: '700', color: colors.navy },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.navy, marginBottom: 8 },
  errorBanner: { backgroundColor: colors.redLt, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1.5, borderColor: '#f1b5b5' },
  errorTxt: { fontSize: 11, fontWeight: '700', color: colors.red },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.bgLight,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 12,
  },
  followBtnTxt: { fontSize: 13, fontWeight: '800', color: colors.navy },
  stopRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 40 },
  stopTimeline: { width: 24, alignItems: 'center', paddingTop: 4 },
  stopDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.navy, borderWidth: 2, borderColor: colors.white },
  stopLine: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  stopName: { flex: 1, fontSize: 12, fontWeight: '700', color: colors.navy, paddingVertical: 4 },
  stopZone: { fontSize: 10, color: colors.muted, paddingVertical: 4 },
  departureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  departureTime: { fontSize: 12, fontWeight: '800', color: colors.navy, width: 54 },
  departureDirection: { flex: 1, fontSize: 10, color: colors.navy },
  departureArrival: { fontSize: 10, color: colors.muted },
  emptyTxt: { fontSize: 11, fontWeight: '700', color: colors.muted, marginBottom: 10 },
  buyBtn: { backgroundColor: colors.red, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  buyBtnTxt: { fontSize: 14, fontWeight: '800', color: colors.white },
});

const cb = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
  },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.16,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 10 },
    }),
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 13, fontWeight: '800', color: colors.navy },
  subtitle: { fontSize: 11, color: colors.muted, marginTop: 2 },
  iconBtn: { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  infoRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 12 },
  infoPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.bgLight, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  infoTxt: { fontSize: 10, fontWeight: '700', color: colors.navy },
  actions: { flexDirection: 'row', gap: 8 },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.bgLight, borderRadius: 12, paddingVertical: 11, borderWidth: 1.5, borderColor: colors.border },
  secondaryTxt: { fontSize: 12, fontWeight: '800', color: colors.navy },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.red, borderRadius: 12, paddingVertical: 11 },
  primaryTxt: { fontSize: 12, fontWeight: '800', color: colors.white },
});

export function MapScreen() {
  const navigation = useNavigation<Nav>();
  const mapRef = useRef<MapView>(null);
  const hasCenteredOnUserRef = useRef(false);

  const [userLocation, setUserLocation] = useState(DEFAULT_COORDS);
  const [locationGranted, setLocationGranted] = useState(false);
  const [nearby, setNearby] = useState<ClientNearbyTransportDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(1000);
  const [typeFilter, setTypeFilter] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ClientNearbyTransportDto | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ClientTransportDetailsResponse | null>(null);
  const [selectedStops, setSelectedStops] = useState<ClientTransportStopDto[]>([]);
  const [selectedDepartures, setSelectedDepartures] = useState<ClientTransportDepartureDto[]>([]);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [markerCoords, setMarkerCoords] = useState<Record<string, MarkerCoordinate>>({});
  const [isFollowingRoute, setIsFollowingRoute] = useState(false);

  const focusMap = useCallback((coords: MarkerCoordinate, deltas = DEFAULT_DELTA) => {
    mapRef.current?.animateToRegion({
      ...coords,
      ...deltas,
    }, 600);
  }, []);

  const initLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(coords);
      setLocationGranted(true);
      return coords;
    }
    return DEFAULT_COORDS;
  }, []);

  const loadNearby = useCallback(async (
    coords: MarkerCoordinate,
    currentRadius: number,
    options?: { silent?: boolean },
  ) => {
    if (!options?.silent) setLoading(true);
    try {
      const res = await clientTransportApi.nearby({
        latitude: coords.latitude,
        longitude: coords.longitude,
        radiusMeters: currentRadius,
        type: typeFilter || undefined,
        active: activeOnly || undefined,
        page: 0,
        size: 15,
      });
      setNearby(res.data.data.content ?? []);
      setError(null);
    } catch (err) {
      setNearby([]);
      setError(parseApiError(err).message);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [activeOnly, typeFilter]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const coords = await initLocation();
      if (!isMounted) return;
      focusMap(coords);
      hasCenteredOnUserRef.current = true;
      await loadNearby(coords, radius);
    })();

    return () => {
      isMounted = false;
    };
  }, [focusMap, initLocation, loadNearby, radius]);

  useEffect(() => {
    if (!locationGranted || hasCenteredOnUserRef.current) return;
    focusMap(userLocation);
    hasCenteredOnUserRef.current = true;
  }, [focusMap, locationGranted, userLocation]);

  useEffect(() => {
    loadNearby(userLocation, radius);
  }, [activeOnly, loadNearby, radius, typeFilter, userLocation]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadNearby(userLocation, radius, { silent: true });
    }, MAP_REFRESH_MS);

    return () => clearInterval(intervalId);
  }, [loadNearby, radius, userLocation]);

  useEffect(() => {
    if (nearby.length === 0) {
      setMarkerCoords({});
      return;
    }

    const entries = nearby
      .filter((item) => item.markerLatitude != null && item.markerLongitude != null)
      .map((item) => [
        item.transport.id,
        { latitude: item.markerLatitude!, longitude: item.markerLongitude! },
      ] as const);

    setMarkerCoords(Object.fromEntries(entries as [string, MarkerCoordinate][]));
  }, [nearby]);

  const loadSelectedTransport = useCallback(async (item: ClientNearbyTransportDto, date: Date) => {
    setLoadingSelected(true);
    try {
      const [detailRes, stopsRes, departuresRes] = await Promise.all([
        clientTransportApi.get(item.transport.id),
        clientTransportApi.getStops(item.transport.id),
        clientTransportApi.getDepartures(item.transport.id, formatDateParam(date)),
      ]);
      setSelectedDetail(detailRes.data.data);
      setSelectedStops(stopsRes.data.data.stops ?? []);
      setSelectedDepartures(departuresRes.data.data.departures ?? []);
      setSelectedError(null);
    } catch (err) {
      setSelectedDetail(null);
      setSelectedStops([]);
      setSelectedDepartures([]);
      setSelectedError(parseApiError(err).message);
    } finally {
      setLoadingSelected(false);
    }
  }, []);

  useEffect(() => {
    if (!selected) {
      setSelectedDetail(null);
      setSelectedStops([]);
      setSelectedDepartures([]);
      setSelectedError(null);
      setIsFollowingRoute(false);
      return;
    }

    loadSelectedTransport(selected, selectedDate);
  }, [loadSelectedTransport, selected, selectedDate]);

  const handleRadiusChange = (nextRadius: number) => {
    setRadius(nextRadius);
    loadNearby(userLocation, nextRadius);
  };

  const relocate = async () => {
    const coords = await initLocation();
    setUserLocation(coords);
    focusMap(coords, RELOCATE_DELTA);
    hasCenteredOnUserRef.current = true;
    loadNearby(coords, radius);
  };

  const onDateChange = (event: DateTimePickerEvent, nextDate?: Date) => {
    if (Platform.OS !== 'ios') setShowPicker(false);
    if (event.type === 'set' && nextDate) setSelectedDate(nextDate);
  };

  const filtered = useMemo(
    () => nearby.filter((item) => (!typeFilter || item.transport.type === typeFilter) && (!activeOnly || item.transport.active)),
    [activeOnly, nearby, typeFilter],
  );

  const routeCoords = selectedStops
    .filter((stop) => stop.latitude && stop.longitude)
    .map((stop) => ({ latitude: stop.latitude!, longitude: stop.longitude! }));

  const handleToggleFollowRoute = useCallback(() => {
    if (!isFollowingRoute && routeCoords.length > 1) {
      mapRef.current?.fitToCoordinates(routeCoords, {
        edgePadding: { top: 90, right: 70, bottom: 240, left: 70 },
        animated: true,
      });
    } else if (!isFollowingRoute && routeCoords.length === 1) {
      focusMap(routeCoords[0], { latitudeDelta: 0.015, longitudeDelta: 0.015 });
    }

    setIsFollowingRoute((value) => !value);
  }, [focusMap, isFollowingRoute, routeCoords]);

  useEffect(() => {
    if (!isFollowingRoute) return;

    if (routeCoords.length > 1) {
      mapRef.current?.fitToCoordinates(routeCoords, {
        edgePadding: { top: 90, right: 70, bottom: 240, left: 70 },
        animated: true,
      });
      return;
    }

    if (routeCoords.length === 1) {
      focusMap(routeCoords[0], { latitudeDelta: 0.015, longitudeDelta: 0.015 });
    }
  }, [focusMap, isFollowingRoute, routeCoords]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topbar}>
        <View style={s.logoRow}>
          <View style={s.logoBadge}><Text style={s.logoBadgeTxt}>TW</Text></View>
          <View>
            <Text style={s.logoText}>Tuni<Text style={s.logoAccent}>Way</Text></Text>
            <Text style={s.logoSub}>NEARBY MAP</Text>
          </View>
        </View>
        <TouchableOpacity style={s.relocateBtn} onPress={relocate} activeOpacity={0.8}>
          <AppIcon family="Feather" name="crosshair" size={16} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={s.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {RADIUS_OPTS.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[s.chip, radius === item.value && s.chipOn]}
              onPress={() => handleRadiusChange(item.value)}
              activeOpacity={0.8}
            >
              <Text style={[s.chipTxt, radius === item.value && s.chipTxtOn]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
          <View style={s.filterDiv} />
          {TYPE_FILTERS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[s.chip, typeFilter === item.key && s.chipOn]}
              onPress={() => setTypeFilter(item.key)}
              activeOpacity={0.8}
            >
              <Text style={[s.chipTxt, typeFilter === item.key && s.chipTxtOn]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[s.chip, activeOnly && s.chipOn]}
            onPress={() => setActiveOnly((value) => !value)}
            activeOpacity={0.8}
          >
            <Text style={[s.chipTxt, activeOnly && s.chipTxtOn]}>Active only</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {!!error && (
        <View style={s.errorBanner}>
          <Text style={s.errorTxt}>{error}</Text>
        </View>
      )}

      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}

      <View style={s.mapWrap}>
        <MapView
          ref={mapRef}
          style={s.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={{
            ...userLocation,
            ...DEFAULT_DELTA,
          }}
          showsUserLocation={locationGranted}
          showsMyLocationButton={false}
        >
          <Circle
            center={userLocation}
            radius={radius}
            strokeColor={`${colors.blue}44`}
            fillColor={`${colors.blue}0A`}
            strokeWidth={1.5}
          />

          {filtered.map((item) => {
            const coordinate = markerCoords[item.transport.id];
            if (!coordinate) return null;

            const isSelected = selected?.transport.id === item.transport.id;
            const typeColor = TYPE_COLOR[item.transport.type] ?? colors.muted;
            const typeIcon = TYPE_ICON[item.transport.type as keyof typeof TYPE_ICON] ?? 'bus';

            const updatedAt = item.locationUpdatedAt ? new Date(item.locationUpdatedAt).getTime() : 0;
            const diffMinutes = (Date.now() - updatedAt) / 60000;
            const isLive = item.locationSource === 'LIVE' && diffMinutes < 3;

            return (
              <Marker
                key={item.transport.id}
                coordinate={coordinate}
                anchor={{ x: 0.5, y: 0.5 }}
                onPress={() => setSelected(item)}
                title={item.transport.name}
              >
                <View style={[
                  mk.pin,
                  { borderColor: typeColor, backgroundColor: isSelected ? typeColor : colors.white, opacity: isLive ? 1 : 0.65 },
                ]}>
                  <AppIcon
                    family="MaterialCommunityIcons"
                    name={typeIcon}
                    size={isLive ? 20 : 16}
                    color={isSelected ? colors.white : typeColor}
                  />
                  {isLive && (
                    <View style={[mk.liveIndicator, { backgroundColor: colors.green }]} />
                  )}
                </View>
              </Marker>
            );
          })}

          {isFollowingRoute && routeCoords.length > 1 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor={selected ? (TYPE_COLOR[selected.transport.type] ?? colors.navy) : colors.navy}
              strokeWidth={4}
            />
          )}

          {isFollowingRoute && selectedStops
            .filter((stop) => stop.latitude && stop.longitude)
            .map((stop, idx) => (
              <Marker
                key={stop.id}
                coordinate={{ latitude: stop.latitude!, longitude: stop.longitude! }}
                anchor={{ x: 0.5, y: 0.5 }}
                title={stop.name}
              >
                <View style={[
                  mk.stopDot,
                  idx === 0 && { backgroundColor: colors.red },
                  idx === selectedStops.length - 1 && { backgroundColor: colors.green },
                ]} />
              </Marker>
            ))}
        </MapView>

        <View style={s.countBadge}>
          <AppIcon family="Feather" name="map-pin" size={12} color={colors.white} />
          <Text style={s.countTxt}>{filtered.length} nearby</Text>
        </View>

        {loading && (
          <View style={s.mapLoader}>
            <ActivityIndicator color={colors.amber} />
          </View>
        )}
      </View>

      {selected && !isFollowingRoute && (
        <TransportDrawer
          item={selected}
          detail={selectedDetail}
          stops={selectedStops}
          departures={selectedDepartures}
          date={selectedDate}
          loading={loadingSelected}
          error={selectedError}
          isFollowingRoute={isFollowingRoute}
          onOpenDate={() => setShowPicker(true)}
          onToggleFollowRoute={handleToggleFollowRoute}
          onClose={() => setSelected(null)}
          onBuy={() => {
            setSelected(null);
            navigation.navigate('BuyTicket', {
              transportId: selected.transport.id,
              transportName: selected.transport.name,
            });
          }}
        />
      )}

      {selected && isFollowingRoute && (
        <CompactRouteBar
          item={selected}
          detail={selectedDetail}
          stops={selectedStops}
          isFollowingRoute={isFollowingRoute}
          onToggleFollowRoute={handleToggleFollowRoute}
          onClose={() => setSelected(null)}
          onBuy={() => {
            setSelected(null);
            navigation.navigate('BuyTicket', {
              transportId: selected.transport.id,
              transportName: selected.transport.name,
            });
          }}
        />
      )}
    </SafeAreaView>
  );
}

const mk = StyleSheet.create({
  pin: { width: 44, height: 44, borderRadius: 13, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  stopDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.navy, borderWidth: 2.5, borderColor: colors.white },
  liveIndicator: { position: 'absolute', top: -4, right: -4, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.white },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  topbar: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBadge: { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  logoBadgeTxt: { color: colors.white, fontSize: 10, fontWeight: '800' },
  logoText: { fontSize: 14, fontWeight: '800', color: colors.white },
  logoAccent: { color: colors.amber },
  logoSub: { fontSize: 8, fontWeight: '700', color: '#6ec0f5', letterSpacing: 2 },
  relocateBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  filterBar: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterRow: { paddingHorizontal: 12, paddingVertical: 9, gap: 6, flexDirection: 'row' },
  filterDiv: { width: 1, height: 28, backgroundColor: colors.border, alignSelf: 'center', marginHorizontal: 4 },
  chip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipTxt: { fontSize: 11, fontWeight: '700', color: colors.navy },
  chipTxtOn: { color: colors.white },
  errorBanner: { backgroundColor: '#fff1f1', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1b5b5' },
  errorTxt: { fontSize: 11, fontWeight: '700', color: colors.red },
  mapWrap: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  countBadge: { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(15,35,84,0.9)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5 },
  countTxt: { fontSize: 11, fontWeight: '800', color: colors.white },
  mapLoader: { position: 'absolute', top: 12, right: 12, backgroundColor: colors.navy, borderRadius: 10, padding: 8 },
});
