import { Navigate, useLocation } from 'react-router-dom';
import { useEntitlements } from '../../hooks/useEntitlements';
import { STATUS } from '../../constants/entitlements';

/**
 * SubscriptionGate — app-entry gate for accounts with no subscription
 * relationship.
 *
 * Sits inside PrivateRoute (auth + email verification already passed) and
 * wraps AppLayout. It distinguishes accounts that HAVE a subscription
 * relationship (active, trialing, past due, pilot in any phase, founder, comp)
 * from accounts that have NONE, and redirects the latter to /pricing — a
 * conversion surface, not a dead end.
 *
 * Decisions (see access-gate brief):
 *   - We gate APP ENTRY, not data entry by tier. Any relationship retains full
 *     data-entry access per existing entitlements/Firestore rules.
 *   - Pilots are never redirected to /pricing, in any phase (grace or expired).
 *   - canceled mirrors canAccess: gated. Under the cancel-at-period-end webhook
 *     model, subscriptionStatus only becomes "canceled" after the paid period
 *     has already ended, so there is no "canceled but still paid-through" state
 *     to honor here.
 *   - The AI gate (server-side in the Cloud Functions) is the authoritative
 *     paywall and is untouched by this component.
 */

// Only these two derived statuses block app entry. Everything else — pilot
// (incl. grace/expired), past_due, trialing, active, founder, comp — passes.
const GATED_STATUSES = new Set([STATUS.NONE, STATUS.PAID_CANCELED]);

// Routes a gated user may still reach: the pricing/conversion surface, the
// Stripe return pages, and account management (which is also where logout
// lives). Matched by pathname prefix.
const ALLOWED_PREFIXES = ['/pricing', '/subscription', '/settings'];

export default function SubscriptionGate({ children }) {
  const { status, loading } = useEntitlements();
  const location = useLocation();

  // Wait for subscription state to resolve before deciding — never flash gated
  // content or bounce a real subscriber on a slow snapshot.
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(to bottom, #FAF8F5 0%, #F5F1EB 100%)',
        }}
      >
        <div style={{ textAlign: 'center', color: '#8B7355' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              border: '4px solid #E0D5C7',
              borderTop: '4px solid #8B7355',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem',
            }}
          />
          <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>
            Loading Your Dressage Journey...
          </p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const onAllowedRoute = ALLOWED_PREFIXES.some((p) =>
    location.pathname.startsWith(p)
  );

  if (GATED_STATUSES.has(status) && !onAllowedRoute) {
    return <Navigate to="/pricing" replace />;
  }

  return children;
}
