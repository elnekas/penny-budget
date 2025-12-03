import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from 'lucide-react';

const categories = [
  { value: 'all', label: 'All Categories' },
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
  { value: 'income', label: '💵 Income' },
  { value: 'savings', label: '🏦 Savings' },
  { value: 'other', label: '📦 Other' }
];

const expenseTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'fixed', label: '🔄 Fixed (Recurring)' },
  { value: 'variable', label: '📊 Variable' }
];

export default function TransactionFilters({ category, expenseType, onCategoryChange, onExpenseTypeChange }) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Filter className="w-4 h-4 text-slate-400" />
      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {categories.map(cat => (
            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={expenseType} onValueChange={onExpenseTypeChange}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Expense Type" />
        </SelectTrigger>
        <SelectContent>
          {expenseTypes.map(type => (
            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}