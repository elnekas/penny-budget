import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Trash2 } from 'lucide-react';

const categories = [
  'food', 'transport', 'shopping', 'entertainment', 'bills', 
  'health', 'education', 'travel', 'groceries', 'subscriptions', 
  'income', 'savings', 'other'
];

export default function TransactionEditModal({ transaction, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    description: transaction.description || '',
    amount: Math.abs(transaction.amount),
    isExpense: transaction.amount < 0,
    category: transaction.category || 'other',
    merchant: transaction.merchant || '',
    date: transaction.date?.split('T')[0] || new Date().toISOString().split('T')[0]
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const amount = form.isExpense ? -Math.abs(form.amount) : Math.abs(form.amount);
      await base44.entities.Transaction.update(transaction.id, {
        description: form.description,
        amount,
        category: form.category,
        merchant: form.merchant,
        date: form.date
      });
      onSave();
    } catch (e) {
      console.error('Failed to save:', e);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this transaction?')) return;
    setDeleting(true);
    try {
      await base44.entities.Transaction.delete(transaction.id);
      onDelete();
    } catch (e) {
      console.error('Failed to delete:', e);
    }
    setDeleting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Edit Transaction</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm text-slate-500 mb-1 block">Description</label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What was this for?"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm text-slate-500 mb-1 block">Amount</label>
              <Input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-sm text-slate-500 mb-1 block">Type</label>
              <Select value={form.isExpense ? 'expense' : 'income'} onValueChange={(v) => setForm({ ...form, isExpense: v === 'expense' })}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-500 mb-1 block">Category</label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-slate-500 mb-1 block">Merchant (optional)</label>
            <Input
              value={form.merchant}
              onChange={(e) => setForm({ ...form, merchant: e.target.value })}
              placeholder="Store or vendor"
            />
          </div>

          <div>
            <label className="text-sm text-slate-500 mb-1 block">Date</label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t">
          <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="w-4 h-4 mr-2" />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}