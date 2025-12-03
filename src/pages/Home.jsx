import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, BarChart3, Upload, Sparkles, ChevronRight, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChatInterface from '@/components/chat/ChatInterface';
import SpendingChart from '@/components/dashboard/SpendingChart';
import SpendingTrend from '@/components/dashboard/SpendingTrend';
import QuickStats from '@/components/dashboard/QuickStats';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import FileUploader from '@/components/upload/FileUploader';
import TransactionReview from '@/components/upload/TransactionReview';
import CurrencySelector from '@/components/CurrencySelector';

const currencies = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'JPY', symbol: '¥' },
  { code: 'CAD', symbol: 'C$' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'INR', symbol: '₹' },
  { code: 'ILS', symbol: '₪' }
];
import WhatsAppButton from '@/components/WhatsAppButton';
import { cn } from "@/lib/utils";

export default function Home() {
  const [activeTab, setActiveTab] = useState('chat');
  const [conversationId, setConversationId] = useState(null);
  const [extractedTransactions, setExtractedTransactions] = useState(null);
  const [currency, setCurrency] = useState('USD');
  const queryClient = useQueryClient();
  
  const currencySymbol = currencies.find(c => c.code === currency)?.symbol || '$';

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 100)
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => base44.entities.Budget.list()
  });

  const handleTransactionsExtracted = (transactions) => {
    setExtractedTransactions(transactions);
  };

  const handleImportComplete = () => {
    setExtractedTransactions(null);
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                <span className="text-xl">💰</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Penny</h1>
                <p className="text-xs text-slate-400">Your Budget Buddy</p>
              </div>
            </div>
            
            {/* Desktop Tabs */}
            <div className="hidden md:flex items-center gap-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-slate-100/80">
                  <TabsTrigger value="chat" className="gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="dashboard" className="gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="import" className="gap-2">
                    <Upload className="w-4 h-4" />
                    Import
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <CurrencySelector value={currency} onChange={setCurrency} compact />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-50 px-4 py-2 safe-area-inset-bottom">
        <div className="flex justify-around">
          {[
            { id: 'chat', icon: MessageCircle, label: 'Chat' },
            { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
            { id: 'import', icon: Upload, label: 'Import' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all",
                activeTab === tab.id 
                  ? "text-emerald-600 bg-emerald-50" 
                  : "text-slate-400"
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* WhatsApp FAB */}
      <WhatsAppButton variant="fab" />

      {/* Content */}
      <main className="max-w-7xl mx-auto pb-24 md:pb-8">
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)]">
            <ChatInterface 
              conversationId={conversationId}
              onConversationCreated={setConversationId}
            />
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="p-4 space-y-6">
            <QuickStats transactions={transactions} budgets={budgets} currencySymbol={currencySymbol} />
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 border-0 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800">Spending by Category</h3>
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                </div>
                <SpendingChart transactions={transactions} currencySymbol={currencySymbol} />
              </Card>
              
              <Card className="p-6 border-0 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800">30-Day Trend</h3>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
                <SpendingTrend transactions={transactions} />
              </Card>
            </div>

            <Card className="p-6 border-0 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Recent Transactions</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-emerald-600"
                  onClick={() => setActiveTab('chat')}
                >
                  Add new
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <RecentTransactions transactions={transactions} currencySymbol={currencySymbol} />
            </Card>
          </div>
        )}

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div className="p-4 max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Import Transactions</h2>
              <p className="text-slate-500">
                Upload a bank statement, spreadsheet, or receipt image
              </p>
            </div>

            {extractedTransactions ? (
              <Card className="p-6 border-0 shadow-sm">
                <TransactionReview 
                  transactions={extractedTransactions}
                  onComplete={handleImportComplete}
                  onCancel={() => setExtractedTransactions(null)}
                />
              </Card>
            ) : (
              <FileUploader onTransactionsExtracted={handleTransactionsExtracted} />
            )}

            <div className="mt-8 text-center">
              <p className="text-sm text-slate-400 mb-4">Or tell Penny directly</p>
              <Button 
                variant="outline"
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => setActiveTab('chat')}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                "I spent $45 on groceries today"
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}