import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CloudDownload, Loader2, FileText, AlertCircle } from 'lucide-react';
import { toast } from "sonner";

export default function GoogleDriveImport({ onTransactionsExtracted }) {
  const [fileId, setFileId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const extractFileId = (input) => {
    // Handle full Google Drive/Docs URLs
    const patterns = [
      /\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /^([a-zA-Z0-9_-]+)$/
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) return match[1];
    }
    return input;
  };

  const handleImport = async () => {
    if (!fileId.trim()) {
      toast.error('Please enter a file ID or URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const extractedId = extractFileId(fileId.trim());
      const response = await base44.functions.invoke('importFromGoogleDrive', { fileId: extractedId });
      
      if (response.data.success && response.data.transactions?.length > 0) {
        toast.success(`Found ${response.data.transactions.length} transactions from ${response.data.fileName}`);
        onTransactionsExtracted(response.data.transactions);
      } else if (response.data.error) {
        setError(response.data.error);
        toast.error(response.data.error);
      } else {
        toast.info('No transactions found in this file');
      }
    } catch (e) {
      setError(e.message);
      toast.error('Import failed: ' + e.message);
    }

    setLoading(false);
  };

  return (
    <Card className="p-6 border-dashed border-2 border-slate-200">
      <div className="text-center mb-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
          <CloudDownload className="w-6 h-6 text-blue-500" />
        </div>
        <h3 className="font-semibold text-slate-800 mb-1">Import from Google Drive</h3>
        <p className="text-sm text-slate-500">
          Paste a Google Doc/Sheet URL or file ID
        </p>
      </div>

      <div className="space-y-3">
        <Input
          placeholder="https://docs.google.com/document/d/... or file ID"
          value={fileId}
          onChange={(e) => setFileId(e.target.value)}
          disabled={loading}
        />
        
        <Button 
          onClick={handleImport} 
          disabled={loading || !fileId.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Import Transactions
            </>
          )}
        </Button>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <p className="text-xs text-slate-400 text-center">
          Note: Only files created by Penny or selected via picker can be accessed
        </p>
      </div>
    </Card>
  );
}