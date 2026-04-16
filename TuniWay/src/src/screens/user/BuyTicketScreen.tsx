import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { clientTransportApi, clientTicketApi, parseApiError } from '../../api/client';
import { colors } from '../../theme/colors';
import type {
  ClientTransportStopDto,
  ClientTicketProductDto,
  PaymentMethod,
} from '../../types/client';
import type { UserStackParamList } from '../../navigation/types';
import { AppIcon } from '../../components/AppIcon';

type Nav = NativeStackNavigationProp<UserStackParamList>;
type Route = { params: { transportId: string; transportName: string } };

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string; sub: string }[] = [
  { key: 'CASH', label: 'Espèces', icon: 'cash-multiple', sub: 'Paiement à bord' },
  { key: 'CARD', label: 'Carte', icon: 'credit-card-outline', sub: 'Visa / Mastercard' },
  { key: 'MOBILE', label: 'Paiement mobile', icon: 'cellphone', sub: 'D17 / Flouci' },
];

interface StopSelectorProps {
  label: string;
  selected: ClientTransportStopDto | null;
  stops: ClientTransportStopDto[];
  onSelect: (s: ClientTransportStopDto) => void;
  exclude?: string;
}

function StopSelector({ label, selected, stops, onSelect, exclude }: StopSelectorProps) {
  const [open, setOpen] = useState(false);
  const opts = stops.filter((s) => s.active && s.id !== exclude);

  return (
    <View style={ss.wrap}>
      <Text style={ss.label}>{label}</Text>
      <TouchableOpacity style={ss.selector} onPress={() => setOpen(!open)} activeOpacity={0.8}>
        <AppIcon family="Feather" name="map-pin" size={14} color={colors.white} />
        <Text style={[ss.selectorTxt, !selected && { color: colors.muted }]}>
          {selected ? selected.name : 'Sélectionner un arrêt...'}
        </Text>
        <AppIcon family="Feather" name={open ? 'chevron-up' : 'chevron-down'} size={14} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>
      {open && (
        <View style={ss.dropdown}>
          <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
            {opts.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[ss.option, selected?.id === s.id && ss.optionOn]}
                onPress={() => { onSelect(s); setOpen(false); }}
                activeOpacity={0.8}
              >
                <Text style={ss.optionOrder}>{s.stopOrder}</Text>
                <Text style={[ss.optionName, selected?.id === s.id && { color: colors.navy }]}>
                  {s.name}
                </Text>
                <Text style={ss.optionZone}>Zone {s.zone}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const ss = StyleSheet.create({
  wrap: { marginBottom: 10 },
  label: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', marginBottom: 6 },
  selector: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, gap: 8 },
  selectorTxt: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.white },
  dropdown: { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, marginTop: 4, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 },
  optionOn: { backgroundColor: colors.bgLight },
  optionOrder: { width: 22, fontSize: 10, fontWeight: '800', color: colors.muted, textAlign: 'center' },
  optionName: { flex: 1, fontSize: 12, fontWeight: '700', color: colors.muted },
  optionZone: { fontSize: 10, color: colors.muted },
});

interface ProductCardProps {
  product: ClientTicketProductDto;
  selected: boolean;
  onSelect: () => void;
}

function ProductCard({ product: p, selected, onSelect }: ProductCardProps) {
  const validityLabel = p.validityHours
    ? `Valable ${p.validityHours} h`
    : p.validityDays
      ? `Valable ${p.validityDays} j`
      : null;

  return (
    <TouchableOpacity style={[pc.card, selected && pc.cardOn]} onPress={onSelect} activeOpacity={0.8}>
      <View style={pc.top}>
        <View style={{ flex: 1 }}>
          <Text style={pc.name}>{p.name}</Text>
          <Text style={pc.desc} numberOfLines={2}>{p.description}</Text>
        </View>
        <View style={[pc.checkCircle, selected && pc.checkCircleOn]}>
          {selected && <AppIcon family="Feather" name="check" size={12} color={colors.white} />}
        </View>
      </View>
      <View style={pc.bottom}>
        <Text style={pc.price}>
          {p.price.toFixed(3)} <Text style={pc.currency}>{p.currency}</Text>
        </Text>
        {!!validityLabel && <Text style={pc.validity}>{validityLabel}</Text>}
      </View>
    </TouchableOpacity>
  );
}

const pc = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 14, borderWidth: 2, borderColor: colors.border, marginBottom: 8 },
  cardOn: { borderColor: colors.amber, backgroundColor: '#fffbe6' },
  top: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  name: { fontSize: 14, fontWeight: '800', color: colors.navy, marginBottom: 4 },
  desc: { fontSize: 11, color: colors.muted, lineHeight: 16 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkCircleOn: { backgroundColor: colors.amber, borderColor: colors.amber },
  bottom: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  price: { fontSize: 22, fontWeight: '800', color: colors.red },
  currency: { fontSize: 13, fontWeight: '700', color: colors.muted },
  validity: { fontSize: 11, fontWeight: '700', color: colors.muted, marginLeft: 'auto' },
});

