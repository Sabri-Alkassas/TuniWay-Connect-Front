import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { adminDashboardApi, adminPlanningApi, adminShiftApi } from '../../api/admin';
import { logout } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import type { AdminDashboardResponse } from '../../types/admin';
import type { AdminTabParamLista } from '../../navigation/types';


type MenuRow =
  | { icon: string; label: string; sub: string; route: keyof AdminTabParamLista }
  | { icon: string; label: string; sub: string; action: 'publish' | 'unavailable' };

type MenuSection = { title: string; rows: MenuRow[] };



const FALLBACK_STATS: AdminDashboardResponse = {
  totalStaff:       48,
  activeStaff:      41,
  employeeCount:    43,
  adminCount:        5,
  totalTransports:  24,
  activeTransports: 19,
  shiftsPending:     6,
  shiftsActive:     13,
  shiftsCompleted:  87,
};

const MENU_SECTIONS: MenuSection[] = [
  {
    title: 'Management',
    rows: [
      { icon: '👥', label: 'Staff Accounts',  sub: 'Manage employees & admins',   route: 'AdminStaff'      },
      { icon: '🚌', label: 'Transport Lines', sub: 'Routes, stops, departures',   route: 'AdminTransports' },
      { icon: '📆', label: 'Shift Planning',  sub: 'Schedules & assignments',     route: 'AdminPlanning'   },
      { icon: '🚀', label: 'Publish Changes', sub: 'Go live with staged updates', action: 'publish'        },
    ],
  },
  {
    title: 'System',
    rows: [
      { icon: '📊', label: 'Audit Logs',    sub: 'Track admin actions',  action: 'unavailable' },
      { icon: '🔔', label: 'Notifications', sub: 'Alerts & broadcasts',  action: 'unavailable' },
      { icon: '⚙️', label: 'Settings',      sub: 'System configuration', action: 'unavailable' },
    ],
  },
  {
    title: 'Account',
    rows: [
      { icon: '🔐', label: 'Change Password', sub: 'Update credentials', action: 'unavailable' },
      { icon: '🔑', label: '2FA Settings',    sub: 'TOTP authenticator', action: 'unavailable' },
    ],
  },
];



