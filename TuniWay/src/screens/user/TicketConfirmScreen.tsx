import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { clientTicketApi, parseApiError } from '../../api/client';
import { colors } from '../../theme/colors';
import type { ClientTicketDto } from '../../types/client';
import type { UserStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<UserStackParamList>;
type Route = { params: { ticketId: string } };

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

function QRPlaceholder({ code }: { code: string }) {
  const cells = Array.from({ length: 49 }, (_, i) => {
    const char = code.charCodeAt(i % code.length) ?? 0;
    return (char + i) % 3 !== 0;
  });
  return (
    <View style={qr.box}>
      <View style={qr.grid}>
        {cells.map((filled, i) => (
          <View
            key={i}
            style={[
              qr.cell,
              { backgroundColor: filled ? colors.navy : 'transparent' },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const qr = StyleSheet.create({
  box:  { width: 120, height: 120, backgroundColor: colors.white, borderRadius: 12, padding: 10, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 100, height: 100 },
  cell: { width: 100 / 7, height: 100 / 7, borderRadius: 1 },
});

function TicketCard({ ticket: t }: { ticket: ClientTicketDto }) {
  return (
    <View style={tc.card}>
      <View style={tc.header}>
        <Text style={tc.headerRoute} numberOfLines={1}>{t.transportName}</Text>
        <View style={tc.headerBadge}>
          <Text style={tc.headerBadgeTxt}>{t.productName}</Text>
        </View>
      </View>

      <View style={tc.body}>
        <View style={tc.grid}>
          <View style={tc.gridItem}>
            <Text style={tc.gridLbl}>From</Text>
            <Text style={tc.gridVal}>{t.fromStop}</Text>
          </View>
          <View style={tc.gridItem}>
            <Text style={tc.gridLbl}>To</Text>
            <Text style={tc.gridVal}>{t.toStop}</Text>
          </View>
          <View style={tc.gridItem}>
            <Text style={tc.gridLbl}>Date</Text>
            <Text style={tc.gridVal}>{fmtDate(t.purchasedAt)}</Text>
          </View>
          <View style={tc.gridItem}>
            <Text style={tc.gridLbl}>Departure</Text>
            <Text style={tc.gridVal}>{fmtTime(t.plannedDeparture)}</Text>
          </View>
          <View style={tc.gridItem}>
            <Text style={tc.gridLbl}>Price</Text>
            <Text style={[tc.gridVal, { color: colors.red }]}>{t.price.toFixed(3)} {t.currency}</Text>
          </View>
          <View style={tc.gridItem}>
            <Text style={tc.gridLbl}>Status</Text>
            <Text style={[tc.gridVal, { color: t.status === 'VALID' ? colors.green : colors.muted }]}>
              {t.status}
            </Text>
          </View>
        </View>

        <View style={tc.dashedRow}>
          <View style={tc.dashedNip} />
          <View style={tc.dashedLine} />
          <View style={[tc.dashedNip, { transform: [{ scaleX: -1 }] }]} />
        </View>

        <View style={tc.qrWrap}>
          <QRPlaceholder code={t.qrCode ?? t.id} />
          <Text style={tc.qrHint}>Scan at gate or show to the driver</Text>
        </View>
      </View>

      <View style={tc.footer}>
        <Text style={tc.footerId}>ID: {t.id.slice(0, 8).toUpperCase()}</Text>
        <View style={tc.validRow}>
          <View style={[tc.validDot, { backgroundColor: t.status === 'VALID' ? colors.green : colors.muted }]} />
          <Text style={[tc.validTxt, { color: t.status === 'VALID' ? colors.green : colors.muted }]}>
            {t.status === 'VALID' ? 'Valid ticket' : t.status}
          </Text>
        </View>
      </View>
    </View>
  );
}

const tc = StyleSheet.create({
  card:         { backgroundColor: colors.white, marginHorizontal: 14, borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.border },
  header:       { backgroundColor: colors.red, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerRoute:  { flex: 1, fontSize: 14, fontWeight: '800', color: colors.white },
  headerBadge:  { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 7, paddingHorizontal: 9, paddingVertical: 3 },
  headerBadgeTxt:{ fontSize: 10, fontWeight: '700', color: colors.white },
  body:         { padding: 16 },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  gridItem:     { width: '47%', backgroundColor: colors.bg, borderRadius: 9, padding: 9 },
  gridLbl:      { fontSize: 10, fontWeight: '700', color: colors.muted, marginBottom: 2 },
  gridVal:      { fontSize: 12, fontWeight: '700', color: colors.navy },
  dashedRow:    { flexDirection: 'row', alignItems: 'center', marginHorizontal: -16, marginBottom: 14 },
  dashedNip:    { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.bg },
  dashedLine:   { flex: 1, borderTopWidth: 2, borderColor: colors.border, borderStyle: 'dashed' },
  qrWrap:       { alignItems: 'center', gap: 8 },
  qrHint:       { fontSize: 11, fontWeight: '700', color: colors.muted },
  footer:       { backgroundColor: colors.bg, paddingHorizontal: 16, paddingVertical: 9, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border },
  footerId:     { fontSize: 10, color: colors.muted },
  validRow:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  validDot:     { width: 6, height: 6, borderRadius: 3 },
  validTxt:     { fontSize: 11, fontWeight: '700' },
});

export function TicketConfirmScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute() as unknown as Route;
  const { ticketId } = route.params;

  const [ticket, setTicket] = useState<ClientTicketDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await clientTicketApi.get(ticketId);
        setTicket(res.data.data);
        setError(null);
      } catch (err) {
        setTicket(null);
        setError(parseApiError(err).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [ticketId]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hero}>
        <View style={s.checkRing}>
          <Text style={{ fontSize: 30 }}>✓</Text>
        </View>
        <Text style={s.heroTitle}>Ticket Confirmed!</Text>
        <Text style={s.heroSub}>Show this QR to the driver or scan at the gate</Text>
      </View>

      <ScrollView style={s.body} contentContainerStyle={s.bodyContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={colors.amber} style={{ marginTop: 32 }} />
        ) : ticket ? (
          <TicketCard ticket={ticket} />
        ) : (
          <View style={s.noTicket}>
            <Text style={{ fontSize: 36 }}>🎟</Text>
            <Text style={s.noTicketTxt}>Ticket purchased successfully</Text>
            <Text style={s.noTicketSub}>{error ?? 'It will appear in your ticket history shortly.'}</Text>
          </View>
        )}

        <View style={s.actions}>
          <TouchableOpacity
            style={s.actionOutline}
            onPress={() => navigation.navigate('UserTabs', { screen: 'Tickets' })}
            activeOpacity={0.8}
          >
            <Text style={s.actionOutlineTxt}>View all tickets</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.actionFilled}
            onPress={() => navigation.popToTop()}
            activeOpacity={0.8}
          >
            <Text style={s.actionFilledTxt}>Back to home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.navy },
  hero:           { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 22, alignItems: 'center', gap: 8 },
  checkRing:      { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  heroTitle:      { fontSize: 20, fontWeight: '800', color: colors.white },
  heroSub:        { fontSize: 12, fontWeight: '700', color: colors.muted, textAlign: 'center' },
  body:           { flex: 1, backgroundColor: colors.bg },
  bodyContent:    { paddingVertical: 16, paddingBottom: 32 },
  noTicket:       { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 20 },
  noTicketTxt:    { fontSize: 15, fontWeight: '700', color: colors.navy },
  noTicketSub:    { fontSize: 12, color: colors.muted, textAlign: 'center' },
  actions:        { flexDirection: 'row', gap: 10, marginHorizontal: 14, marginTop: 16 },
  actionOutline:  { flex: 1, backgroundColor: colors.white, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 2, borderColor: colors.navy },
  actionOutlineTxt:{ fontSize: 12, fontWeight: '700', color: colors.navy },
  actionFilled:   { flex: 1, backgroundColor: colors.navy, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  actionFilledTxt:{ fontSize: 12, fontWeight: '700', color: colors.white },
});
