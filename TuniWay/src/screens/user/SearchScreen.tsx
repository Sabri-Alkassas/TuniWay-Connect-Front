import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { clientTransportApi, parseApiError } from '../../api/client';
import { colors } from '../../theme/colors';
import type { ClientTransportDto } from '../../types/client';
import type { UserStackParamList } from '../../navigation/types';
import { AppIcon } from '../../components/AppIcon';

type Nav = NativeStackNavigationProp<UserStackParamList>;

const TYPE_FILTERS = [
  { key: '', label: 'Tout', icon: 'shape-outline' },
  { key: 'BUS', label: 'Bus', icon: 'bus' },
  { key: 'TRAIN', label: 'Train', icon: 'train' },
  { key: 'METRO', label: 'Métro', icon: 'subway-variant' },
];

const TYPE_COLOR: Record<string, string> = {
  BUS: colors.red, TRAIN: colors.green, METRO: colors.blue,
};

interface TransportCardProps {
  transport: ClientTransportDto;
  onPress: () => void;
}

function TransportCard({ transport: t, onPress }: TransportCardProps) {
  const typeColor = TYPE_COLOR[t.type] ?? colors.muted;
  const typeIcon = TYPE_FILTERS.find((f) => f.key === t.type)?.icon ?? 'bus';

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.cardIcon, { backgroundColor: `${typeColor}18` }]}>
        <AppIcon family="MaterialCommunityIcons" name={typeIcon as never} size={22} color={typeColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.cardName} numberOfLines={1}>{t.name}</Text>
        <View style={s.cardMeta}>
          <View style={[s.typeBadge, { backgroundColor: `${typeColor}18` }]}>
            <Text style={[s.typeBadgeTxt, { color: typeColor }]}>{t.type}</Text>
          </View>
          <Text style={s.cardZone}>Zone {t.zone}</Text>
          {t.stopsCount != null && <Text style={s.cardMeta2}>- {t.stopsCount} arrêts</Text>}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View style={[s.activeDot, { backgroundColor: t.active ? colors.green : colors.muted }]} />
        <AppIcon family="Feather" name="chevron-right" size={18} color={colors.muted} />
      </View>
    </TouchableOpacity>
  );
}

