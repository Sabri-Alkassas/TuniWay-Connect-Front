import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { clientAccountApi, parseApiError } from '../../api/client';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import type { ClientAccountResponse } from '../../types/client';
import type { UserStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<UserStackParamList>;

interface MenuRowProps {
  emoji: string;
  bg: string;
  label: string;
  sub?: string;
  badge?: string;
  onPress?: () => void;
  disabled?: boolean;
}
function MenuRow({ emoji, bg, label, sub, badge, onPress, disabled }: MenuRowProps) {
  return (
    <TouchableOpacity
      style={[s.menuRow, disabled && s.menuRowDisabled]}
      onPress={onPress}
      activeOpacity={disabled ? 1 : 0.8}
      disabled={disabled}
    >
      <View style={[s.menuIcon, { backgroundColor: bg }]}>
        <Text style={{ fontSize: 16 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.menuLabel}>{label}</Text>
        {sub && <Text style={s.menuSub}>{sub}</Text>}
      </View>
      {badge && (
        <View style={s.menuBadge}>
          <Text style={s.menuBadgeTxt}>{badge}</Text>
        </View>
      )}
      {!disabled && <Text style={s.menuArrow}>›</Text>}
    </TouchableOpacity>
  );
}

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [account, setAccount] = useState<ClientAccountResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      const res = await clientAccountApi.get();
      setAccount(res.data.data);
      setError(null);
    } catch (err) {
      setError(parseApiError(err).message);
      setAccount(null);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const initials =
    [(account?.firstName?.[0] ?? ''), (account?.lastName?.[0] ?? '')]
      .join('')
      .toUpperCase() || account?.username?.[0]?.toUpperCase() || '?';

  const handleSignOut = async () => {
    setSigningOut(true);
    await clearAuth();
    setSigningOut(false);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hero}>
        <View style={s.avatar}>
          <Text style={s.avatarInit}>{initials}</Text>
        </View>
        <Text style={s.name}>{account?.firstName ?? 'Your'} {account?.lastName ?? 'Profile'}</Text>
        <Text style={s.email}>{account?.email ?? 'Account details unavailable'}</Text>
        {!!account?.role && (
          <View style={s.roleBadge}>
            <Text style={s.roleTxt}>{account.role}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.amber} size="large" />
        </View>
      ) : (
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
          {!!error && (
            <View style={s.errorBanner}>
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          )}

          {account?.status && account.status !== 'ACTIVE' && (
            <View style={s.warnBanner}>
              <Text style={{ fontSize: 16 }}>⚠️</Text>
              <Text style={s.warnTxt}>
                Your account is {account.status.toLowerCase()}.
              </Text>
            </View>
          )}

          <View style={s.infoCard}>
            <View style={s.infoRow}>
              <Text style={s.infoLbl}>Username</Text>
              <Text style={s.infoVal}>{account?.username ?? '—'}</Text>
            </View>
            <View style={s.infoDiv} />
            <View style={s.infoRow}>
              <Text style={s.infoLbl}>Phone</Text>
              <Text style={s.infoVal}>{account?.phone || '—'}</Text>
            </View>
            <View style={s.infoDiv} />
            <View style={s.infoRow}>
              <Text style={s.infoLbl}>Date of birth</Text>
              <Text style={s.infoVal}>{account?.birthDate || '—'}</Text>
            </View>
          </View>

          <Text style={s.sectionTitle}>Account</Text>
          <View style={s.menuCard}>
            <MenuRow
              emoji="✏️" bg={colors.blueLt} label="Edit my info"
              sub="Name, phone, date of birth"
              onPress={() => navigation.navigate('EditProfile')}
            />
            <View style={s.menuDivider} />
            <MenuRow
              emoji="🔒" bg="#f0e6ff" label="Change password"
              sub="Not available from mobile yet"
              badge="Soon"
              disabled
            />
            <View style={s.menuDivider} />
            <MenuRow
              emoji="🎟" bg={colors.greenLt} label="My tickets"
              sub="View purchase history"
              onPress={() => navigation.navigate('UserTabs', { screen: 'Tickets' })}
            />
          </View>

          <Text style={s.sectionTitle}>Support</Text>
          <View style={s.menuCard}>
            <View style={s.staticRow}>
              <Text style={s.staticLabel}>Support email</Text>
              <Text style={s.staticValue}>support@tuniway.tn</Text>
            </View>
            <View style={s.menuDivider} />
            <View style={s.staticRow}>
              <Text style={s.staticLabel}>App version</Text>
              <Text style={s.staticValue}>1.0.0</Text>
            </View>
          </View>

          <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.8} disabled={signingOut}>
            {signingOut ? <ActivityIndicator color={colors.red} /> : <Text style={{ fontSize: 16 }}>↩</Text>}
            <Text style={s.signOutTxt}>Sign out</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.navy },
  hero:         { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 22, alignItems: 'center', gap: 8 },
  centered:     { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  avatar:       { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)' },
  avatarInit:   { fontSize: 28, fontWeight: '800', color: colors.white },
  name:         { fontSize: 20, fontWeight: '800', color: colors.white },
  email:        { fontSize: 12, fontWeight: '700', color: colors.muted },
  roleBadge:    { backgroundColor: 'rgba(245,166,35,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  roleTxt:      { fontSize: 11, fontWeight: '700', color: colors.amber },
  body:         { flex: 1, backgroundColor: colors.bg },
  bodyContent:  { padding: 12, paddingBottom: 24 },
  errorBanner:  { backgroundColor: colors.redLt, borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1.5, borderColor: '#f1b5b5' },
  errorTxt:     { fontSize: 11, fontWeight: '700', color: colors.red },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
  warnBanner:   { backgroundColor: '#fffbe6', borderWidth: 1.5, borderColor: '#fad15f', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  warnTxt:      { flex: 1, fontSize: 11, fontWeight: '700', color: '#7a5700' },
  infoCard:     { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, overflow: 'hidden' },
  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 13 },
  infoLbl:      { fontSize: 12, fontWeight: '700', color: colors.muted },
  infoVal:      { fontSize: 12, fontWeight: '700', color: colors.navy },
  infoDiv:      { height: 1, backgroundColor: colors.border },
  menuCard:     { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, marginBottom: 14, overflow: 'hidden' },
  menuRow:      { flexDirection: 'row', alignItems: 'center', padding: 13, gap: 12 },
  menuRowDisabled:{ opacity: 0.75 },
  menuIcon:     { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  menuLabel:    { fontSize: 13, fontWeight: '700', color: colors.navy },
  menuSub:      { fontSize: 10, color: colors.muted, marginTop: 1 },
  menuBadge:    { backgroundColor: colors.redLt, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  menuBadgeTxt: { fontSize: 10, fontWeight: '700', color: colors.red },
  menuArrow:    { fontSize: 18, color: colors.muted, fontWeight: '700' },
  menuDivider:  { height: 1, backgroundColor: colors.border, marginLeft: 61 },
  staticRow:    { padding: 13, gap: 4 },
  staticLabel:  { fontSize: 10, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  staticValue:  { fontSize: 13, fontWeight: '700', color: colors.navy },
  signOutBtn:   { backgroundColor: colors.white, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.border },
  signOutTxt:   { fontSize: 14, fontWeight: '700', color: colors.red },
});
