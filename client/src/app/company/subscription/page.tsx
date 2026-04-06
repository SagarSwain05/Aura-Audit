'use client'

import { motion } from 'framer-motion'
import { CheckCircle, Zap, Crown, Building2 } from 'lucide-react'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    period: '/month',
    icon: Building2,
    color: 'border-white/10',
    features: ['3 job postings', 'Basic candidate search', 'Standard support', 'Email notifications'],
    cta: 'Current Plan',
    ctaClass: 'bg-white/5 text-aura-muted cursor-default',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹4,999',
    period: '/month',
    icon: Zap,
    color: 'border-aura-purple/40 shadow-glow-purple',
    badge: 'Most Popular',
    features: ['20 job postings', 'AI candidate matching', 'Advanced search filters', 'Priority support', 'Analytics dashboard', 'Campus drive management'],
    cta: 'Upgrade to Pro',
    ctaClass: 'bg-aura-gradient text-white hover:opacity-90',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '₹14,999',
    period: '/month',
    icon: Crown,
    color: 'border-yellow-400/30',
    features: ['Unlimited job postings', 'Dedicated account manager', 'Custom integrations', 'White-label options', 'SLA support', 'API access'],
    cta: 'Contact Sales',
    ctaClass: 'border border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10',
  },
]

export default function SubscriptionPage() {
  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Subscription Plans</h1>
        <p className="text-aura-muted text-sm mt-1">Choose the right plan for your hiring needs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`glass-card p-6 relative flex flex-col ${plan.color}`}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-aura-gradient text-white text-xs font-semibold px-3 py-1 rounded-full">
                {plan.badge}
              </div>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <plan.icon className="w-5 h-5 text-aura-muted" />
              </div>
              <div>
                <h3 className="font-bold">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black">{plan.price}</span>
                  <span className="text-xs text-aura-muted">{plan.period}</span>
                </div>
              </div>
            </div>
            <ul className="space-y-2.5 flex-1 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-aura-muted-light">{f}</span>
                </li>
              ))}
            </ul>
            <button className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${plan.ctaClass}`}>
              {plan.cta}
            </button>
          </motion.div>
        ))}
      </div>

      <div className="glass-card p-5 bg-aura-purple/5 border-aura-purple/20">
        <p className="text-sm text-aura-muted-light">
          <span className="font-semibold text-aura-purple-light">Note:</span> Payment gateway integration coming soon. Contact{' '}
          <a href="mailto:sales@aura-audit.com" className="text-aura-purple-light hover:underline">sales@aura-audit.com</a>{' '}
          to upgrade your plan.
        </p>
      </div>
    </div>
  )
}
