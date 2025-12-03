import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign } from 'lucide-react';

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' }
];

export default function CurrencySelector({ value, onChange, compact = false }) {
  const [currency, setCurrency] = useState(value || 'USD');

  useEffect(() => {
    // Load saved currency from user preferences
    const loadCurrency = async () => {
      try {
        const user = await base44.auth.me();
        if (user?.preferred_currency) {
          setCurrency(user.preferred_currency);
          onChange?.(user.preferred_currency);
        }
      } catch (e) {
        // User not logged in or no preference set
      }
    };
    loadCurrency();
  }, []);

  const handleChange = async (newCurrency) => {
    setCurrency(newCurrency);
    onChange?.(newCurrency);
    
    try {
      await base44.auth.updateMe({ preferred_currency: newCurrency });
    } catch (e) {
      // Silently fail if can't save
    }
  };

  const selectedCurrency = currencies.find(c => c.code === currency);

  if (compact) {
    return (
      <Select value={currency} onValueChange={handleChange}>
        <SelectTrigger className="w-20 h-8 text-xs border-slate-200">
          <SelectValue>
            {selectedCurrency?.symbol} {selectedCurrency?.code}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {currencies.map(c => (
            <SelectItem key={c.code} value={c.code} className="text-sm">
              <span className="font-medium">{c.symbol}</span> {c.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select value={currency} onValueChange={handleChange}>
      <SelectTrigger className="w-48 border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-sm">{selectedCurrency?.symbol}</span>
          </div>
          <SelectValue>
            {selectedCurrency?.code} - {selectedCurrency?.name}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {currencies.map(c => (
          <SelectItem key={c.code} value={c.code}>
            <div className="flex items-center gap-2">
              <span className="w-6 text-center font-medium">{c.symbol}</span>
              <span>{c.code}</span>
              <span className="text-slate-400">- {c.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { currencies };