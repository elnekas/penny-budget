import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from 'lucide-react';

export default function BudgetEditModal({ currentBudget, month, accountOwner, onClose, onSave }) {
  const [amount, setAmount] = useState(currentBudget?.toString() || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const budgetValue = parseFloat(amount) || 0;
    
    // Get existing budgets for this month
    const existingBudgets = await base44.entities.Budget.filter({ 
      account_owner: accountOwner, 
      month: month 
    });
    
    if (existingBudgets.length > 0) {
      // Update existing budget (assuming one main budget)
      await base44.entities.Budget.update(existingBudgets[0].id, { monthly_limit: budgetValue });
    } else {
      // Create new budget
      await base44.entities.Budget.create({
        category: 'other',
        monthly_limit: budgetValue,
        month: month,
        account_owner: accountOwner
      });
    }
    
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Edit Monthly Budget</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Monthly Variable Budget</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter budget amount"
              className="text-lg"
            />
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}