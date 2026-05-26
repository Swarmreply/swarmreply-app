// ============================================
// src/pages/checkout.js
// Stripe checkout + customer creation flow
// This is where visitors become paying customers
// ============================================

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { createCustomer } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$99',
    period: '/mo',
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE,
    stripeLink: 'https://buy.stripe.com/dRm9AT3CD3e1cDgeHqbfO07',
    description: 'Perfect for single-location businesses',
    features: [
      '1 business location',
      'Google Reviews automation',
      'Up to 100 replies/month',
      'Custom tone settings',
      'Weekly email digest'
    ]
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$99',
    period: '/mo',
    priceId: process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE,
    stripeLink: 'https://buy.stripe.com/bJe9AT3CD6qd5aO7eYbfO08',
    description: 'For growing businesses & small chains',
    featured: true,
    features: [
      'Up to 5 locations',
      'Google + Yelp + TripAdvisor',
      'Unlimited replies',
      'Advanced tone profiles',
      'Priority support'
    ]
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '$249',
    period: '/mo',
    priceId: process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE,
    stripeLink: 'https://buy.stripe.com/dRm6oHehh6qd0Uy9n6bfO03',
    description: 'Manage all your clients in one place',
    features: [
      'Unlimited locations',
      'All review platforms',
      'White-label dashboard',
      'Client reporting portal',
      'Dedicated account manager'
    ]
  }
];