export function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const [transports, setTransports] = useState<ClientTransportDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState('');
  const [zone, setZone] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (opts: {
    q?: string; zoneText?: string; type?: string; active?: boolean; pg?: number; isRefresh?: boolean;
  } = {}) => {
    const {
      q = query,
      zoneText = zone,
      type = typeFilter,
      active = activeOnly,
      pg = 0,
      isRefresh = false,
    } = opts;

    if (pg === 0) {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await clientTransportApi.search({
        query: q || undefined,
        zone: zoneText || undefined,
        type: (type as never) || undefined,
        active: active || undefined,
        page: pg,
        size: 15,
        sort: 'name,asc',
      });
      const content = res.data.data.content ?? [];
      setTransports((prev) => (pg === 0 ? content : [...prev, ...content]));
      setHasMore(pg + 1 < (res.data.data.totalPages ?? 0));
      setPage(pg);
      setError(null);
    } catch (err) {
      if (pg === 0) setTransports([]);
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [activeOnly, query, typeFilter, zone]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }, []);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      load({ q: text, pg: 0 });
    }, 400);
  };

  const handleZoneChange = (text: string) => {
    setZone(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      load({ zoneText: text, pg: 0 });
    }, 400);
  };

  const handleTypeFilter = (type: string) => {
    setTypeFilter(type);
    load({ type, pg: 0 });
  };

  const handleActiveToggle = () => {
    const next = !activeOnly;
    setActiveOnly(next);
    load({ active: next, pg: 0 });
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) load({ pg: page + 1 });
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.searchBar}>
        <View style={s.logoRow}>
          <View style={s.logoBadge}><Text style={s.logoBadgeTxt}>TW</Text></View>
          <View>
            <Text style={s.logoText}>Tuni<Text style={s.logoAccent}>Way</Text></Text>
            <Text style={s.logoSub}>CONNECT</Text>
          </View>
        </View>
        <View style={s.searchRow}>
          <AppIcon family="Feather" name="search" size={14} color={colors.white} />
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Rechercher une ligne, un trajet, une zone..."
            placeholderTextColor={colors.muted}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleQueryChange('')}>
              <AppIcon family="Feather" name="x" size={14} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
        <View style={s.searchRow}>
          <AppIcon family="Feather" name="map-pin" size={14} color={colors.white} />
          <TextInput
            style={s.searchInput}
            value={zone}
            onChangeText={handleZoneChange}
            placeholder="Filtrer par zone..."
            placeholderTextColor={colors.muted}
            autoCorrect={false}
          />
        </View>
      </View>

      <View style={s.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {TYPE_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[s.chip, typeFilter === f.key && s.chipOn]}
              onPress={() => handleTypeFilter(f.key)}
              activeOpacity={0.8}
            >
              <View style={s.chipInner}>
                <AppIcon
                  family="MaterialCommunityIcons"
                  name={f.icon as never}
                  size={14}
                  color={typeFilter === f.key ? colors.white : colors.navy}
                />
                <Text style={[s.chipTxt, typeFilter === f.key && s.chipTxtOn]}>{f.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[s.chip, activeOnly && s.chipGreen]}
            onPress={handleActiveToggle}
            activeOpacity={0.8}
          >
            <Text style={[s.chipTxt, activeOnly && s.chipTxtGreen]}>Actifs uniquement</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {loading ? (
        <View style={s.centered}><ActivityIndicator color={colors.amber} size="large" /></View>
      ) : (
        <ScrollView
          style={s.body}
          contentContainerStyle={s.bodyContent}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load({ pg: 0, isRefresh: true })}
              tintColor={colors.amber}
            />
          )}
          onScrollEndDrag={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 80) {
              handleLoadMore();
            }
          }}
        >
          {!!error && (
            <View style={s.errorBanner}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {transports.length === 0 ? (
            <View style={s.empty}>
              <AppIcon family="MaterialCommunityIcons" name="bus-stop-uncovered" size={40} color={colors.muted} />
              <Text style={s.emptyTxt}>Aucune ligne trouvée</Text>
              <Text style={s.emptySub}>
                {error ? 'Réessayez ou ajustez vos filtres.' : 'Essayez une autre recherche ou retirez quelques filtres.'}
              </Text>
              {!!error && (
                <TouchableOpacity style={s.retryBtn} onPress={() => load({ pg: 0 })} activeOpacity={0.8}>
                  <Text style={s.retryTxt}>Réessayer</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              <Text style={s.resultCount}>{transports.length} ligne{transports.length !== 1 ? 's' : ''}</Text>
              {transports.map((t) => (
                <TransportCard
                  key={t.id}
                  transport={t}
                  onPress={() => navigation.navigate('TransportDetail', { transportId: t.id })}
                />
              ))}
              {loadingMore && <ActivityIndicator color={colors.amber} style={{ marginVertical: 16 }} />}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  searchBar: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 12, gap: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBadge: { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  logoBadgeTxt: { color: colors.white, fontSize: 10, fontWeight: '800' },
  logoText: { fontSize: 14, fontWeight: '800', color: colors.white },
  logoAccent: { color: colors.amber },
  logoSub: { fontSize: 8, fontWeight: '700', color: '#6ec0f5', letterSpacing: 2 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: colors.white, fontWeight: '600' },
  filterWrap: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 6, flexDirection: 'row' },
  chip: { borderRadius: 20, paddingHorizontal: 13, paddingVertical: 6, backgroundColor: colors.bgLight, borderWidth: 1.5, borderColor: colors.border },
  chipInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipGreen: { backgroundColor: colors.bgLight, borderColor: colors.green },
  chipTxt: { fontSize: 11, fontWeight: '700', color: colors.navy },
  chipTxtOn: { color: colors.white },
  chipTxtGreen: { color: '#27500A' },
  body: { flex: 1, backgroundColor: colors.bgLight },
  bodyContent: { padding: 12, paddingBottom: 24 },
  centered: { flex: 1, backgroundColor: colors.bgLight, alignItems: 'center', justifyContent: 'center' },
  resultCount: { fontSize: 11, fontWeight: '700', color: colors.muted, marginBottom: 10 },
  errorBanner: { backgroundColor: colors.redLt, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1.5, borderColor: '#f1b5b5' },
  errorText: { fontSize: 11, fontWeight: '700', color: colors.red },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 13, borderWidth: 1.5, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  cardIcon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardName: { fontSize: 13, fontWeight: '700', color: colors.navy, marginBottom: 5 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeBadge: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeTxt: { fontSize: 10, fontWeight: '700' },
  cardZone: { fontSize: 10, fontWeight: '700', color: colors.muted },
  cardMeta2: { fontSize: 10, color: colors.muted },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
  emptyTxt: { fontSize: 15, fontWeight: '700', color: colors.muted },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  retryBtn: { marginTop: 8, backgroundColor: colors.navy, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 11 },
  retryTxt: { fontSize: 13, fontWeight: '700', color: colors.white },
});
