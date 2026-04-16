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
import { AppIcon } from '../../components/AppIcon';
import { logout } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import type { AdminDashboardResponse } from '../../types/admin';
import type { AdminTabParamLista } from '../../navigation/types';

type MenuRow =
  | {
      iconFamily: 'Feather';
      iconName: React.ComponentProps<typeof AppIcon>['name'];
      label: string;
      sub: string;
      route: keyof AdminTabParamLista;
    }
  | {
      iconFamily: 'Feather';
      iconName: React.ComponentProps<typeof AppIcon>['name'];
      label: string;
      sub: string;
      action: 'publish' | 'unavailable';
    };

type MenuSection = { title: string; rows: MenuRow[] };

const FALLBACK_STATS: AdminDashboardResponse = {
  totalStaff: 48,
  activeStaff: 41,
  employeeCount: 43,
  adminCount: 5,
  totalTransports: 24,
  activeTransports: 19,
  shiftsPending: 6,
  shiftsActive: 13,
  shiftsCompleted: 87,
};

const MENU_SECTIONS: MenuSection[] = [
  {
    title: 'Gestion',
    rows: [
      { iconFamily: 'Feather', iconName: 'users', label: 'Comptes du personnel', sub: 'Gerer employes et admins', route: 'AdminStaff' },
      { iconFamily: 'Feather', iconName: 'map', label: 'Lignes de transport', sub: 'Trajets, arrets, departs', route: 'AdminTransports' },
      { iconFamily: 'Feather', iconName: 'calendar', label: 'Planning des services', sub: 'Horaires et affectations', route: 'AdminPlanning' },
      { iconFamily: 'Feather', iconName: 'send', label: 'Publier les modifications', sub: 'Mettre en ligne les changements', action: 'publish' },
    ],
  },
  {
    title: 'Systeme',
    rows: [
      { iconFamily: 'Feather', iconName: 'bar-chart-2', label: 'Journaux d audit', sub: 'Suivre les actions admin', action: 'unavailable' },
      { iconFamily: 'Feather', iconName: 'bell', label: 'Notifications', sub: 'Alertes et annonces', action: 'unavailable' },
      { iconFamily: 'Feather', iconName: 'settings', label: 'Parametres', sub: 'Configuration du systeme', action: 'unavailable' },
    ],
  },
  {
    title: 'Compte',
    rows: [
      { iconFamily: 'Feather', iconName: 'lock', label: 'Changer le mot de passe', sub: 'Mettre a jour les identifiants', action: 'unavailable' },
      { iconFamily: 'Feather', iconName: 'shield', label: 'Parametres 2FA', sub: 'Authentificateur TOTP', action: 'unavailable' },
    ],
  },
];

