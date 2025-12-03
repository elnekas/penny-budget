import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Sparkles, Wallet, Target, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' }
];

const steps = [
  { id: 'welcome', title: 'Welcome!' },
  { id: 'currency', title: 'Currency' },
  { id: 'income', title: 'Income' },
  { id: 'goal', title: 'Goal' },
  { id: 'complete', title: 'All Set!' }
];

export default function OnboardingFlow({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    preferred_currency: 'USD',
    monthly_income: '',
    savings_goal: ''
  });

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      ...data,
      monthly_income: data.monthly_income ? parseFloat(data.monthly_income) : null,
      savings_goal: data.savings_goal ? parseFloat(data.savings_goal) : null,
      onboarding_completed: true
    });
    setSaving(false);
    onComplete();
  };

  const selectedCurrency = currencies.find(c => c.code === data.preferred_currency);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex gap-2 mb-8 justify-center">
          {steps.map((s, idx) => (
            <div
              key={s.id}
              className={`h-1.5 w-8 rounded-full transition-all ${
                idx <= step ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-3xl shadow-xl p-8"
          >
            {/* Step 0: Welcome */}
            {step === 0 && (
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-200">
                  <span className="text-4xl">💰</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">
                  Hey {user?.full_name?.split(' ')[0] || 'there'}! 👋
                </h1>
                <p className="text-slate-500 mb-8">
                  I'm Penny, your personal budget buddy. Let's set up your account in just a minute!
                </p>
                <Button
                  onClick={handleNext}
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl"
                >
                  Let's Go
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 1: Currency */}
            {step === 1 && (
              <div>
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-6">
                  <Sparkles className="w-7 h-7 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">What's your currency?</h2>
                <p className="text-slate-500 mb-6">We'll use this to display all your amounts.</p>
                
                <Select
                  value={data.preferred_currency}
                  onValueChange={(val) => setData({ ...data, preferred_currency: val })}
                >
                  <SelectTrigger className="h-14 rounded-xl text-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(c => (
                      <SelectItem key={c.code} value={c.code} className="py-3">
                        <span className="font-medium">{c.symbol}</span> {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleNext}
                  className="w-full h-12 mt-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Income */}
            {step === 2 && (
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-6">
                  <Wallet className="w-7 h-7 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Monthly income?</h2>
                <p className="text-slate-500 mb-6">This helps me give you better insights. Optional!</p>
                
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                    {selectedCurrency?.symbol}
                  </span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={data.monthly_income}
                    onChange={(e) => setData({ ...data, monthly_income: e.target.value })}
                    className="h-14 pl-10 rounded-xl text-lg"
                  />
                </div>

                <Button
                  onClick={handleNext}
                  className="w-full h-12 mt-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl"
                >
                  {data.monthly_income ? 'Continue' : 'Skip for now'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 3: Savings Goal */}
            {step === 3 && (
              <div>
                <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mb-6">
                  <Target className="w-7 h-7 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Monthly savings goal?</h2>
                <p className="text-slate-500 mb-6">I'll help you stay on track! Also optional.</p>
                
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                    {selectedCurrency?.symbol}
                  </span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={data.savings_goal}
                    onChange={(e) => setData({ ...data, savings_goal: e.target.value })}
                    className="h-14 pl-10 rounded-xl text-lg"
                  />
                </div>

                <Button
                  onClick={handleNext}
                  className="w-full h-12 mt-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl"
                >
                  {data.savings_goal ? 'Continue' : 'Skip for now'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 4: Complete */}
            {step === 4 && (
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-200">
                  <Check className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">You're all set! 🎉</h1>
                <p className="text-slate-500 mb-8">
                  Time to start tracking your spending. Just tell me what you spent and I'll take care of the rest!
                </p>
                <Button
                  onClick={handleComplete}
                  disabled={saving}
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl"
                >
                  {saving ? 'Saving...' : 'Start Using Penny'}
                  <Sparkles className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}