export function BuyTicketScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute() as unknown as Route;
  const { transportId, transportName } = route.params;

  const [stops, setStops] = useState<ClientTransportStopDto[]>([]);
  const [products, setProducts] = useState<ClientTicketProductDto[]>([]);
  const [fromStop, setFromStop] = useState<ClientTransportStopDto | null>(null);
  const [toStop, setToStop] = useState<ClientTransportStopDto | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ClientTicketProductDto | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('CASH');
  const [loadingStops, setLoadingStops] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [stopsError, setStopsError] = useState<string | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await clientTransportApi.getStops(transportId);
        setStops(res.data.data.stops ?? []);
        setStopsError(null);
      } catch (err) {
        setStops([]);
        setStopsError(parseApiError(err).message);
      } finally {
        setLoadingStops(false);
      }
    })();
  }, [transportId]);

  useEffect(() => {
    if (!fromStop || !toStop) {
      setProducts([]);
      setSelectedProduct(null);
      setProductsError(null);
      return;
    }

    (async () => {
      setLoadingProducts(true);
      try {
        const res = await clientTicketApi.getProducts({
          transportId,
          fromStopId: fromStop.id,
          toStopId: toStop.id,
        });
        setProducts(res.data.data ?? []);
        setSelectedProduct(null);
        setProductsError(null);
      } catch (err) {
        setProducts([]);
        setProductsError(parseApiError(err).message);
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, [fromStop, toStop, transportId]);

  const canPurchase = !!fromStop && !!toStop && !!selectedProduct;
  const total = selectedProduct ? selectedProduct.price : 0;

  const handlePurchase = async () => {
    if (!canPurchase || !fromStop || !toStop || !selectedProduct) {
      setPurchaseError('Sélectionnez d’abord un départ, une arrivée et un billet.');
      return;
    }

    setPurchasing(true);
    setPurchaseError(null);

    try {
      const res = await clientTicketApi.purchase({
        productId: selectedProduct.id,
        transportId,
        fromStopId: fromStop.id,
        toStopId: toStop.id,
        provider: 'TUNIWAY',
        providerReference: `TW-${Date.now()}`,
        paymentMethod: payMethod,
      });
      navigation.replace('TicketConfirm', { ticketId: res.data.data.id });
    } catch (err) {
      setPurchaseError(parseApiError(err).message || 'L’achat a échoué. Veuillez réessayer.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <AppIcon family="Feather" name="chevron-left" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.topTitle}>Acheter un billet</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={s.hero}>
        <View style={s.transportRow}>
          <View style={s.transportIcon}>
            <AppIcon family="MaterialCommunityIcons" name="bus" size={22} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.transportName} numberOfLines={1}>{transportName}</Text>
            <Text style={s.transportSub}>Choisissez votre trajet ci-dessous</Text>
          </View>
        </View>

        {loadingStops ? (
          <ActivityIndicator color={colors.amber} style={{ marginTop: 12 }} />
        ) : stopsError ? (
          <View style={s.heroError}>
            <Text style={s.heroErrorText}>{stopsError}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Text style={s.retryTxt}>Retour</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <StopSelector
              label="Départ"
              selected={fromStop}
              stops={stops}
              onSelect={(stop) => {
                setFromStop(stop);
                setPurchaseError(null);
                if (toStop?.id === stop.id) setToStop(null);
              }}
            />
            <StopSelector
              label="Arrivée"
              selected={toStop}
              stops={stops}
              onSelect={(stop) => {
                setToStop(stop);
                setPurchaseError(null);
              }}
              exclude={fromStop?.id}
            />
          </>
        )}
      </View>

      <ScrollView style={s.body} contentContainerStyle={s.bodyContent} showsVerticalScrollIndicator={false}>
        {!!purchaseError && (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>{purchaseError}</Text>
          </View>
        )}

        {(fromStop && toStop) && (
          <>
            <Text style={s.sectionTitle}>Choisissez votre billet</Text>
            {loadingProducts ? (
              <ActivityIndicator color={colors.amber} style={{ marginBottom: 16 }} />
            ) : productsError ? (
              <View style={s.noProdBox}>
                <Text style={s.noProdTxt}>{productsError}</Text>
              </View>
            ) : products.length === 0 ? (
              <View style={s.noProdBox}>
                <AppIcon family="MaterialCommunityIcons" name="ticket-outline" size={28} color={colors.muted} />
                <Text style={s.noProdTxt}>Aucun billet disponible pour ce trajet</Text>
              </View>
            ) : (
              products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  selected={selectedProduct?.id === p.id}
                  onSelect={() => {
                    setSelectedProduct(p);
                    setPurchaseError(null);
                  }}
                />
              ))
            )}
          </>
        )}

        {!fromStop || !toStop ? (
          <View style={s.selectHint}>
            <AppIcon family="MaterialIcons" name="swipe-up" size={32} color={colors.muted} />
            <Text style={s.hintTxt}>
              Sélectionnez le départ et l’arrivée pour voir les billets disponibles
            </Text>
          </View>
        ) : null}

        {canPurchase && (
          <>
            <Text style={s.sectionTitle}>Mode de paiement</Text>
            <View style={s.payGrid}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[s.payCard, payMethod === m.key && s.payCardOn]}
                  onPress={() => setPayMethod(m.key)}
                  activeOpacity={0.8}
                >
                  <AppIcon family="MaterialCommunityIcons" name={m.icon as never} size={24} color={colors.navy} />
                  <Text style={[s.payLabel, payMethod === m.key && { color: colors.navy }]}>{m.label}</Text>
                  <Text style={s.paySub}>{m.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.summary}>
              <View style={s.summaryRow}>
                <Text style={s.sumLbl}>{selectedProduct?.name}</Text>
                <Text style={s.sumVal}>{total.toFixed(3)} {selectedProduct?.currency}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.sumLbl}>Départ</Text>
                <Text style={s.sumVal}>{fromStop?.name}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.sumLbl}>Arrivée</Text>
                <Text style={s.sumVal}>{toStop?.name}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.sumLbl}>Paiement</Text>
                <Text style={s.sumVal}>{PAYMENT_METHODS.find((m) => m.key === payMethod)?.label}</Text>
              </View>
              <View style={s.sumDivider} />
              <View style={s.summaryRow}>
                <Text style={s.sumTotal}>Total</Text>
                <Text style={s.sumTotalVal}>{total.toFixed(3)} {selectedProduct?.currency}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.buyBtn, !canPurchase && s.buyBtnDisabled]}
          onPress={handlePurchase}
          disabled={purchasing}
          activeOpacity={0.8}
        >
          {purchasing ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <AppIcon family="Feather" name="lock" size={18} color={colors.white} />
              <Text style={s.buyBtnTxt}>
                {canPurchase && selectedProduct
                  ? `Payer ${total.toFixed(3)} ${selectedProduct.currency}`
                  : 'Choisissez vos arrêts et votre billet'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  topbar: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.white, textAlign: 'center' },
  hero: { paddingHorizontal: 14, paddingBottom: 16 },
  heroError: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 12, gap: 10 },
  heroErrorText: { fontSize: 12, fontWeight: '700', color: colors.white },
  retryBtn: { alignSelf: 'flex-start', backgroundColor: colors.amber, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  retryTxt: { fontSize: 11, fontWeight: '800', color: colors.navy },
  transportRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  transportIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  transportName: { fontSize: 14, fontWeight: '800', color: colors.white },
  transportSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  body: { flex: 1, backgroundColor: colors.bgLight },
  bodyContent: { padding: 14, paddingBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.navy, marginBottom: 10 },
  errorBanner: { backgroundColor: colors.redLt, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1.5, borderColor: '#f1b5b5' },
  errorText: { fontSize: 11, fontWeight: '700', color: colors.red },
  noProdBox: { alignItems: 'center', gap: 8, paddingVertical: 24, backgroundColor: colors.white, borderRadius: 14, marginBottom: 12, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14 },
  noProdTxt: { fontSize: 13, fontWeight: '700', color: colors.muted, textAlign: 'center' },
  selectHint: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  hintTxt: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  payGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  payCard: { flex: 1, backgroundColor: colors.white, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4, borderWidth: 2, borderColor: colors.border },
  payCardOn: { borderColor: colors.amber, backgroundColor: '#fffbe6' },
  payLabel: { fontSize: 11, fontWeight: '700', color: colors.muted },
  paySub: { fontSize: 9, color: colors.muted, textAlign: 'center' },
  summary: { backgroundColor: colors.white, borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: colors.border, marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: 12 },
  sumLbl: { fontSize: 11, color: colors.muted, flex: 1 },
  sumVal: { fontSize: 11, fontWeight: '700', color: colors.navy, flex: 1, textAlign: 'right' },
  sumDivider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  sumTotal: { fontSize: 13, fontWeight: '800', color: colors.navy },
  sumTotalVal: { fontSize: 18, fontWeight: '800', color: colors.red },
  footer: { padding: 14, paddingBottom: 20, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  buyBtn: { backgroundColor: colors.red, borderRadius: 14, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buyBtnDisabled: { backgroundColor: colors.muted },
  buyBtnTxt: { fontSize: 15, fontWeight: '800', color: colors.white },
});
