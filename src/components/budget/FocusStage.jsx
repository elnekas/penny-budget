import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import moment from 'moment';
import { fmt, groupForCategory, GROUPS } from '@/components/riseup/riseupGroups';

export default function FocusStage({ focus, monthly, monthLabels, categoryAvg, onClose }) {
  if (!focus) return null;
  const cat = focus.category;
  const months = focus.months?.length ? focus.months : Object.keys(monthly).slice(-6);
  const g = GROUPS[groupForCategory(cat, false)];
  const label = (m) => monthLabels?.[m] || moment(m, 'YYYY-MM').format('MMM YYYY');

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', damping: 22 }}>
        <Card className="p-5 border-2 border-emerald-200 shadow-lg shadow-emerald-100/50 bg-white relative">
          <button onClick={onClose} className="absolute top-3 right-3 text-slate-300 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
          <p className="text-xs font-medium text-emerald-600 mb-3">✨ Penny is showing you</p>

          {focus.type === 'compare_chart' ? (
            <>
              <h3 className="font-bold text-slate-800 mb-3">{g?.emoji} {cat} — month by month</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={months.map(m => ({ name: label(m), amount: Math.round(monthly[m]?.categories?.[cat] || 0) }))}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => fmt(v)} cursor={{ fill: '#f1f5f9' }} />
                    <Bar dataKey="amount" fill="#10b981" radius={[8, 8, 8, 8]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className={`grid gap-3 ${months.length > 1 ? 'sm:grid-cols-2' : ''}`}>
              {months.slice(0, 4).map(m => {
                const amt = monthly[m]?.categories?.[cat] || 0;
                const avg = categoryAvg?.[cat] || 0;
                const diff = avg ? ((amt - avg) / avg) * 100 : 0;
                return (
                  <div key={m} className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/40 text-center">
                    <p className="text-sm text-slate-500 mb-1">{g?.emoji} {cat}</p>
                    <p className="text-xs text-slate-400 mb-2">{label(m)}</p>
                    <p className="text-4xl font-bold text-slate-800">{fmt(amt)}</p>
                    {avg > 0 && (
                      <p className={`text-xs mt-2 font-medium ${diff > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                        {diff > 0 ? '▲' : '▼'} {Math.abs(diff).toFixed(0)}% vs your 3-month average
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 flex justify-center">
            <Button variant="outline" size="sm" onClick={onClose} className="rounded-full text-xs">Back to cockpit</Button>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}