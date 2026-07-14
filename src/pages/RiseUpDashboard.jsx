import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, Search, Filter } from 'lucide-react';
import moment from 'moment';

const DATA_URL = "https://media.base44.com/files/public/69b7ce97ba10383cab6b7215/5e2b6fe26_finance_snapshot.json";

const INTERNAL_STRINGS = [
  'לאומי מאסטרקרד', 'כרטיסי אשראי', 'כרטיס דביט', 'מקס איט פינן', 'מקס איט',
  'העברה לח.נוסף', 'העברה מהחשבון', 'העברת משכור', 'המרת קן', 'המרה'
];

export default function RiseUpDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [viewMode, setViewMode] = useState('expense'); // 'income', 'expense', 'both'
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all'); // 'all', 'fixed', 'variable'
  const [hideInternal, setHideInternal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [visibleCount, setVisibleCount] = useState(60);

  useEffect(() => {
    fetch(DATA_URL)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch data');
        return res.json();
      })
      .then(json => {
        setData(json);
        if (json.months && json.months.length > 0) {
          const defaultMonth = json.months.length > 1 ? json.months[json.months.length - 2] : json.months[0];
          setSelectedMonth(defaultMonth);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const formatCurrency = (amt) => {
    return '₪' + Math.round(amt).toLocaleString();
  };

  const { accounts, categories, filteredTransactions, kpi, chartData } = useMemo(() => {
    if (!data) return { accounts: [], categories: [], filteredTransactions: [], kpi: { inc: 0, exp: 0, net: 0 }, chartData: [] };

    // Unique accounts & categories
    const accSet = new Set();
    const catSet = new Set();
    data.transactions.forEach(t => {
      if (t.srcName) accSet.add(t.srcName);
      if (t.catName) catSet.add(t.catName);
    });

    // Chart Data
    const cData = data.months.map((m, idx) => {
      const isLatest = idx === data.months.length - 1;
      const label = moment(m, 'YYYY-MM').format('MMMM') + (isLatest ? '*' : '');
      const s = data.summary.byMonth[m] || { income: 0, expense: 0 };
      return {
        month: m,
        name: label,
        Income: s.income,
        Expense: s.expense
      };
    });

    // Filtering
    let txs = data.transactions.filter(t => {
      if (viewMode === 'income' && !t.inc) return false;
      if (viewMode === 'expense' && t.inc) return false;
      if (selectedMonth !== 'all' && t.m !== selectedMonth) return false;
      if (selectedAccount !== 'all' && t.srcName !== selectedAccount) return false;
      if (selectedCategory !== 'all' && t.catName !== selectedCategory) return false;
      if (selectedType === 'fixed' && !t.fixed) return false;
      if (selectedType === 'variable' && t.fixed) return false;
      
      if (hideInternal && t.name) {
        if (INTERNAL_STRINGS.some(s => t.name.includes(s))) return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const nMatch = t.name && t.name.toLowerCase().includes(q);
        const cMatch = t.catName && t.catName.toLowerCase().includes(q);
        if (!nMatch && !cMatch) return false;
      }

      return true;
    });

    // Sorting by amount desc
    txs.sort((a, b) => b.amt - a.amt);

    // KPI calculation based on filtered
    let inc = 0;
    let exp = 0;
    txs.forEach(t => {
      if (t.inc) inc += t.amt;
      else exp += t.amt;
    });

    return {
      accounts: Array.from(accSet).sort(),
      categories: Array.from(catSet).sort(),
      filteredTransactions: txs,
      kpi: { inc, exp, net: inc - exp },
      chartData: cData
    };
  }, [data, viewMode, selectedMonth, selectedAccount, selectedCategory, selectedType, hideInternal, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eef1f4] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#eef1f4] flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <div className="text-red-500 font-bold mb-2">Error Loading Data</div>
          <p className="text-slate-600">{error}</p>
        </Card>
      </div>
    );
  }

  const generatedDate = moment(data.generated_at).format('MMM D, YYYY HH:mm');

  return (
    <div className="min-h-screen bg-[#eef1f4] pb-24 text-slate-800 font-sans">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* Header */}
        <div className="text-center md:text-left space-y-1">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#f39423] via-[#8e44ad] to-[#16a89a]">
            Elnecave Finance
          </h1>
          <p className="text-sm text-slate-500">
            Live from RiseUp · updated {generatedDate} · {data.transactions.length.toLocaleString()} transactions
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 bg-white border-0 shadow-sm rounded-2xl flex flex-col justify-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Income</span>
            <span className="text-xl md:text-2xl font-bold text-[#16a89a]">{formatCurrency(kpi.inc)}</span>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm rounded-2xl flex flex-col justify-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expense</span>
            <span className="text-xl md:text-2xl font-bold text-[#c0398f]">{formatCurrency(kpi.exp)}</span>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm rounded-2xl flex flex-col justify-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net</span>
            <span className={`text-xl md:text-2xl font-bold ${kpi.net >= 0 ? 'text-[#16a89a]' : 'text-[#c0398f]'}`}>
              {kpi.net >= 0 ? '+' : ''}{formatCurrency(kpi.net)}
            </span>
          </Card>
        </div>

        {/* Chart */}
        <Card className="p-4 bg-white border-0 shadow-sm rounded-2xl">
          <h2 className="text-lg font-semibold mb-4 text-slate-700">Monthly Income vs Expense</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => '₪' + val} />
                <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val) => formatCurrency(val)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Income" fill="#16a89a" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Expense" fill="#c0398f" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* View Toggle */}
        <div className="flex justify-center">
          <div className="inline-flex bg-slate-200/60 p-1 rounded-full">
            {['income', 'both', 'expense'].map(mode => (
              <button
                key={mode}
                onClick={() => { setViewMode(mode); setVisibleCount(60); }}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                  viewMode === mode 
                  ? 'bg-gradient-to-r from-[#16a89a] to-[#2e9bd6] text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4 bg-white border-0 shadow-sm rounded-2xl space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setVisibleCount(60); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16a89a]/50"
            >
              <option value="all">All Months</option>
              {data.months.map(m => (
                <option key={m} value={m}>{data.month_labels[m] || m}</option>
              ))}
            </select>

            <select
              value={selectedAccount}
              onChange={(e) => { setSelectedAccount(e.target.value); setVisibleCount(60); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16a89a]/50"
            >
              <option value="all">All Accounts</option>
              {accounts.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setVisibleCount(60); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16a89a]/50"
            >
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value); setVisibleCount(60); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16a89a]/50"
            >
              <option value="all">All Types</option>
              <option value="fixed">Fixed / Recurring</option>
              <option value="variable">Variable / One-off</option>
            </select>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between pt-2 border-t border-slate-100">
            <label className="flex items-center space-x-2 text-sm text-slate-600 cursor-pointer group">
              <input
                type="checkbox"
                checked={hideInternal}
                onChange={(e) => { setHideInternal(e.target.checked); setVisibleCount(60); }}
                className="rounded border-slate-300 text-[#16a89a] focus:ring-[#16a89a] w-4 h-4"
              />
              <span>Hide credit-card settlements & internal transfers</span>
            </label>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search description or category..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(60); }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16a89a]/50"
              />
            </div>
          </div>
        </Card>

        {/* Transaction List */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-slate-500 px-1">
            {filteredTransactions.length.toLocaleString()} transactions · total ₪{filteredTransactions.reduce((acc, t) => acc + t.amt, 0).toLocaleString()}
          </div>
          
          {filteredTransactions.slice(0, visibleCount).map((t, i) => (
            <Card key={i} className="overflow-hidden bg-white border-0 shadow-sm rounded-2xl flex">
              <div className={`w-1.5 shrink-0 ${t.inc ? 'bg-[#16a89a]' : 'bg-[#f39423]'}`} />
              <div className="p-4 flex-1 flex flex-col md:flex-row justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-base" dir="auto">{t.name}</div>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {t.srcName && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                        {t.srcName}
                      </span>
                    )}
                    {t.catName && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700">
                        {t.catName}
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${t.fixed ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {t.fixed ? 'Fixed' : 'Variable'}
                    </span>
                    {t.bd && t.bd !== t.td && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700">
                        Bill: {moment(t.bd).format('MMM D')}
                      </span>
                    )}
                    {t.inst && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                        Inst {t.inst.n}/{t.inst.tot}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center shrink-0">
                  <div className={`font-bold text-lg whitespace-nowrap ${t.inc ? 'text-[#16a89a]' : 'text-[#c0398f]'}`}>
                    {t.inc ? '+' : '−'}{formatCurrency(t.amt)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {moment(t.td).format('MMM D, YYYY')}
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {filteredTransactions.length === 0 && (
            <div className="py-12 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200">
              No transactions found matching your filters.
            </div>
          )}

          {visibleCount < filteredTransactions.length && (
            <div className="pt-4 flex justify-center">
              <Button 
                variant="outline" 
                onClick={() => setVisibleCount(v => v + 60)}
                className="rounded-full bg-white border-slate-200 hover:bg-slate-50 text-slate-600 px-8 shadow-sm"
              >
                Show more
              </Button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}