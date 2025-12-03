import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

async function buildUserParts(message, fileUrls) {
  const parts = [{ text: message }];
  
  for (const url of fileUrls) {
    try {
      const response = await fetch(url);
      const contentType = response.headers.get('content-type') || '';
      
      // For CSV files, read as text and include in the message
      if (url.toLowerCase().includes('.csv') || contentType.includes('csv') || contentType.includes('text')) {
        const textContent = await response.text();
        parts[0].text += `\n\nCSV FILE CONTENT:\n${textContent}`;
      } else {
        // For images and PDFs, use inline data
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binary);
        
        let mimeType = contentType.split(';')[0];
        if (url.toLowerCase().includes('.pdf')) mimeType = 'application/pdf';
        else if (url.toLowerCase().includes('.png')) mimeType = 'image/png';
        else if (url.toLowerCase().includes('.jpg') || url.toLowerCase().includes('.jpeg')) mimeType = 'image/jpeg';
        else if (url.toLowerCase().includes('.xlsx')) mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        else if (url.toLowerCase().includes('.xls')) mimeType = 'application/vnd.ms-excel';
        
        parts.push({
          inlineData: {
            mimeType,
            data: base64
          }
        });
      }
    } catch (e) {
      console.error('Failed to fetch file:', url, e);
    }
  }
  
  return parts;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, conversationHistory = [], fileUrls = [] } = await req.json();
    const accountOwner = user.shared_with_account || user.email;

    // Get recent transactions for context
    const recentTransactions = await base44.entities.Transaction.filter(
      { account_owner: accountOwner }, 
      '-date', 
      20
    );

    const budgets = await base44.entities.Budget.filter({ account_owner: accountOwner });

    const systemPrompt = `You are Penny, a friendly and helpful personal finance assistant. You help users track their spending, manage budgets, and provide financial insights.

CURRENT USER: ${user.full_name || user.email}
ACCOUNT OWNER: ${accountOwner}
CURRENCY: ${user.preferred_currency || 'USD'}

RECENT TRANSACTIONS:
${JSON.stringify(recentTransactions.slice(0, 10), null, 2)}

BUDGETS:
${JSON.stringify(budgets, null, 2)}

CAPABILITIES:
1. ADD TRANSACTIONS: When user mentions spending or income, extract and create transactions
2. SET BUDGETS: Help users set monthly budget limits by category
3. ANALYZE SPENDING: Provide insights on spending patterns
4. IMPORT DATA: If user provides transaction data (from documents, lists, etc.), extract and save them

CATEGORIES: food, transport, shopping, entertainment, bills, health, education, travel, groceries, subscriptions, income, savings, other

RESPONSE FORMAT:
Always respond with valid JSON in this format:
{
  "message": "Your friendly response to the user",
  "actions": [
    {
      "type": "create_transaction" | "create_budget" | "update_budget",
      "data": { ... }
    }
  ]
}

For transactions, data should include: amount (negative for expenses), category, description, date (YYYY-MM-DD), merchant (optional)
For budgets, data should include: category, monthly_limit, month (YYYY-MM)

Be warm, encouraging, and use emojis occasionally. Keep responses concise.`;

    const messages = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'I understand. I am Penny, ready to help with finances. I will respond in the specified JSON format.' }] },
      ...conversationHistory.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      { 
        role: 'user', 
        parts: await buildUserParts(message, fileUrls)
      }
    ];

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${error}`);
    }

    const result = await response.json();
    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse the JSON response
    let parsedResponse;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      parsedResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: textResponse, actions: [] };
    } catch {
      parsedResponse = { message: textResponse, actions: [] };
    }

    // Execute actions
    const executedActions = [];
    for (const action of parsedResponse.actions || []) {
      try {
        if (action.type === 'create_transaction') {
          const txData = {
            ...action.data,
            account_owner: accountOwner,
            added_by_name: user.full_name || user.email,
            source: 'voice'
          };
          await base44.entities.Transaction.create(txData);
          executedActions.push({ type: 'create_transaction', success: true, data: txData });
        } else if (action.type === 'create_budget' || action.type === 'update_budget') {
          const budgetData = {
            ...action.data,
            account_owner: accountOwner
          };
          // Check if budget exists for this category/month
          const existing = budgets.find(b => 
            b.category === budgetData.category && b.month === budgetData.month
          );
          if (existing) {
            await base44.entities.Budget.update(existing.id, budgetData);
          } else {
            await base44.entities.Budget.create(budgetData);
          }
          executedActions.push({ type: action.type, success: true, data: budgetData });
        }
      } catch (e) {
        executedActions.push({ type: action.type, success: false, error: e.message });
      }
    }

    return Response.json({
      message: parsedResponse.message,
      actions: executedActions
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});