# 🎯 Implementation Checklist - Stored Procedures & Rate Limiting

## ✅ Yang Sudah Dikerjakan

### 1. **Route API Sudah Diupdate** ✅

#### **File yang sudah diubah:**
- ✅ `app/api/transactions/route.ts` - POST method + Rate limiting
- ✅ `app/api/transactions/[id]/route.ts` - PUT & DELETE methods + Rate limiting
- ✅ `app/api/accounts/route.ts` - GET & POST + Rate limiting
- ✅ `app/api/accounts/[id]/route.ts` - PUT & DELETE + Rate limiting
- ✅ `app/api/user/initialize/route.ts` - POST + Rate limiting
- ✅ `app/api/reports/export/route.ts` - GET + Rate limiting

#### **Perubahan:**
- ❌ **Cara Lama:** Manual transaction dengan multiple queries (prone to race condition)
- ✅ **Cara Baru:** Pakai stored procedure `supabase.rpc()` (atomic & safe)
- ✅ **Security:** Rate limiting implemented untuk prevent API abuse

**Hasil:**
```typescript
// Sebelum
const { data: transaction } = await supabase.from('transactions').insert(...)
const { error } = await supabase.from('accounts').update({ balance: ... })
// Jika error di step 2, data sudah rusak!

// Sesudah
// 1. Rate limiting check
const rateLimitResult = await rateLimit(getClientIdentifier(request, user.id))
if (!rateLimitResult.success) {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
}

// 2. Stored procedure call
const { data, error } = await supabase.rpc('create_transaction', {
  p_user_id: user.id,
  p_type: type,
  p_amount: amount,
  ...
})
// Semua atomic! Error = auto rollback!
```

### 2. **Rate Limiting System** ✅

#### **Files Created:**
- ✅ `lib/rate-limit.ts` - Core rate limiting logic
- ✅ `RATE_LIMITING_README.md` - Documentation

#### **Features:**
- Token bucket algorithm
- In-memory storage (MVP)
- Per-user tracking
- Automatic cleanup
- Configurable presets:
  - **Strict:** 5 requests/min (Create/Update/Delete)
  - **Standard:** 20 requests/min (General)
  - **Relaxed:** 60 requests/min (Read operations)
  - **Auth:** 5 requests/5min (Authentication)
  - **Export:** 3 requests/5min (PDF/CSV generation)

#### **Protected Endpoints:**
- ✅ All transaction operations
- ✅ All account operations
- ✅ User initialization
- ✅ Report exports

---

## 📋 Yang Perlu Anda Lakukan

### **STEP 1: Install Stored Procedures di Supabase** ⏳

**Durasi:** ~5 menit

