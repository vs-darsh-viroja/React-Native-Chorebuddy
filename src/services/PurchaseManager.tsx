import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ErrorCode,
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type PricingPhaseAndroid,
  type ProductSubscription,
  type ProductSubscriptionAndroid,
  type ProductSubscriptionAndroidOfferDetails,
  type Purchase,
  type PurchaseError,
} from 'react-native-iap';

export type SubscriptionPlan = 'weekly' | 'yearly' | 'gift';
export const PRODUCT_IDS: Record<SubscriptionPlan, string> = {
  weekly: 'com.chorebuddy.weekly',
  yearly: 'com.chorebuddy.yearly',
  gift: 'com.chorebuddy.yearlygift',
};
export const BASE_PLAN_IDS: Record<SubscriptionPlan, string> = {
  weekly: 'chorebuddy-weekly',
  yearly: 'chorebuddy-yearly',
  gift: 'chorebuddy-yearlygift',
};
export const YEARLY_OFFER_ID = 'yearly-offer';

export interface ChoreBuddyProduct {
  id: string;
  plan: SubscriptionPlan;
  displayPrice: string;
  price: number;
  currency: string;
  offerToken?: string;
  hasTrial: boolean;
  trialDays: number;
}
export interface PurchaseOutcome { hasPro: boolean; error: string | null }
interface PurchaseContextValue {
  products: ChoreBuddyProduct[];
  hasPro: boolean;
  hasLoadedInitialStatus: boolean;
  isInProgress: boolean;
  isRestoring: boolean;
  purchaseError: string | null;
  product: (plan: SubscriptionPlan) => ChoreBuddyProduct | null;
  purchase: (product: ChoreBuddyProduct) => Promise<PurchaseOutcome>;
  restore: () => Promise<PurchaseOutcome>;
  clearPurchaseError: () => void;
}

const Context = createContext<PurchaseContextValue | null>(null);
const plans: SubscriptionPlan[] = ['weekly', 'yearly', 'gift'];
const planForId = (id: string) => plans.find(p => PRODUCT_IDS[p] === id) ?? null;
const phases = (offer: ProductSubscriptionAndroidOfferDetails): PricingPhaseAndroid[] => offer.pricingPhases?.pricingPhaseList ?? [];
const free = (phase: PricingPhaseAndroid) => Number(phase.priceAmountMicros ?? '0') === 0;
const recurring = (offer?: ProductSubscriptionAndroidOfferDetails) => {
  const list = offer ? phases(offer) : [];
  return [...list].reverse().find(p => !free(p)) ?? list[list.length - 1];
};

function normalize(raw: ProductSubscription): ChoreBuddyProduct | null {
  const plan = planForId(raw.id);
  if (!plan) return null;
  if (raw.platform !== 'android') return { id: raw.id, plan, displayPrice: raw.displayPrice, price: raw.price ?? 0, currency: raw.currency, hasTrial: (raw.subscriptionOffers?.length ?? 0) > 0, trialDays: 0 };
  const android = raw as ProductSubscriptionAndroid;
  const offers = android.subscriptionOfferDetailsAndroid ?? [];
  const matchingBase = offers.find(o => o.basePlanId === BASE_PLAN_IDS[plan] && !o.offerId);
  const preferred = plan === 'yearly'
    ? offers.find(o => o.basePlanId === BASE_PLAN_IDS.yearly && o.offerId === YEARLY_OFFER_ID) ?? matchingBase
    : matchingBase ?? offers.find(o => o.basePlanId === BASE_PLAN_IDS[plan]);
  const pricePhase = recurring(matchingBase) ?? recurring(preferred);
  return {
    id: raw.id,
    plan,
    displayPrice: pricePhase?.formattedPrice ?? raw.displayPrice,
    price: pricePhase ? Number(pricePhase.priceAmountMicros ?? 0) / 1_000_000 : raw.price ?? 0,
    currency: pricePhase?.priceCurrencyCode ?? raw.currency,
    offerToken: preferred?.offerToken,
    hasTrial: preferred ? phases(preferred).some(free) : false,
    trialDays: (() => { const period = preferred ? phases(preferred).find(free)?.billingPeriod : undefined; const match = period?.match(/^P(?:(\d+)W)?(?:(\d+)D)?$/); return match ? Number(match[1] ?? 0) * 7 + Number(match[2] ?? 0) : 0; })(),
  };
}

