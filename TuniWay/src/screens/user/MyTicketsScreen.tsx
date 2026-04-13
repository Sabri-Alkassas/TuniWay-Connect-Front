import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { clientTicketApi, parseApiError } from '../../api/client';
import { colors } from '../../theme/colors';
import type { ClientTicketDto } from '../../types/client';
import type { UserStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<UserStackParamList>;

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  VALID: { bg: colors.greenLt, text: '#27500A' },
  USED: { bg: colors.bgLight, text: colors.muted },
  EXPIRED: { bg: '#f0f0f0', text: colors.muted },
  CANCELLED: { bg: colors.redLt, text: colors.red },
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

interface TicketCardProps { ticket: ClientTicketDto; }
function TicketCard({ ticket: t }: TicketCardProps) {
  const sc = STATUS_COLOR[t.status] ?? STATUS_COLOR.USED;
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.cardHeaderLeft}>
          <View style={s.routeIcon}>
            <Text style={{ fontSize: 18 }}>🎟</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.routeName} numberOfLines={1}>{t.transportName}</Text>
            <Text style={s.productName}>{t.productName}</Text>
          </View>
        </View>
        <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[s.statusTxt, { color: sc.text }]}>{t.status}</Text>
        </View>
      </View>

      <View style={s.journeyRow}>
        <View style={s.journeyStop}>
          <Text style={s.journeyStopLabel}>FROM</Text>
          <Text style={s.journeyStopName} numberOfLines={1}>{t.fromStop}</Text>
        </View>
        <View style={s.journeyArrow}>
          <View style={s.journeyLine} />
          <Text style={{ fontSize: 14 }}>→</Text>
          <View style={s.journeyLine} />
        </View>
        <View style={[s.journeyStop, { alignItems: 'flex-end' }]}>
          <Text style={s.journeyStopLabel}>TO</Text>
          <Text style={s.journeyStopName} numberOfLines={1}>{t.toStop}</Text>
        </View>
      </View>

      <View style={s.cardFooter}>
        <Text style={s.footerDate}>{fmtDate(t.purchasedAt)} · {fmtTime(t.plannedDeparture)}</Text>
        <Text style={s.footerPrice}>
          {t.price.toFixed(3)} {t.currency}
        </Text>
      </View>
    </View>
  );
}

const SORT_OPTS = [
  { key: 'purchasedAt,desc', label: 'Newest first' },
  { key: 'purchasedAt,asc', label: 'Oldest first' },
  { key: 'price,desc', label: 'Highest price' },
];