export function AdminProfileScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<AdminTabParamLista>>();
  const user       = useAuthStore((state) => state.user);
  const clearAuth  = useAuthStore((state) => state.clearAuth);

  const [stats,      setStats]      = useState<AdminDashboardResponse>(FALLBACK_STATS);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);


  const loadStats = useCallback(async (isRefresh = false) => {
    try {
      const res = await adminDashboardApi.get();
      setStats(res.data);
    } catch {
      setStats(FALLBACK_STATS);
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);


  const displayName = useMemo(() => {
    const full = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
    if (full)        return full;
    if (user?.email) return user.email.split('@')[0];
    return 'Admin User';
  }, [user]);

  const initials = useMemo(() => {
    const parts = displayName.split(' ').filter(Boolean);
    return `${parts[0]?.[0] ?? 'A'}${parts[1]?.[0] ?? parts[0]?.[0] ?? 'A'}`.toUpperCase();
  }, [displayName]);


  const handlePublish = useCallback(() => {
    Alert.alert(
      ' Publish Changes',
      'Publish all scheduled shifts and go live?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          style: 'destructive',
          onPress: async () => {
            setPublishing(true);
            try {
              const shiftsRes = await adminShiftApi.list();
              const shiftIds  = shiftsRes.data
                .filter((s) => s.status === 'SCHEDULED')
                .map((s) => s.id);

              if (!shiftIds.length) {
                Alert.alert('Nothing to publish', 'No scheduled shifts found.');
                return;
              }

              await adminPlanningApi.publish({ shiftIds });
              await loadStats();
              Alert.alert('✅ Published', 'Planning is now live.');
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message ?? 'Failed to publish');
            } finally {
              setPublishing(false);
            }
          },
        },
      ]
    );
  }, [loadStats]);

  const handleMenuPress = useCallback((row: MenuRow) => {
    if ('route' in row)             { navigation.navigate(row.route); return; }
    if (row.action === 'publish')   { handlePublish(); return; }
    Alert.alert('Coming soon', `${row.label} is not yet available.`);
  }, [navigation, handlePublish]);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              await logout(); 
            } catch {

            } finally {
              clearAuth();     
              setSigningOut(false);
            }
          },
        },
      ]
    );
  }, [clearAuth]);


  return (
    <SafeAreaView style={styles.safe} edges={['top']}>


      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>{initials}</Text>
        </View>
        <Text style={styles.heroName}>{displayName}</Text>
        <Text style={styles.heroEmail}>{user?.email ?? 'admin@tuniway.tn'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleTxt}>ADMIN</Text>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadStats(true); }}
            tintColor={colors.amber}
          />
        }
      >

        <View style={styles.statsRow}>
          {loading ? (
            <ActivityIndicator color={colors.amber} style={{ flex: 1, paddingVertical: 12 }} />
          ) : (
            ([
              { val: stats.totalStaff,      lbl: 'Staff'        },
              { val: stats.totalTransports, lbl: 'Transports'   },
              { val: stats.shiftsActive,    lbl: 'Active Shifts' },
            ] as const).map((item, i, arr) => (
              <React.Fragment key={item.lbl}>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{item.val}</Text>
                  <Text style={styles.statLbl}>{item.lbl}</Text>
                </View>
                {i < arr.length - 1 && <View style={styles.statDiv} />}
              </React.Fragment>
            ))
          )}
        </View>


        {MENU_SECTIONS.map((section) => (
          <View key={section.title}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.rows.map((row, idx) => {
                const isPublishing = publishing && 'action' in row && row.action === 'publish';
                const isLast       = idx === section.rows.length - 1;
                return (
                  <TouchableOpacity
                    key={row.label}
                    style={[styles.menuRow, !isLast && styles.menuRowBorder]}
                    onPress={() => handleMenuPress(row)}
                    disabled={isPublishing}
                    activeOpacity={0.7}
                  >

                    <View style={styles.menuIconWrap}>
                      {isPublishing
                        ? <ActivityIndicator size="small" color={colors.navy} />
                        : <Text style={styles.menuEmoji}>{row.icon}</Text>
                      }
                    </View>

                    <View style={styles.menuText}>
                      <Text style={styles.menuLabel}>{row.label}</Text>
                      <Text style={styles.menuSub}>{row.sub}</Text>
                    </View>

                    {'route' in row ? (
                      <Text style={styles.chevron}>›</Text>
                    ) : row.action === 'publish' ? (
                      <View style={styles.liveChip}>
                        <Text style={styles.liveChipTxt}>GO LIVE</Text>
                      </View>
                    ) : (
                      <View style={styles.soonChip}>
                        <Text style={styles.soonChipTxt}>SOON</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

      
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.8}
        >
          {signingOut
            ? <ActivityIndicator color={colors.red} size="small" />
            : <Text style={styles.signOutTxt}>🚪  Sign Out</Text>
          }
        </TouchableOpacity>

        <Text style={styles.version}>TuniWay Connect · Admin v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },


  hero: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 20,
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 2,
  },
  avatarTxt:  { fontSize: 22, fontWeight: '800', color: colors.white },
  heroName:   { fontSize: 17, fontWeight: '800', color: colors.white },
  heroEmail:  { fontSize: 12, fontWeight: '700', color: colors.muted  },
  roleBadge:  {
    backgroundColor: 'rgba(245,166,35,0.18)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  roleTxt: { fontSize: 11, fontWeight: '800', color: colors.amber },


  body:        { flex: 1, backgroundColor: colors.bgLight },
  bodyContent: { padding: 12, paddingBottom: 32 },


  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    minHeight: 72,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal:  { fontSize: 22, fontWeight: '800', color: colors.navy },
  statLbl:  { fontSize: 10, fontWeight: '700', color: colors.muted, marginTop: 2, textAlign: 'center' },
  statDiv:  { width: 1, height: 34, backgroundColor: colors.border },


  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 4,
    paddingHorizontal: 4,
  },


  menuCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 12,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.bgLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuEmoji:  { fontSize: 18 },
  menuText:   { flex: 1 },
  menuLabel:  { fontSize: 13, fontWeight: '700', color: colors.navy },
  menuSub:    { fontSize: 11, color: colors.muted, marginTop: 1 },
  chevron:    { fontSize: 24, color: colors.muted, fontWeight: '300', lineHeight: 28 },

  liveChip: {
    backgroundColor: 'rgba(232,56,10,0.12)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  liveChipTxt: { fontSize: 10, fontWeight: '800', color: colors.red },

  soonChip: {
    backgroundColor: colors.bgLight,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  soonChipTxt: { fontSize: 10, fontWeight: '700', color: colors.muted },

  // ── sign out
  signOutBtn: {
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: 4,
    marginBottom: 6,
    minHeight: 52,
  },
  signOutTxt: { fontSize: 14, fontWeight: '700', color: colors.red },

  version: {
    textAlign: 'center',
    fontSize: 10,
    color: colors.muted,
    marginTop: 8,
  },
});