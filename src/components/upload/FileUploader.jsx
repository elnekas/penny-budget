import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function FileUploader({ onTransactionsExtracted }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const processFile = async (file) => {
    setFile(file);
    setIsProcessing(true);

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract transaction data
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            transactions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  amount: { type: "number", description: "Transaction amount (negative for expenses)" },
                  category: { 
                    type: "string", 
                    enum: ["food", "transport", "shopping", "entertainment", "bills", "health", "education", "travel", "groceries", "subscriptions", "income", "savings", "other"]
                  },
                  description: { type: "string" },
                  date: { type: "string", description: "Date in YYYY-MM-DD format" },
                  merchant: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.status === 'success' && result.output?.transactions) {
        onTransactionsExtracted(result.output.transactions);
        toast.success(`Found ${result.output.transactions.length} transactions!`);
      } else {
        toast.error('Could not extract transactions from this file');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error processing file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  }, []);

  const handleFileInput = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={cn(
        "relative border-2 border-dashed rounded-2xl p-8 transition-all text-center",
        isDragging 
          ? "border-emerald-400 bg-emerald-50" 
          : "border-slate-200 hover:border-slate-300 bg-white",
        isProcessing && "pointer-events-none opacity-75"
      )}
    >
      <input
        type="file"
        accept=".csv,.pdf,.png,.jpg,.jpeg"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isProcessing}
      />

      {isProcessing ? (
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
          <p className="text-slate-600 font-medium">Analyzing your file...</p>
          <p className="text-sm text-slate-400">This may take a moment</p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="text-slate-700 font-medium mb-1">
            Drop your bank statement or spreadsheet
          </p>
          <p className="text-sm text-slate-400">
            Supports CSV, PDF, and images
          </p>
        </div>
      )}
    </div>
  );
}