export default function Checkout() {
  const { login } = useAuth();
  const [step, setStep] = useState(1); // 1=select plan, 2=account details
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  const inputStyle = {
    width: '100%', padding: '14px 16px',
    border: '1.5px solid #e4e0d8', borderRadius: 12,
    fontSize: '1rem', outline: 'none',
    fontFamily: 'DM Sans, sans-serif', background: 'white',
    color: '#0d0d0d', transition: 'border-color 0.15s'
  };

  async function handleProceed() {
    if (!selectedPlan) return;
    setStep(2);
  }

  async function handleCheckout(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create customer record in our database
      const result = await createCustomer({
        name: form.name,
        email: form.email,
        phone: form.phone,
        plan: selectedPlan.id,
        status: 'trial'
      });

      // Save customer ID locally
      login(result.customer.id);

      // Redirect to Stripe checkout
      window.location.href = selectedPlan.stripeLink +
        `?prefilled_email=${encodeURIComponent(form.email)}` +
        `&client_reference_id=${result.customer.id}`;

    } catch (err) {
      setError('Something went wrong. Please try again or contact hello@swarmreply.com');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f8f7f4',
      fontFamily: 'DM Sans, sans-serif'
    }}>
      {/* Nav */}
      <nav style={{
        background: 'white', borderBottom: '1px solid #e4e0d8',
        padding: '16px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <a href="/" style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: '1.3rem', fontWeight: 900,
          color: '#0d0d0d', textDecoration: 'none'
        }}>SwarmReply</a>
        <a href="/login" style={{
          fontSize: '0.875rem', color: '#7a7670', textDecoration: 'none'
        }}>Already have an account? Log in →</a>
      </nav>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '60px 24px' }}>

        {/* Step 1 — Select plan */}
        {step === 1 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <h1 style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '2.5rem', fontWeight: 900,
                letterSpacing: '-0.02em', marginBottom: 12
              }}>Choose your plan</h1>
              <p style={{ color: '#7a7670', fontSize: '1rem' }}>
                All plans include full onboarding support. No contracts — cancel anytime.
              </p>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 20, marginBottom: 32
            }}>
              {PLANS.map(plan => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  style={{
                    background: plan.featured ? '#0d0d0d' : 'white',
                    border: `2px solid ${selectedPlan?.id === plan.id
                      ? '#f5c842'
                      : plan.featured ? '#0d0d0d' : '#e4e0d8'}`,
                    borderRadius: 20, padding: '32px 28px',
                    cursor: 'pointer', position: 'relative',
                    transition: 'all 0.15s',
                    transform: selectedPlan?.id === plan.id ? 'translateY(-4px)' : 'none',
                    boxShadow: selectedPlan?.id === plan.id
                      ? '0 12px 40px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  {plan.featured && (
                    <div style={{
                      position: 'absolute', top: -14, left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#f5c842', color: '#0d0d0d',
                      fontSize: '0.7rem', fontWeight: 800,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      padding: '5px 16px', borderRadius: 50, whiteSpace: 'nowrap'
                    }}>Most Popular</div>
                  )}

                  {selectedPlan?.id === plan.id && (
                    <div style={{
                      position: 'absolute', top: 16, right: 16,
                      width: 24, height: 24, borderRadius: '50%',
                      background: '#f5c842', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 800, color: '#0d0d0d'
                    }}>✓</div>
                  )}

                  <div style={{
                    fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: plan.featured ? 'rgba(255,255,255,0.45)' : '#7a7670',
                    marginBottom: 16
                  }}>{plan.name}</div>

                  <div style={{
                    fontFamily: 'Playfair Display, serif',
                    fontSize: '2.5rem', fontWeight: 900, lineHeight: 1,
                    color: plan.featured ? 'white' : '#0d0d0d',
                    marginBottom: 4
                  }}>
                    {plan.price}
                    <span style={{ fontSize: '1rem', fontWeight: 300, opacity: 0.6 }}>
                      {plan.period}
                    </span>
                  </div>

                  <p style={{
                    fontSize: '0.825rem',
                    color: plan.featured ? 'rgba(255,255,255,0.45)' : '#7a7670',
                    marginBottom: 24
                  }}>{plan.description}</p>

                  <ul style={{ listStyle: 'none' }}>
                    {plan.features.map((f, i) => (
                      <li key={i} style={{
                        fontSize: '0.875rem', padding: '8px 0',
                        borderBottom: `1px solid ${plan.featured ? 'rgba(255,255,255,0.1)' : '#e4e0d8'}`,
                        display: 'flex', gap: 10,
                        color: plan.featured ? 'rgba(255,255,255,0.7)' : '#7a7670'
                      }}>
                        <span style={{ color: plan.featured ? '#f5c842' : '#0d0d0d', fontWeight: 700 }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={handleProceed}
                disabled={!selectedPlan}
                style={{
                  padding: '16px 48px', borderRadius: 50,
                  background: selectedPlan ? '#0d0d0d' : '#c8c4bc',
                  color: 'white', border: 'none', fontSize: '1rem',
                  fontWeight: 600, cursor: selectedPlan ? 'pointer' : 'not-allowed',
                  fontFamily: 'DM Sans, sans-serif'
                }}
              >
                Continue with {selectedPlan ? selectedPlan.name : 'a plan'} →
              </button>
            </div>
          </>
        )}

        {/* Step 2 — Account details */}
        {step === 2 && selectedPlan && (
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <div style={{ marginBottom: 32 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  background: 'none', border: 'none',
                  color: '#7a7670', cursor: 'pointer',
                  fontSize: '0.875rem', marginBottom: 16, padding: 0,
                  fontFamily: 'DM Sans, sans-serif'
                }}
              >← Back</button>
              <h1 style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '2rem', fontWeight: 900, marginBottom: 8
              }}>Create your account</h1>
              <p style={{ color: '#7a7670' }}>
                Then you'll be taken to Stripe to complete your {selectedPlan.name} subscription.
              </p>
            </div>

            {/* Selected plan reminder */}
            <div style={{
              background: '#0d0d0d', color: 'white',
              borderRadius: 12, padding: '16px 20px',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 24
            }}>
              <div>
                <div style={{ fontWeight: 600 }}>{selectedPlan.name} Plan</div>
                <div style={{ fontSize: '0.825rem', opacity: 0.6 }}>{selectedPlan.description}</div>
              </div>
              <div style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.5rem', fontWeight: 900
              }}>{selectedPlan.price}<span style={{ fontSize: '0.875rem', opacity: 0.6 }}>/mo</span></div>
            </div>

            <form onSubmit={handleCheckout}>
              <div style={{
                background: 'white', border: '1px solid #e4e0d8',
                borderRadius: 16, padding: 28
              }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: 'block', fontSize: '0.78rem', fontWeight: 600,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: '#7a7670', marginBottom: 8
                  }}>Full Name *</label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="Jane Smith"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: 'block', fontSize: '0.78rem', fontWeight: 600,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: '#7a7670', marginBottom: 8
                  }}>Email Address *</label>
                  <input
                    style={inputStyle}
                    type="email"
                    placeholder="you@yourbusiness.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{
                    display: 'block', fontSize: '0.78rem', fontWeight: 600,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: '#7a7670', marginBottom: 8
                  }}>Phone Number</label>
                  <input
                    style={inputStyle}
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                {error && (
                  <div style={{
                    background: '#fee2e2', border: '1px solid #fca5a5',
                    borderRadius: 10, padding: '12px 16px',
                    fontSize: '0.875rem', color: '#c0392b', marginBottom: 16
                  }}>{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading || !form.name || !form.email}
                  style={{
                    width: '100%', padding: 16, borderRadius: 50,
                    background: loading || !form.name || !form.email ? '#c8c4bc' : '#f5c842',
                    color: '#0d0d0d', border: 'none', fontSize: '1rem',
                    fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif'
                  }}
                >
                  {loading ? 'Creating account...' : `Continue to Payment →`}
                </button>

                <p style={{
                  fontSize: '0.75rem', color: '#7a7670',
                  textAlign: 'center', marginTop: 12
                }}>
                  You'll be taken to Stripe's secure checkout. No payment info stored by SwarmReply.
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
