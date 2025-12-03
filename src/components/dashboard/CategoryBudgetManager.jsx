import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Trash2 } from 'lucide-react';
import moment from 'moment';
import { cn } from "@/lib/utils";

const categories = [
  { value: 'food', label: '🍔 Food' },
  { value: 'transport', label: '🚗 Transport' },
  { value: 'shopping', label: '🛍️ Shopping' },
  { value: 'entertainment', label: '🎬 Entertainment' },
  { value: 'bills', label: '📄 Bills' },
  { value: 'health', label: '💊 Health' },
  { value: 'education', label: '📚 Education' },
  { value: 'travel', label: '✈️ Travel' },
  { value: 'groceries', label: '🛒 Groceries' },
  { value: 'subscriptions', label: '📱 Subscriptions' },
  { value: 'other', label: '📦 Other' }
];

export default function CategoryBudgetManager({ budgets, accountOwner, onClose, onSave }) {
  const currentMonth = moment().format('YYYY-MM');
  const currentBudgets = budgets.filter(b => b.month === currentMonth);
  
  const [editedBudgets, setEditedBudgets] = useState(
    currentBudgets.map(b => ({
      id: b.id,
      category: b.category,
      monthly_limit: b.monthly_limit,
      alert_threshold: b.alert_threshold || 80
    }))
  );
  const [newCategory, setNewCategory] = useState('');
  const [saving, setSaving] = useState(false);

  const usedCategories = editedBudgets.map(b => b.category);
  const availableCategories = categories.filter(c => !usedCategories.includes(c.value));

  const addBudget = () => {
    if (!newCategory) return;
    setEditedBudgets([...editedBudgets, {
      category: newCategory,
      monthly_limit: 100,
      alert_threshold: 80
    }]);
    setNewCategory('');
  };

  const updateBudget = (index, field, value) => {
    const updated = [...editedBudgets];
    updated[index][field] = value;
    setEditedBudgets(updated);
  };

  const removeBudget = (index) => {
    setEditedBudgets(editedBudgets.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    
    // Delete removed budgets
    for (const existing of currentBudgets) {
      if (!editedBudgets.find(b => b.id === existing.id)) {
        await base44.entities.Budget.delete(existing.id);
      }
    }
    
    // Update or create budgets
    for (const budget of editedBudgets) {
      if (budget.id) {
        await base44.entities.Budget.update(budget.id, {
          monthly_limit: Number(budget.monthly_limit),
          alert_threshold: Number(budget.alert_threshold)
        });
      } else {
        await base44.entities.Budget.create({
          category: budget.category,
          monthly_limit: Number(budget.monthly_limit),
          alert_threshold: Number(budget.alert_threshold),
          month: currentMonth,
          account_owner: accountOwner
        });
      }
    }
    
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Category Budgets</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {editedBudgets.map((budget, idx) => (
            <div key={idx} className="bg-slate-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800 capitalize">
                  {categories.find(c => c.value === budget.category)?.label || budget.category}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-red-500 hover:bg-red-50"
                  onClick={() => removeBudget(idx)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500">Monthly Limit</label>
                  <Input
                    type="number"
                    value={budget.monthly_limit}
                    onChange={(e) => updateBudget(idx, 'monthly_limit', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Alert at %</label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={budget.alert_threshold}
                    onChange={(e) => updateBudget(idx, 'alert_threshold', e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          ))}
          
          {availableCategories.length > 0 && (
            <div className="flex gap-2">
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add category budget..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addBudget} disabled={!newCategory} className="bg-emerald-500 hover:bg-emerald-600">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-100 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button 
            className="flex-1 bg-emerald-500 hover:bg-emerald-600" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Budgets'}
          </Button>
        </div>
      </div>
    </div>
  );
}