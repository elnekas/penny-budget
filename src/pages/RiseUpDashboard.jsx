import React, { useState, useEffect, useMemo } from 'react';
import moment from 'moment';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { externalMonthlyILSForMonth } from '@/components/budget/externalIncomeUtils';
import { Search, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRiseUpData } from '@/components/riseup/useRiseUpData';
import { isInternal, fmt } from '@/components/riseup/riseupGroups';
import RiseUpKpis from '@/components/riseup/RiseUpKpis';
import RiseUpMonthlyChart from '@/components/riseup/RiseUpMonthlyChart';
import GroupBreakdown from '@/components/riseup/GroupBreakdown';
import RiseUpTransactionRow from '@/components/riseup/RiseUpTransactionRow';
import RiseUpListControls from '@/components/riseup/RiseUpListControls';

const selectCls = "w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40";

export default function RiseUpDashboard() {
  const { snapshot, transactions, loading, error, saveOverride, saveRename, saveCategoryForName, saveCategoryGroup, refresh, isRefreshing } = useRiseUpData();

  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [activeGroup, setActiveGroup] = useState(null);
  const [hideInternal, setHideInternal] = useState(true);
  const [dupsOnly, setDupsOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(60);
  const [flowFilter, setFlowFilter] = useState('all');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortBy, setSortBy] = useState('amount_desc');

  const { data: externals = [] } = useQuery({
    queryKey: ['external-income'],
    queryFn: () => base44.entities.ExternalIncome.list('-created_date', 100)
  });
  const { data: potTransfers = [] } = useQuery({
    queryKey: ['deposit-transfers'],
    queryFn: () => base44.entities.DepositTransfer.list('-created_date', 500)
  });


  useEffect(() => {
    if (snapshot && !selectedMonth) {
      const months = snapshot.months || [];
      setSelectedMonth(months.length > 1 ? months[months.length - 2] : months[0]);
    }
  }, [snapshot, selectedMonth]);

  const { accounts, categories, monthTxs, listTxs, chartData, income, expense, dupCount } = useMemo(() => {
    if (!snapshot) return { accounts: [], categories: [], monthTxs: [], listTxs: [], chartData: [], income: 0, expense: 0, dupCount: 0 };

    const base = transactions.filter(t => !hideInternal || !isInternal(t.name));

    const accSet = new Set();
    const catSet = new Set();
    transactions.forEach(t => {
      if (t.srcName) accSet.add(t.srcName);
      catSet.add(t.category);
    });

    const chartBase = selectedCategories.length
      ? base.filter(t => selectedCategories.includes(t.category))
      : base;

    const cData = snapshot.months.map((m, idx) => {
      const isLatest = idx === snapshot.months.length - 1;
      let inc = 0, exp = 0;
      chartBase.forEach(t => {
        if (t.m !== m || t.ignored) return;
        if (t.inc) inc += t.amt; else exp += t.amt;
      });
      return { name: moment(m, 'YYYY-MM').format('MMM') + (isLatest ? '*' : ''), Income: Math.round(inc + (selectedCategories.length ? 0 : externalMonthlyILSForMonth(externals, m, potTransfers))), Expense: Math.round(exp) };
    });

    const mTxs = base.filter(t => {
      if (selectedMonth && selectedMonth !== 'all' && t.m !== selectedMonth) return false;
      if (selectedAccount !== 'all' && t.srcName !== selectedAccount) return false;
      if (selectedType === 'fixed' && !t.fixed) return false;
      if (selectedType === 'variable' && t.fixed) return false;
      return true;
    });

    let inc = 0, exp = 0;
    mTxs.forEach(t => {
      if (t.ignored) return;
      if (t.inc) inc += t.amt; else exp += t.amt;
    });

    const dups = mTxs.filter(t => t.possibleDuplicate && !t.ignored).length;

    const sorters = {
      amount_desc: (a, b) => b.amt - a.amt,
      amount_asc: (a, b) => a.amt - b.amt,
      date_desc: (a, b) => new Date(b.td) - new Date(a.td),
      date_asc: (a, b) => new Date(a.td) - new Date(b.td),
      name_asc: (a, b) => (a.name || '').localeCompare(b.name || '')
    };

    const lTxs = mTxs.filter(t => {
      if (activeGroup && t.group !== activeGroup) return false;
      if (dupsOnly && !t.possibleDuplicate) return false;
      if (flowFilter === 'expense' && t.inc) return false;
      if (flowFilter === 'income' && !t.inc) return false;
      if (selectedCategories.length && !selectedCategories.includes(t.category)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(t.name || '').toLowerCase().includes(q) && !(t.category || '').toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort(sorters[sortBy] || sorters.amount_desc);

    return {
      accounts: Array.from(accSet).sort(),
      categories: Array.from(catSet).sort(),
      monthTxs: mTxs,
      listTxs: lTxs,
      chartData: cData,
      income: inc,
      expense: exp,
      dupCount: dups
    };
  }, [snapshot, transactions, selectedMonth, selectedAccount, selectedType, activeGroup, hideInternal, dupsOnly, search, flowFilter, selectedCategories, sortBy, externals, potTransfers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-32 p-4">
        <Card className="p-6 max-w-md w-full text-center border-0 shadow-sm">
          <p className="text-rose-600 font-semibold mb-1">Couldn't load RiseUp data</p>
          <p className="text-sm text-slate-500">{error.message}</p>
        </Card>
      </div>
    );
  }

  const listTotal = listTxs.filter(t => !t.ignored).reduce((s, t) => s + t.amt, 0);

  const overseas = (!selectedMonth || selectedMonth === 'all')
    ? (snapshot.months || []).reduce((s, m) => s + externalMonthlyILSForMonth(externals, m, potTransfers), 0)
    : externalMonthlyILSForMonth(externals, selectedMonth, potTransfers);

  return (
    <main className="max-w-5xl mx-auto p-4 space-y-5 pb-28">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          Live from RiseUp · updated {moment(snapshot.generated_at).format('D MMM, HH:mm')} · {transactions.length.toLocaleString()} transactions
        </span>
        <button
          onClick={() => refresh()}
          disabled={isRefreshing}
          title="Refresh data"
          className="text-slate-400 hover:text-emerald-600 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <select value={selectedMonth || 'all'} onChange={e => setSelectedMonth(e.target.value)} className={selectCls}>
            <option value="all">All Months</option>
            {snapshot.months.map(m => <option key={m} value={m}>{snapshot.month_labels?.[m] || m}</option>)}
          </select>
          <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} className={selectCls}>
            <option value="all">All Accounts</option>
            {accounts.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className={selectCls}>
            <option value="all">Fixed + Variable</option>
            <option value="fixed">Fixed / Recurring</option>
            <option value="variable">Variable / One-off</option>
          </select>
          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={hideInternal}
              onChange={e => setHideInternal(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            Hide card settlements & transfers
          </label>
        </div>

        {/* KPIs */}
        <RiseUpKpis income={income} expense={expense} overseas={overseas} />

        {/* Duplicates alert */}
        {dupCount > 0 && (
          <button
            onClick={() => setDupsOnly(!dupsOnly)}
            className={`w-full flex items-center gap-2 p-3 rounded-xl border text-sm transition-colors ${
              dupsOnly ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">
              {dupCount} possible duplicate charge{dupCount > 1 ? 's' : ''} detected — tap to {dupsOnly ? 'show all' : 'review'}, use the 👁 icon to exclude one copy from totals
            </span>
          </button>
        )}

        <div className="grid md:grid-cols-2 gap-5">
          {/* Monthly chart */}
          <Card className="p-4 border-0 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-3 text-sm">Monthly Income vs Expense</h3>
            <RiseUpMonthlyChart data={chartData} />
          </Card>

          {/* Group breakdown */}
          <Card className="p-4 border-0 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-3 text-sm">
              Where the money goes
              {activeGroup && <span className="text-xs font-normal text-emerald-600 ml-2">(filtering list — tap again to clear)</span>}
            </h3>
            <GroupBreakdown
              transactions={monthTxs}
              activeGroup={activeGroup}
              onSelectGroup={setActiveGroup}
              categories={categories}
              onCategoryChange={(tx, cat) => saveCategoryForName.mutate({ name: tx.name, category: cat })}
              onRenameCategory={(oldName, newName) => saveRename.mutate({ oldName, newName })}
              onGroupChange={(category, group) => saveCategoryGroup.mutate({ category, group })}
            />
          </Card>
        </div>

        {/* Transaction list */}
        <Card className="p-4 border-0 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
            <h3 className="font-semibold text-slate-800 text-sm flex-1">
              Transactions
              <span className="text-xs font-normal text-slate-400 ml-2">
                {listTxs.length.toLocaleString()} shown · total {fmt(listTotal)}
              </span>
            </h3>
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search merchant or category..."
                value={search}
                onChange={e => { setSearch(e.target.value); setVisibleCount(60); }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
          </div>

          <div className="mb-4">
            <RiseUpListControls
              flow={flowFilter}
              onFlowChange={v => { setFlowFilter(v); setVisibleCount(60); }}
              selectedCategories={selectedCategories}
              onSelectedCategoriesChange={v => { setSelectedCategories(v); setVisibleCount(60); }}
              categories={categories}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </div>

          <div className="space-y-2">
            {listTxs.slice(0, visibleCount).map(t => (
              <RiseUpTransactionRow
                key={t.id}
                t={t}
                categories={categories}
                onCategoryChange={(tx, cat) => saveCategoryForName.mutate({ name: tx.name, category: cat })}
                onToggleIgnore={(tx) => saveOverride.mutate({ txId: tx.id, changes: { ignored: !tx.ignored } })}
                onFilterSimilar={(tx) => {
                  setSearch(tx.name || '');
                  setSelectedMonth('all');
                  setActiveGroup(null);
                  setSelectedCategories([]);
                  setFlowFilter('all');
                  setDupsOnly(false);
                  setVisibleCount(60);
                  setSortBy('date_desc');
                }}
              />
            ))}
          </div>

          {listTxs.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">No transactions match your filters</p>
          )}

          {visibleCount < listTxs.length && (
            <div className="pt-4 flex justify-center">
              <Button variant="outline" onClick={() => setVisibleCount(v => v + 60)} className="rounded-full px-8">
                Show more ({listTxs.length - visibleCount} left)
              </Button>
            </div>
          )}
        </Card>
    </main>
  );
}