export function MyTicketsScreen() {
  const navigation = useNavigation<Nav>();
  const [tickets, setTickets] = useState<ClientTicketDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [sort, setSort] = useState('purchasedAt,desc');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (pg = 0, sortKey = sort, isRefresh = false) => {
    if (pg === 0) {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await clientTicketApi.list(pg, 10, sortKey);
      const content = res.data.data.content ?? [];
      setTickets((prev) => (pg === 0 ? content : [...prev, ...content]));
      setHasMore(pg + 1 < (res.data.data.totalPages ?? 0));
      setPage(pg);
      setError(null);
    } catch (err) {
      if (pg === 0) setTickets([]);
      setHasMore(false);
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [sort]);

  useEffect(() => { load(); }, [load]);

  const handleSort = (key: string) => {
    setSort(key);
    load(0, key);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topbar}>
        <View style={s.logoRow}>
          <View style={s.logoBadge}><Text style={s.logoBadgeTxt}>TW</Text></View>
          <View>
            <Text style={s.logoText}>My<Text style={s.logoAccent}> Tickets</Text></Text>
            <Text style={s.logoSub}>TRAVEL HISTORY</Text>
          </View>
        </View>
        <TouchableOpacity
          style={s.buyBtn}
          onPress={() => navigation.navigate('UserTabs', { screen: 'Search' })}
          activeOpacity={0.8}
        >
          <Text style={s.buyBtnTxt}>+ Buy</Text>
        </TouchableOpacity>
      </View>

      <View style={s.sortWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sortRow}>
          {SORT_OPTS.map((o) => (
            <TouchableOpacity
              key={o.key}
              style={[s.sortChip, sort === o.key && s.sortChipOn]}
              onPress={() => handleSort(o.key)}
              activeOpacity={0.8}
            >
              <Text style={[s.sortChipTxt, sort === o.key && s.sortChipTxtOn]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
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
              onRefresh={() => load(0, sort, true)}
              tintColor={colors.amber}
            />
          )}
          onScrollEndDrag={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 80) {
              if (!loadingMore && hasMore) load(page + 1);
            }
          }}
        >
          {!!error && (
            <View style={s.errorBanner}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {tickets.length === 0 ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 48 }}>🎟</Text>
              <Text style={s.emptyTxt}>No tickets yet</Text>
              <Text style={s.emptySub}>
                {error ? 'We could not load your tickets right now.' : 'Buy your first ticket to get started'}
              </Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('UserTabs', { screen: 'Search' })}>
                <Text style={s.emptyBtnTxt}>{error ? 'Try again' : 'Browse routes'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={s.count}>{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</Text>
              {tickets.map((t) => <TicketCard key={t.id} ticket={t} />)}
              {loadingMore && <ActivityIndicator color={colors.amber} style={{ marginVertical: 16 }} />}
              {!hasMore && tickets.length > 0 && <Text style={s.endTxt}>End of history</Text>}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.navy },
  topbar:       { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBadge:    { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  logoBadgeTxt: { color: colors.white, fontSize: 10, fontWeight: '800' },
  logoText:     { fontSize: 14, fontWeight: '800', color: colors.white },
  logoAccent:   { color: colors.amber },
  logoSub:      { fontSize: 8, fontWeight: '700', color: '#6ec0f5', letterSpacing: 2 },
  buyBtn:       { backgroundColor: colors.red, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  buyBtnTxt:    { fontSize: 12, fontWeight: '800', color: colors.white },
  sortWrap:     { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  sortRow:      { paddingHorizontal: 12, paddingVertical: 9, gap: 6, flexDirection: 'row' },
  sortChip:     { borderRadius: 20, paddingHorizontal: 13, paddingVertical: 6, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border },
  sortChipOn:   { backgroundColor: colors.navy, borderColor: colors.navy },
  sortChipTxt:  { fontSize: 11, fontWeight: '700', color: colors.navy },
  sortChipTxtOn:{ color: colors.white },
  body:         { flex: 1, backgroundColor: colors.bg },
  bodyContent:  { padding: 12, paddingBottom: 24 },
  centered:     { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  errorBanner:  { backgroundColor: colors.redLt, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1.5, borderColor: '#f1b5b5' },
  errorText:    { fontSize: 11, fontWeight: '700', color: colors.red },
  count:        { fontSize: 11, fontWeight: '700', color: colors.muted, marginBottom: 10 },
  card:         { backgroundColor: colors.white, borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.border, marginBottom: 10 },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  cardHeaderLeft:{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  routeIcon:    { width: 40, height: 40, borderRadius: 11, backgroundColor: colors.redLt, alignItems: 'center', justifyContent: 'center' },
  routeName:    { fontSize: 13, fontWeight: '700', color: colors.navy },
  productName:  { fontSize: 10, fontWeight: '700', color: colors.muted, marginTop: 2 },
  statusBadge:  { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, marginLeft: 8 },
  statusTxt:    { fontSize: 10, fontWeight: '700' },
  journeyRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 12 },
  journeyStop:  { flex: 1 },
  journeyStopLabel:{ fontSize: 9, fontWeight: '800', color: colors.muted, letterSpacing: 1 },
  journeyStopName: { fontSize: 12, fontWeight: '700', color: colors.navy, marginTop: 2 },
  journeyArrow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4 },
  journeyLine:  { flex: 1, height: 1, backgroundColor: colors.border, width: 20 },
  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bg, paddingHorizontal: 13, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  footerDate:   { fontSize: 10, color: colors.muted, fontWeight: '600' },
  footerPrice:  { fontSize: 13, fontWeight: '800', color: colors.red },
  empty:        { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTxt:     { fontSize: 16, fontWeight: '700', color: colors.navy },
  emptySub:     { fontSize: 12, color: colors.muted, textAlign: 'center' },
  emptyBtn:     { marginTop: 8, backgroundColor: colors.navy, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 11 },
  emptyBtnTxt:  { fontSize: 13, fontWeight: '700', color: colors.white },
  endTxt:       { textAlign: 'center', fontSize: 11, color: colors.muted, marginVertical: 12 },
});
