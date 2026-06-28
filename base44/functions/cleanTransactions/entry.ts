import { createClientFromRequest } from 'npm:@base44/sdk@0.8.34';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method Not Allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    
    // 1. Fetch transactions (using a large limit to cover recent syncs)
    const transactions = await base44.asServiceRole.entities.Transaction.filter({}, '-date', 5000);
    
    const toClean = transactions.filter(t => t.source && t.source.startsWith('bank_sync'));

    let cleanedCount = 0;
    let skippedCount = 0;
    const updates = [];

    for (const t of toClean) {
      let newDesc = t.description || '';
      let newMerchant = t.merchant || '';
      
      // Keep track if anything actually changed
      let hasTextChanges = false;

      // 2. Debit card pattern
      if (newDesc.includes('כרטיס דביט')) {
        const debitMatch = newDesc.match(/ב-\d+ ב-(.+)$/);
        if (debitMatch && debitMatch[1]) {
          newDesc = debitMatch[1].trim();
          newMerchant = newDesc;
          hasTextChanges = true;
        }
      } 
      // 3. Transfer pattern
      else if (newDesc.includes('העברה מאת:')) {
        const transferMatch = newDesc.match(/העברה מאת:\s*(.*?)(?:\s*••|$)/);
        if (transferMatch && transferMatch[1]) {
          newDesc = transferMatch[1].trim().substring(0, 30);
          hasTextChanges = true;
        }
      }

      // 4. Re-run category mapping
      const searchStr = (newDesc + ' ' + newMerchant).toLowerCase();
      let newCat = 'household'; // default

      if (/(mortgage|rent)/.test(searchStr)) {
        newCat = 'mortgage';
      } else if (/(car payment|ליסינג|הלוואת רכב)/.test(searchStr)) {
        newCat = 'car_payment';
      } else if (/(ביטוח|insurance)/.test(searchStr)) {
        newCat = 'insurance';
      } else if (/(שכר לימוד|גן|tuition)/.test(searchStr)) {
        newCat = 'tuition';
      } else if (/(kids allowance)/.test(searchStr)) {
        newCat = 'kids_allowance';
      } else if (/(פלאפון|סלקום|hot|בזק|internet|phone)/.test(searchStr)) {
        newCat = 'phone_internet';
      } else if (/(חשמל|מים|גז)/.test(searchStr)) {
        newCat = 'electricity_water';
      } else if (/(עיריית|ארנונה)/.test(searchStr)) {
        newCat = 'arnona';
      } else if (/(כרטיסי אשראי|מקס|לאומי קארד|visa)/.test(searchStr)) {
        newCat = 'credit_card_payment';
      } else if (/(מתוק מדבש|מאפייה|שיפון|סופר|יש|רמי לוי|שופרסל)/.test(searchStr)) {
        newCat = 'groceries';
      } else if (/(רב קו|תחנה מרכזית|אוטובוס|חניון)/.test(searchStr)) {
        newCat = 'transport';
      } else if (/(פז|דלק|סונול|fuel)/.test(searchStr)) {
        newCat = 'fuel';
      } else if (/(זארה|h&m|ביגוד|clothing)/.test(searchStr)) {
        newCat = 'clothing';
      } else if (/(מכבי|קופת חולים|רופא|pharmacy|בית מרקחת)/.test(searchStr)) {
        newCat = 'health';
      } else if (/(פיצה|קצפת|מסעדה|wolt|10bis|בייגלס)/.test(searchStr)) {
        newCat = 'food';
      } else if (/(סרט|בידור|netflix|אמזון|entertainment)/.test(searchStr)) {
        newCat = 'entertainment';
      } else if (/(אבנייצדק|צדקה|donation|maaser)/.test(searchStr)) {
        newCat = 'maaser';
      } else if (t.amount > 0 && /(משכורת|נוה ירושלים|ביטוח לאומי|קצבת)/.test(searchStr)) {
        newCat = 'income';
      }

      // 5. Check if we need to update this record
      if (hasTextChanges || newCat !== t.category) {
        updates.push({
          id: t.id,
          description: newDesc,
          merchant: newMerchant,
          category: newCat
        });
        cleanedCount++;
      } else {
        skippedCount++;
      }
    }

    // Process updates in chunks of 500 (max allowed per bulkUpdate)
    for (let i = 0; i < updates.length; i += 500) {
      await base44.asServiceRole.entities.Transaction.bulkUpdate(updates.slice(i, i + 500));
    }

    // 6. Return stats
    return Response.json({ cleaned: cleanedCount, skipped: skippedCount });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});