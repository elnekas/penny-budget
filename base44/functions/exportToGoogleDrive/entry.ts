import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the account owner (for shared accounts)
    const accountOwner = user.shared_with_account || user.email;

    // Fetch all transactions and budgets
    const [transactions, budgets] = await Promise.all([
      base44.entities.Transaction.filter({ account_owner: accountOwner }),
      base44.entities.Budget.filter({ account_owner: accountOwner })
    ]);

    // Create CSV content for transactions
    const transactionHeaders = ['Date', 'Description', 'Category', 'Amount', 'Merchant', 'Added By', 'Source'];
    const transactionRows = transactions.map(t => [
      t.date,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.category,
      t.amount,
      `"${(t.merchant || '').replace(/"/g, '""')}"`,
      t.added_by_name || '',
      t.source || 'manual'
    ]);
    
    const transactionsCsv = [
      transactionHeaders.join(','),
      ...transactionRows.map(row => row.join(','))
    ].join('\n');

    // Create CSV content for budgets
    const budgetHeaders = ['Month', 'Category', 'Monthly Limit'];
    const budgetRows = budgets.map(b => [
      b.month,
      b.category,
      b.monthly_limit
    ]);
    
    const budgetsCsv = [
      budgetHeaders.join(','),
      ...budgetRows.map(row => row.join(','))
    ].join('\n');

    // Get Google Drive access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    const timestamp = new Date().toISOString().split('T')[0];

    // Upload transactions CSV to Google Drive
    const transactionsBlob = new Blob([transactionsCsv], { type: 'text/csv' });
    const transactionsMetadata = {
      name: `Penny_Transactions_${timestamp}.csv`,
      mimeType: 'text/csv'
    };

    const transactionsFormData = new FormData();
    transactionsFormData.append('metadata', new Blob([JSON.stringify(transactionsMetadata)], { type: 'application/json' }));
    transactionsFormData.append('file', transactionsBlob);

    const transactionsUpload = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: transactionsFormData
    });

    if (!transactionsUpload.ok) {
      const error = await transactionsUpload.text();
      throw new Error(`Failed to upload transactions: ${error}`);
    }

    const transactionsFile = await transactionsUpload.json();

    // Upload budgets CSV to Google Drive
    const budgetsBlob = new Blob([budgetsCsv], { type: 'text/csv' });
    const budgetsMetadata = {
      name: `Penny_Budgets_${timestamp}.csv`,
      mimeType: 'text/csv'
    };

    const budgetsFormData = new FormData();
    budgetsFormData.append('metadata', new Blob([JSON.stringify(budgetsMetadata)], { type: 'application/json' }));
    budgetsFormData.append('file', budgetsBlob);

    const budgetsUpload = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: budgetsFormData
    });

    if (!budgetsUpload.ok) {
      const error = await budgetsUpload.text();
      throw new Error(`Failed to upload budgets: ${error}`);
    }

    const budgetsFile = await budgetsUpload.json();

    return Response.json({
      success: true,
      files: [
        { name: transactionsFile.name, id: transactionsFile.id },
        { name: budgetsFile.name, id: budgetsFile.id }
      ],
      transactionCount: transactions.length,
      budgetCount: budgets.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});