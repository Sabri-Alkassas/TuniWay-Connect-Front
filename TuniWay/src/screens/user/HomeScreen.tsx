import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { clientDashboardApi, parseApiError } from '../../api/client';
import { colors } from '../../theme/colors';
import type { ClientDashboardResponse, ClientTicketDto } from '../../types/client';
import type { UserStackParamList } from '../../navigation/types';
import { AppIcon } from '../../components/AppIcon';

type Nav = NativeStackNavigationProp<UserStackParamList>;

interface StatTileProps { label: string; value: string | number; }
function StatTile({ label, value }: StatTileProps) {
  return (
    <View style={s.heroStat}>
      <Text style={s.heroStatVal}>{value}</Text>
      <Text style={s.heroStatLbl}>{label}</Text>
    </View>
  );
}

interface QuickCardProps {
  label: string;
  sub: string;
  bg: string;
  iconFamily: React.ComponentProps<typeof AppIcon>['family'];
  iconName: string;
  onPress: () => void;
}

function QuickCard({ label, sub, bg, iconFamily, iconName, onPress }: QuickCardProps) {
  return (
    <TouchableOpacity style={s.qaCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.qaIcon, { backgroundColor: bg }]}>
        <AppIcon family={iconFamily as never} name={iconName as never} size={22} color={colors.navy} />
      </View>
      <Text style={s.qaLabel}>{label}</Text>
      <Text style={s.qaSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

interface RecentTicketRowProps {
  ticket: ClientTicketDto;
  onPress: () => void;
}
function RecentTicketRow({ ticket, onPress }: RecentTicketRowProps) {
  const isValid = ticket.status === 'VALID';
  return (
    <TouchableOpacity style={s.recentCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[s.recentIcon, { backgroundColor: colors.redLt }]}>
        <AppIcon family="MaterialCommunityIcons" name="ticket-outline" size={20} color={colors.red} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.recentName} numberOfLines={1}>{ticket.transportName}</Text>
        <Text style={s.recentDate}>
          {ticket.fromStop} - {ticket.toStop} - {ticket.price} {ticket.currency}
        </Text>
      </View>
      <View style={[s.recentBadge, { backgroundColor: isValid ? colors.greenLt : colors.bg }]}>
        <Text style={[s.recentBadgeTxt, { color: isValid ? '#27500A' : colors.muted }]}>
          {isValid ? 'Valide' : ticket.status}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [data, setData] = useState<ClientDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      const res = await clientDashboardApi.get();
      setData(res.data.data);
      setError(null);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Bonjour,' : hour < 18 ? 'Bon après-midi,' : 'Bonsoir,';
  const displayName = [data?.firstName, data?.lastName].filter(Boolean).join(' ') || 'voyageur';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topbar}>
        <View style={s.logoRow}>
          <View style={s.logoBadge}><Text style={s.logoBadgeTxt}>TW</Text></View>
          <View>
            <Text style={s.logoText}>Tuni<Text style={s.logoAccent}>Way</Text></Text>
            <Text style={s.logoSub}>CONNECT</Text>
          </View>
        </View>
        <View style={s.notifBtn}>
          <AppIcon family="Feather" name="bell" size={16} color={colors.white} />
        </View>
      </View>

      <View style={s.hero}>
        <Text style={s.greeting}>{greeting}</Text>
        <Text style={s.name}>{displayName}</Text>

        {loading && !data ? (
          <ActivityIndicator color={colors.amber} style={{ marginTop: 16 }} />
        ) : !data ? (
          <View style={s.heroError}>
            <Text style={s.heroErrorTitle}>Impossible de charger votre espace</Text>
            <Text style={s.heroErrorText}>{error ?? 'Veuillez réessayer dans un instant.'}</Text>
            <TouchableOpacity style={s.heroRetryBtn} onPress={() => load()} activeOpacity={0.8}>
              <Text style={s.heroRetryTxt}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.heroStats}>
            <StatTile label="Trajets" value={data.totalTrips ?? 0} />
            <StatTile label="Billets actifs" value={data.activeTickets ?? 0} />
            <StatTile
              label="Compte"
              value={data.accountStatus === 'ACTIVE' ? 'Actif' : 'À vérifier'}
            />
          </View>
        )}
      </View>

      <ScrollView
        style={s.body}
        contentContainerStyle={s.bodyContent}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor={colors.amber}
          />
        )}
      >
        {!!error && !!data && (
          <View style={s.warnBanner}>
            <AppIcon family="Feather" name="alert-triangle" size={16} color="#7a5700" />
            <Text style={s.warnTxt}>{error}</Text>
          </View>
        )}

        {(data?.missingFields?.length ?? 0) > 0 && (
          <TouchableOpacity
            style={s.warnBanner}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.8}
          >
            <AppIcon family="Feather" name="alert-triangle" size={16} color="#7a5700" />
            <Text style={s.warnTxt}>
              Complétez votre profil : {data?.missingFields.join(', ')}
            </Text>
            <AppIcon family="Feather" name="chevron-right" size={18} color="#7a5700" />
          </TouchableOpacity>
        )}

        <Text style={s.sectionTitle}>De quoi avez-vous besoin ?</Text>
        <View style={s.qaGrid}>
          <QuickCard
            iconFamily="Feather"
            iconName="search"
            label="Trouver une ligne"
            sub="Rechercher un trajet"
            bg={colors.blueLt}
            onPress={() => navigation.navigate('UserTabs', { screen: 'Search' })}
          />
          <QuickCard
            iconFamily="Feather"
            iconName="map-pin"
            label="Arrêts proches"
            sub="Voir la carte"
            bg={colors.redLt}
            onPress={() => navigation.navigate('UserTabs', { screen: 'Map' })}
          />
          <QuickCard
            iconFamily="MaterialCommunityIcons"
            iconName="ticket-outline"
            label="Mes billets"
            sub="Consulter l'historique"
            bg={colors.greenLt}
            onPress={() => navigation.navigate('UserTabs', { screen: 'Tickets' })}
          />
          <QuickCard
            iconFamily="Feather"
            iconName="user"
            label="Mon profil"
            sub="Modifier mes infos"
            bg="#f5e6ff"
            onPress={() => navigation.navigate('EditProfile')}
          />
        </View>

        {(data?.recentTickets?.length ?? 0) > 0 && (
          <>
            <View style={s.secHeader}>
              <Text style={s.sectionTitle}>Billets récents</Text>
              <TouchableOpacity onPress={() => navigation.navigate('UserTabs', { screen: 'Tickets' })}>
                <Text style={s.secLink}>Tout voir</Text>
              </TouchableOpacity>
            </View>
            {data?.recentTickets.slice(0, 3).map((t) => (
              <RecentTicketRow
                key={t.id}
                ticket={t}
                onPress={() => navigation.navigate('TicketConfirm', { ticketId: t.id })}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  topbar: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBadge: { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  logoBadgeTxt: { color: colors.white, fontSize: 10, fontWeight: '800' },
  logoText: { fontSize: 14, fontWeight: '800', color: colors.white },
  logoAccent: { color: colors.amber },
  logoSub: { fontSize: 8, fontWeight: '700', color: '#6ec0f5', letterSpacing: 2 },
  notifBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  hero: { paddingHorizontal: 14, paddingBottom: 16 },
  greeting: { fontSize: 12, fontWeight: '700', color: colors.muted },
  name: { fontSize: 22, fontWeight: '800', color: colors.white, marginBottom: 14 },
  heroStats: { flexDirection: 'row', gap: 8 },
  heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, alignItems: 'center' },
  heroStatVal: { fontSize: 16, fontWeight: '800', color: colors.white },
  heroStatLbl: { fontSize: 9, fontWeight: '700', color: colors.muted, marginTop: 3, textAlign: 'center' },
  heroError: { marginTop: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, gap: 8 },
  heroErrorTitle: { fontSize: 14, fontWeight: '800', color: colors.white },
  heroErrorText: { fontSize: 11, color: colors.muted, lineHeight: 16 },
  heroRetryBtn: { alignSelf: 'flex-start', backgroundColor: colors.amber, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  heroRetryTxt: { fontSize: 11, fontWeight: '800', color: colors.navy },
  body: { flex: 1, backgroundColor: colors.bg },
  bodyContent: { padding: 12, paddingBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.navy, marginBottom: 10, marginTop: 4 },
  secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  secLink: { fontSize: 11, fontWeight: '700', color: colors.blue },
  warnBanner: { backgroundColor: '#fffbe6', borderWidth: 1.5, borderColor: '#fad15f', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  warnTxt: { flex: 1, fontSize: 11, fontWeight: '700', color: '#7a5700' },
  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  qaCard: { width: '47%', backgroundColor: colors.white, borderRadius: 16, padding: 13, gap: 7, borderWidth: 1.5, borderColor: colors.border },
  qaIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontSize: 12, fontWeight: '700', color: colors.navy, lineHeight: 16 },
  qaSub: { fontSize: 10, color: colors.muted },
  recentCard: { backgroundColor: colors.white, borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  recentIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  recentName: { fontSize: 13, fontWeight: '700', color: colors.navy },
  recentDate: { fontSize: 11, color: colors.muted, marginTop: 2 },
  recentBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  recentBadgeTxt: { fontSize: 10, fontWeight: '700' },
});