export function PurchaseProvider({ children }: React.PropsWithChildren) {
  const [products, setProducts] = useState<ChoreBuddyProduct[]>([]);
  const [hasPro, setHasPro] = useState(false);
  const [hasLoadedInitialStatus, setLoaded] = useState(false);
  const [isInProgress, setProgress] = useState(false);
  const [isRestoring, setRestoring] = useState(false);
  const [purchaseError, setError] = useState<string | null>(null);
  const hasProRef = useRef(false);
  const pending = useRef<((result: PurchaseOutcome) => void) | null>(null);
  const settle = useCallback((result: PurchaseOutcome) => { const done = pending.current; pending.current = null; done?.(result); }, []);

  const refresh = useCallback(async (restoring = false): Promise<PurchaseOutcome> => {
    if (restoring) setRestoring(true);
    try {
      const purchases = await getAvailablePurchases();
      const active = purchases.filter(p => p.purchaseState !== 'pending' && (p as Purchase & { isSuspendedAndroid?: boolean }).isSuspendedAndroid !== true && planForId(p.productId));
      active.forEach(p => { if ((p as Purchase & { isAcknowledgedAndroid?: boolean }).isAcknowledgedAndroid === false) void finishTransaction({ purchase: p, isConsumable: false }); });
      const pro = active.length > 0;
      hasProRef.current = pro;
      setHasPro(pro);
      setLoaded(true);
      return { hasPro: pro, error: null };
    } catch (error) {
      if (__DEV__) console.warn('[Purchases] entitlement refresh failed', error);
      setLoaded(true);
      return { hasPro: hasProRef.current, error: 'Could not check purchases. Please try again.' };
    } finally { if (restoring) setRestoring(false); }
  }, []);

  useEffect(() => {
    let alive = true;
    let updated: { remove(): void } | undefined;
    let failed: { remove(): void } | undefined;
    void (async () => {
      try {
        await initConnection();
        if (!alive) return;
        updated = purchaseUpdatedListener(async purchase => {
          if (purchase.purchaseState === 'pending') { const message = 'Purchase is pending approval.'; setError(message); settle({ hasPro: hasProRef.current, error: message }); return; }
          try { await finishTransaction({ purchase, isConsumable: false }); } catch (error) { if (__DEV__) console.warn('[Purchases] acknowledgement failed', error); }
          settle(await refresh());
        });
        failed = purchaseErrorListener((error: PurchaseError) => {
          if (error.code === ErrorCode.UserCancelled) { settle({ hasPro: hasProRef.current, error: null }); return; }
          if (error.code === ErrorCode.AlreadyOwned) { void refresh().then(settle); return; }
          const message = error.code === ErrorCode.Pending || error.code === ErrorCode.DeferredPayment ? 'Purchase is pending approval.' : 'Purchase failed. Please try again.';
          setError(message); settle({ hasPro: hasProRef.current, error: message });
        });
        const raw = await fetchProducts({ skus: plans.map(p => PRODUCT_IDS[p]), type: 'subs' }) as ProductSubscription[] | null;
        if (alive) setProducts((raw ?? []).map(normalize).filter((p): p is ChoreBuddyProduct => !!p));
        await refresh();
      } catch (error) {
        if (__DEV__) console.warn('[Purchases] Play Billing unavailable', error);
        if (alive) setLoaded(true);
      }
    })();
    return () => { alive = false; updated?.remove(); failed?.remove(); void endConnection(); };
  }, [refresh, settle]);

  const purchase = useCallback(async (item: ChoreBuddyProduct): Promise<PurchaseOutcome> => {
    setProgress(true); setError(null);
    try {
      return await new Promise<PurchaseOutcome>(resolve => {
        pending.current = resolve;
        void requestPurchase({ type: 'subs', request: { google: { skus: [item.id], subscriptionOffers: item.offerToken ? [{ sku: item.id, offerToken: item.offerToken }] : [] }, apple: { sku: item.id } } }).catch(error => {
          if (__DEV__) console.warn('[Purchases] request failed', error);
          const message = 'Purchase failed. Please try again.'; setError(message); settle({ hasPro: hasProRef.current, error: message });
        });
      });
    } finally { setProgress(false); }
  }, [settle]);

  const value = useMemo<PurchaseContextValue>(() => ({ products, hasPro, hasLoadedInitialStatus, isInProgress, isRestoring, purchaseError, product: plan => products.find(p => p.plan === plan) ?? null, purchase, restore: () => refresh(true), clearPurchaseError: () => setError(null) }), [products, hasPro, hasLoadedInitialStatus, isInProgress, isRestoring, purchaseError, purchase, refresh]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePurchases() {
  const value = useContext(Context);
  if (!value) throw new Error('usePurchases must be used inside PurchaseProvider');
  return value;
}
