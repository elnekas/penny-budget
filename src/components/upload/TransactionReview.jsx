import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, X, Loader2, ChevronDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const categories = [
  "food", "transport", "shopping", "entertainment", "bills", 
  "health", "education", "travel", "groceries", "subscriptions", 
  "income", "savings", "other"
];

export default function TransactionReview({ transactions, onComplete, onCancel }) {
  const [items, setItems] = useState(transactions.map(t => ({ ...t, selected: true })));
  const [saving, setSaving] = useState(false);

  const toggleItem = (idx) => {
    setItems(items.map((item, i) => 
      i === idx ? { ...item, selected: !item.selected } : item
    ));
  };

  const updateItem = (idx, field, value) => {
    setItems(items.map((item, i) => 
      i === idx ? { ...item, [field]: value } : item
    ));
  };

  const handleSave = async () => {
    const selectedItems = items.filter(i => i.selected);
    if (selectedItems.length === 0) {
      toast.error('No transactions selected');
      return;
    }

    setSaving(true);
    try {
      const toSave = selectedItems.map(t => ({
        amount: parseFloat(t.amount),
        category: t.category,
        description: t.description,
        date: t.date,
        merchant: t.merchant,
        source: 'import'
      }));

      await base44.entities.Transaction.bulkCreate(toSave);
      toast.success(`Imported ${toSave.length} transactions!`);
      onComplete();
    } catch (error) {
      console.error(error);
      toast.error('Error saving transactions');
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = items.filter(i => i.selected).length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-800">
          Review Transactions ({selectedCount} selected)
        </h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-2">
        {items.map((item, idx) => (
          <div 
            key={idx}
            className={cn(
              "p-3 rounded-xl border transition-all",
              item.selected 
                ? "border-emerald-200 bg-emerald-50/50" 
                : "border-slate-100 bg-slate-50 opacity-50"
            )}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => toggleItem(idx)}
                className={cn(
                  "w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 transition-colors",
                  item.selected 
                    ? "bg-emerald-500 border-emerald-500" 
                    : "border-slate-300"
                )}
              >
                {item.selected && <Check className="w-3 h-3 text-white" />}
              </button>
              
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                <Input
                  value={item.description}
                  onChange={(e) => updateItem(idx, 'description', e.target.value)}
                  placeholder="Description"
                  className="text-sm"
                />
                <Input
                  type="number"
                  value={item.amount}
                  onChange={(e) => updateItem(idx, 'amount', e.target.value)}
                  placeholder="Amount"
                  className="text-sm"
                />
                <Select
                  value={item.category}
                  onValueChange={(v) => updateItem(idx, 'category', v)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat} className="capitalize">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={item.date}
                  onChange={(e) => updateItem(idx, 'date', e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button 
          className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500"
          onClick={handleSave}
          disabled={saving || selectedCount === 0}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Check className="w-4 h-4 mr-2" />
          )}
          Import {selectedCount} Transactions
        </Button>
      </div>
    </div>
  );
}