export function AdminProfileScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<AdminTabParamLista>>();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [stats, setStats] = useState<AdminDashboardResponse>(FALLBACK_STATS);
  const [loading, setLoading] = useState(true);
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
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const displayName = useMemo(() => {
    const full = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
    if (full) return full;
    if (user?.email) return user.email.split('@')[0];
    return 'Utilisateur admin';
  }, [user]);

  const initials = useMemo(() => {
    const parts = displayName.split(' ').filter(Boolean);
    return `${parts[0]?.[0] ?? 'A'}${parts[1]?.[0] ?? parts[0]?.[0] ?? 'A'}`.toUpperCase();
  }, [displayName]);

  const handlePublish = useCallback(() => {
    Alert.alert(
      'Publier les modifications',
      'Publier tous les services planifies et les mettre en ligne ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Publier',
          style: 'destructive',
          onPress: async () => {
            setPublishing(true);
            try {
              const shiftsRes = await adminShiftApi.list();
              const shiftIds = shiftsRes.data
                .filter((s: any) => s.status === 'SCHEDULED')
                .map((s: any) => s.id);

              if (!shiftIds.length) {
                Alert.alert('Rien a publier', 'Aucun service planifie n a ete trouve.');
                return;
              }

              await adminPlanningApi.publish({ shiftIds });
              await loadStats();
              Alert.alert('Publication terminee', 'Le planning est maintenant en ligne.');
            } catch (err: any) {
              Alert.alert('Erreur', err?.response?.data?.message ?? 'Echec de la publication');
            } finally {
              setPublishing(false);
            }
          },
        },
      ]
    );
  }, [loadStats]);

  const handleMenuPress = useCallback((row: MenuRow) => {
    if ('route' in row) {
      navigation.navigate(row.route);
      return;
    }
    if (row.action === 'publish') {
      handlePublish();
      return;
    }
    Alert.alert('Bientot disponible', `${row.label} n'est pas encore disponible.`);
  }, [navigation, handlePublish]);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Se deconnecter',
      'Voulez-vous vraiment vous deconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se deconnecter',
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
              { val: stats.totalStaff, lbl: 'Personnel' },
              { val: stats.totalTransports, lbl: 'Transports' },
              { val: stats.shiftsActive, lbl: 'Services actifs' },
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
                const isLast = idx === section.rows.length - 1;
                return (
                  <TouchableOpacity
                    key={row.label}
                    style={[styles.menuRow, !isLast && styles.menuRowBorder]}
                    onPress={() => handleMenuPress(row)}
                    disabled={isPublishing}
                    activeOpacity={0.7}
                  >
                    <View style={styles.menuIconWrap}>
                      {isPublishing ? (
                        <ActivityIndicator size="small" color={colors.navy} />
                      ) : (
                        <AppIcon family="Feather" name={row.iconName as never} size={18} color={colors.navy} />
                      )}
                    </View>

                    <View style={styles.menuText}>
                      <Text style={styles.menuLabel}>{row.label}</Text>
                      <Text style={styles.menuSub}>{row.sub}</Text>
                    </View>

                    {'route' in row ? (
                      <AppIcon family="Feather" name="chevron-right" size={18} color={colors.muted} />
                    ) : row.action === 'publish' ? (
                      <View style={styles.liveChip}>
                        <Text style={styles.liveChipTxt}>EN LIGNE</Text>
                      </View>
                    ) : (
                      <View style={styles.soonChip}>
                        <Text style={styles.soonChipTxt}>BIENTOT</Text>
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
          {signingOut ? (
            <ActivityIndicator color={colors.red} size="small" />
          ) : (
            <View style={styles.signOutInner}>
              <AppIcon family="Feather" name="log-out" size={16} color={colors.red} />
              <Text style={styles.signOutTxt}>Se deconnecter</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.version}>TuniWay Connect - Admin v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  hero: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 20, alignItems: 'center', gap: 6 },
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
  avatarTxt: { fontSize: 22, fontWeight: '800', color: colors.white },
  heroName: { fontSize: 17, fontWeight: '800', color: colors.white },
  heroEmail: { fontSize: 12, fontWeight: '700', color: colors.muted },
  roleBadge: { backgroundColor: 'rgba(245,166,35,0.18)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  roleTxt: { fontSize: 11, fontWeight: '800', color: colors.amber },
  body: { flex: 1, backgroundColor: colors.bgLight },
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
  statVal: { fontSize: 22, fontWeight: '800', color: colors.navy },
  statLbl: { fontSize: 10, fontWeight: '700', color: colors.muted, marginTop: 2, textAlign: 'center' },
  statDiv: { width: 1, height: 34, backgroundColor: colors.border },
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
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 12 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.bgLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 13, fontWeight: '700', color: colors.navy },
  menuSub: { fontSize: 11, color: colors.muted, marginTop: 1 },
  liveChip: { backgroundColor: 'rgba(232,56,10,0.12)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
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
  signOutInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signOutTxt: { fontSize: 14, fontWeight: '700', color: colors.red },
  version: { textAlign: 'center', fontSize: 10, color: colors.muted, marginTop: 8 },
});
