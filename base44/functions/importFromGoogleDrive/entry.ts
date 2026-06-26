import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId } = await req.json();
    
    if (!fileId) {
      return Response.json({ error: 'File ID is required' }, { status: 400 });
    }

    const accountOwner = user.shared_with_account || user.email;
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // Get file metadata to determine type
    const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!metaRes.ok) {
      throw new Error('Failed to get file metadata. Make sure the file was created by this app or selected via picker.');
    }

    const fileMeta = await metaRes.json();
    let content = '';

    // Export Google Docs/Sheets as plain text or CSV
    if (fileMeta.mimeType === 'application/vnd.google-apps.document') {
      const exportRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      content = await exportRes.text();
    } else if (fileMeta.mimeType === 'application/vnd.google-apps.spreadsheet') {
      const exportRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      content = await exportRes.text();
    } else {
      // Regular file - download directly
      const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      content = await downloadRes.text();
    }

    // Use LLM to extract transactions from the content
    const extractionResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Extract financial transactions from this document content. Parse dates, amounts, descriptions, and categorize each transaction.
      
Categories available: food, transport, shopping, entertainment, bills, health, education, travel, groceries, subscriptions, income, savings, other

For amounts: use negative numbers for expenses, positive for income.

Document content:
${content.substring(0, 10000)}`,
      response_json_schema: {
        type: "object",
        properties: {
          transactions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string", description: "Date in YYYY-MM-DD format" },
                amount: { type: "number", description: "Negative for expenses, positive for income" },
                description: { type: "string" },
                category: { type: "string" },
                merchant: { type: "string" }
              },
              required: ["date", "amount", "description", "category"]
            }
          }
        },
        required: ["transactions"]
      }
    });

    // Add account owner and user info to each transaction
    const transactions = extractionResult.transactions.map(t => ({
      ...t,
      account_owner: accountOwner,
      added_by_name: user.full_name || user.email,
      source: 'import'
    }));

    return Response.json({
      success: true,
      fileName: fileMeta.name,
      transactions
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});