1. ✅ Login ke [Supabase Dashboard](https://supabase.com)
2. ✅ Pilih project **finance-tracker**
3. ✅ Klik menu **SQL Editor** di sidebar
4. ✅ Buka file `supabase-stored-procedures.sql` di VS Code
5. ✅ Copy **semua isi file** (Ctrl+A, Ctrl+C)
6. ✅ Paste ke Supabase SQL Editor
7. ✅ Klik **Run** (atau Ctrl+Enter)
8. ✅ Tunggu sampai selesai (sekitar 10-15 detik)

**Verify:**
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name IN ('create_transaction', 'update_transaction', 'delete_transaction');
```

**Expected:** Muncul 3 functions

---

### **STEP 2: Test di Development** ⏳

**Durasi:** ~10 menit

#### **Test 1: Create Transaction (INCOME)**
```bash
POST http://localhost:3000/api/transactions
Content-Type: application/json

{
  "type": "INCOME",
  "amount": 500000,
  "accountId": "your-account-id",
  "categoryId": "your-category-id",
  "description": "Test income",
  "date": "2025-12-29T10:00:00Z"
}
```

**Expected Response:**
```json
{
  "success": true,
  "transaction_id": "xxx-xxx-xxx",
  "message": "Transaction created successfully"
}
```

**Verify:** Check di dashboard, balance wallet harus bertambah Rp 500.000

---

#### **Test 2: Create Transaction (EXPENSE)**
```bash
POST http://localhost:3000/api/transactions
Content-Type: application/json

{
  "type": "EXPENSE",
  "amount": 100000,
  "accountId": "your-account-id",
  "categoryId": "your-category-id",
  "description": "Test expense",
  "date": "2025-12-29T10:00:00Z"
}
```

**Expected Response:** Success + balance berkurang Rp 100.000

---

#### **Test 3: Create Transaction (TRANSFER)**
```bash
POST http://localhost:3000/api/transactions
Content-Type: application/json

{
  "type": "TRANSFER",
  "amount": 250000,
  "accountId": "source-account-id",
  "toAccountId": "dest-account-id",
  "description": "Test transfer",
  "date": "2025-12-29T10:00:00Z"
}
```

**Expected Response:** Success + balance source berkurang, dest bertambah

---

#### **Test 4: Insufficient Balance (Should Fail)**
```bash
POST http://localhost:3000/api/transactions
Content-Type: application/json

{
  "type": "EXPENSE",
  "amount": 99999999999,  // Jumlah sangat besar
  "accountId": "your-account-id",
  "categoryId": "your-category-id",
  "description": "Test insufficient balance",
  "date": "2025-12-29T10:00:00Z"
}
```

**Expected Response:**
```json
{
  "error": "INSUFFICIENT_BALANCE",
  "message": "Insufficient balance in source account",
  "required": 99999999999,
  "available": 1000000
}
```

**Status Code:** 400

---

#### **Test 5: Update Transaction**
```bash
PUT http://localhost:3000/api/transactions/{transaction-id}
Content-Type: application/json

{
  "type": "EXPENSE",
  "amount": 150000,
  "accountId": "your-account-id",
  "categoryId": "your-category-id",
  "description": "Updated transaction",
  "date": "2025-12-29T10:00:00Z"
}
```

**Expected Response:** Success + balance ter-update dengan benar

---

#### **Test 6: Delete Transaction**
```bash
DELETE http://localhost:3000/api/transactions/{transaction-id}
```

**Expected Response:** Success + balance kembali ke semula

---

### **STEP 3: Test di Frontend** ⏳

**Durasi:** ~5 menit

1. ✅ Buka aplikasi di browser: `http://localhost:3000`
2. ✅ Login dengan akun test
3. ✅ Klik **Add Transaction**
4. ✅ Isi form:
   - Type: Income
   - Amount: Rp 500.000
   - Wallet: Cash
   - Category: Salary
   - Description: Test income
   - Date: Today
5. ✅ Klik **Save**
6. ✅ **Verify:** Dashboard stats harus update, balance harus bertambah

**Test Semua Scenarios:**
- ✅ Add INCOME → Balance bertambah
- ✅ Add EXPENSE → Balance berkurang
- ✅ Add TRANSFER → Source berkurang, dest bertambah
- ✅ Edit transaction → Balance ter-update dengan benar
- ✅ Delete transaction → Balance kembali ke sebelumnya
- ✅ Try expense dengan insufficient balance → Muncul error toast

---

### **STEP 4: Monitoring & Debugging** ⏳

**Durasi:** ~5 menit

#### **Check Stored Procedure Logs**

Di Supabase Dashboard → Logs → Database Logs

**Filter:** `create_transaction` atau `update_transaction`

**Expected:** Lihat semua RPC calls dan response-nya

---

#### **Check Balance Consistency**

```sql
-- Run di Supabase SQL Editor
SELECT 
  a.name as account_name,
  a.balance as current_balance,
  (
    SELECT COALESCE(SUM(
      CASE 
        WHEN t.type = 'INCOME' THEN t.amount
        WHEN t.type = 'EXPENSE' THEN -t.amount
        WHEN t.type = 'TRANSFER' AND t."accountId" = a.id THEN -t.amount
        WHEN t.type = 'TRANSFER' AND t."toAccountId" = a.id THEN t.amount
        ELSE 0
      END
    ), 0)
    FROM transactions t
    WHERE t."accountId" = a.id OR t."toAccountId" = a.id
  ) as calculated_balance
FROM accounts a
WHERE a.user_id = 'YOUR_USER_ID';
```

**Expected:** `current_balance` = `calculated_balance` untuk semua accounts

Jika ada perbedaan → ada bug di transaction logic!

---

## 🎯 Success Criteria

Aplikasi dianggap **berhasil** jika:

- ✅ Semua test scenarios (1-6) PASS
- ✅ Balance consistency check PASS
- ✅ Tidak ada error di console/logs
- ✅ Frontend bisa create/edit/delete transaction tanpa error
- ✅ Dashboard stats update dengan benar setelah transaction
- ✅ Insufficient balance di-handle dengan baik (muncul error, balance tidak berubah)

---

## 🔥 Benefits yang Didapat

### **BEFORE (Manual Transaction):**
```
❌ Race condition possible
❌ Data bisa inconsistent
❌ Balance bisa corrupt
❌ Manual rollback jika error
❌ Banyak round-trip ke database
❌ Sulit di-debug
```

### **AFTER (Stored Procedure):**
```
✅ No race condition (row locking)
✅ Data always consistent (atomic)
✅ Balance always correct
✅ Auto rollback on error
✅ Single round-trip (faster)
✅ Easy to debug (centralized logic)
```

---

## 🐛 Troubleshooting Quick Reference

| Error | Penyebab | Solusi |
|-------|----------|--------|
| `function does not exist` | Stored procedure belum dibuat | Run `supabase-stored-procedures.sql` |
| `permission denied` | User tidak punya permission | Run `GRANT EXECUTE ON FUNCTION ... TO authenticated` |
| `INSUFFICIENT_BALANCE` | Balance tidak cukup | Expected behavior (validation working) |
| `UNAUTHORIZED` | User tidak own transaction | Expected behavior (security working) |
| Balance tidak update | Frontend tidak refetch | Tambah `fetchAccounts()` setelah transaction |

---

## 📚 File Reference

| File | Purpose |
|------|---------|
| `supabase-stored-procedures.sql` | SQL script untuk create functions di database |
| `STORED_PROCEDURES_README.md` | Dokumentasi lengkap cara pakai & troubleshooting |
| `IMPLEMENTATION_CHECKLIST.md` | Checklist ini (langkah-langkah implementasi) |
| `app/api/transactions/route.ts` | POST endpoint (create transaction) |
| `app/api/transactions/[id]/route.ts` | PUT & DELETE endpoints (update & delete) |

---

## 🎬 Next Steps (Optional)

Setelah stored procedures berjalan dengan baik, Anda bisa:

1. **Add Audit Trail** → Track siapa edit transaction apa dan kapan
2. **Add Rate Limiting** → Prevent spam transactions
3. **Add Transaction History** → Lihat history edit/delete transaction
4. **Add Validation Layer** → Pakai Zod untuk validate input
5. **Add Unit Tests** → Test stored procedure dengan Jest
6. **Add Monitoring** → Sentry untuk track errors

---

## ✅ Final Checklist

Centang setelah selesai:

- [ ] Stored procedures sudah diinstall di Supabase
- [ ] Verify functions exist (query di SQL Editor)
- [ ] Test API endpoints (POST, PUT, DELETE)
- [ ] Test insufficient balance scenario
- [ ] Test di frontend (add, edit, delete transaction)
- [ ] Check balance consistency
- [ ] Monitor logs (tidak ada error)
- [ ] Dashboard stats update dengan benar
- [ ] Toast notifications muncul dengan benar
- [ ] Deploy ke production (jika sudah yakin)

---

**Good luck! 🚀**

Jika ada pertanyaan atau error, refer ke `STORED_PROCEDURES_README.md` section Troubleshooting.
