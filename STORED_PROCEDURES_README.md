# 🔒 Stored Procedures Implementation Guide

## 📋 Daftar Isi
1. [Apa itu Stored Procedure?](#apa-itu-stored-procedure)
2. [Kenapa Kita Butuh Ini?](#kenapa-kita-butuh-ini)
3. [Cara Install](#cara-install)
4. [Cara Pakai](#cara-pakai)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Apa itu Stored Procedure?

Stored Procedure adalah **function yang dijalankan di database** (bukan di Node.js/API server). Semua logic ada di PostgreSQL, jadi:

- ✅ **Atomic** → Semua berhasil ATAU semua dibatalkan (tidak ada setengah-setengah)
- ✅ **Consistent** → Data selalu benar
- ✅ **Isolated** → Transaksi lain harus tunggu (pakai row locking)
- ✅ **Durable** → Kalau sudah berhasil, pasti tersimpan

Ini disebut prinsip **ACID** dalam database.

---

## 🚨 Kenapa Kita Butuh Ini?

### **Masalah di Code Lama:**

```typescript
// ❌ PROBLEM: Tidak atomic!
// Step 1: Kurangi balance wallet A → ✅ Berhasil
const { error1 } = await supabase.from('accounts')
  .update({ balance: balance - 500000 })
  .eq('id', accountA)

// Step 2: Tambah balance wallet B → ❌ ERROR! (server crash)
const { error2 } = await supabase.from('accounts')
  .update({ balance: balance + 500000 })
  .eq('id', accountB)

// HASIL: Uang hilang Rp 500.000! 💥
```

### **Solusi dengan Stored Procedure:**

```typescript
// ✅ SOLUTION: Semua dijalankan di database, atomic!
const { data, error } = await supabase.rpc('create_transaction', {
  p_user_id: userId,
  p_type: 'TRANSFER',
  p_amount: 500000,
  p_account_id: accountA,
  p_to_account_id: accountB,
  ...
})

// Kalau ada error di tengah jalan → ROLLBACK OTOMATIS!
// Data PASTI konsisten ✅
```

---

## 📦 Cara Install

### **Step 1: Login ke Supabase**

1. Buka [https://supabase.com](https://supabase.com)
2. Login dan pilih project **finance-tracker**
3. Klik menu **SQL Editor** di sidebar kiri

### **Step 2: Execute SQL**

1. Buka file `supabase-stored-procedures.sql` di VS Code
2. Copy **SEMUA ISI FILE** (Ctrl+A, Ctrl+C)
3. Paste ke **Supabase SQL Editor**
4. Klik tombol **Run** (atau tekan Ctrl+Enter)

### **Step 3: Verify Installation**

Jalankan query ini di SQL Editor untuk cek apakah functions sudah dibuat:

```sql
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('create_transaction', 'update_transaction', 'delete_transaction')
ORDER BY routine_name;
```

**Expected Result:**
```
routine_name         | routine_type | return_type
---------------------|--------------|------------
create_transaction   | FUNCTION     | json
delete_transaction   | FUNCTION     | json
update_transaction   | FUNCTION     | json
```

---

## 🚀 Cara Pakai

### **1. Create Transaction (POST /api/transactions)**

**File:** `app/api/transactions/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const body = await request.json()
  const { type, amount, categoryId, accountId, toAccountId, description, date } = body

  // ✅ Call stored procedure
  const { data, error } = await supabase.rpc('create_transaction', {
    p_user_id: user.id,
    p_type: type.toUpperCase(),
    p_amount: Number(amount),
    p_account_id: accountId,
    p_category_id: categoryId,
    p_to_account_id: toAccountId || null,
    p_description: description || null,
    p_date: date
  })

  if (!data.success) {
    return NextResponse.json({ 
      error: data.error,
      message: data.message 
    }, { status: 400 })
  }

  return NextResponse.json({ 
    success: true,
    transaction_id: data.transaction_id
  }, { status: 201 })
}
```

### **2. Update Transaction (PUT /api/transactions/[id])**

**File:** `app/api/transactions/[id]/route.ts`

```typescript
export async function PUT(request: NextRequest, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { id } = await params
  const body = await request.json()

  // ✅ Call stored procedure
  const { data, error } = await supabase.rpc('update_transaction', {
    p_user_id: user.id,
    p_transaction_id: id,
    p_type: type.toUpperCase(),
    p_amount: Number(amount),
    p_account_id: accountId,
    p_category_id: categoryId,
    p_to_account_id: toAccountId || null,
    p_description: description || null,
    p_date: date
  })

  if (!data.success) {
    return NextResponse.json({ 
      error: data.error,
      message: data.message 
    }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
```

### **3. Delete Transaction (DELETE /api/transactions/[id])**

**File:** `app/api/transactions/[id]/route.ts`

```typescript
export async function DELETE(request: NextRequest, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { id } = await params

  // ✅ Call stored procedure
  const { data, error } = await supabase.rpc('delete_transaction', {
    p_user_id: user.id,
    p_transaction_id: id
  })

  if (!data.success) {
    return NextResponse.json({ 
      error: data.error,
      message: data.message 
    }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
```

---

## 🧪 Testing

### **Test di Supabase SQL Editor**

#### **1. Test Create INCOME**

```sql
SELECT create_transaction(
  'YOUR_USER_ID'::uuid,           -- Ganti dengan user ID kamu
  'INCOME',
  500000,
  'ACCOUNT_ID'::uuid,             -- Ganti dengan account ID kamu
  'CATEGORY_ID'::uuid,            -- Ganti dengan category ID kamu
  NULL,
  'Gajian bulan ini',
  NOW()
);
```

**Expected Result:**
```json
{
  "success": true,
  "transaction_id": "xxx-xxx-xxx",
  "message": "Transaction created successfully",
  "details": {
    "type": "INCOME",
    "amount": 500000,
    "old_source_balance": 1000000,
    "new_source_balance": 1500000
  }
}
```

#### **2. Test Create EXPENSE**

```sql
SELECT create_transaction(
  'YOUR_USER_ID'::uuid,
  'EXPENSE',
  100000,
  'ACCOUNT_ID'::uuid,
  'FOOD_CATEGORY_ID'::uuid,
  NULL,
  'Makan di restoran',
  NOW()
);
```

#### **3. Test Create TRANSFER**

```sql
SELECT create_transaction(
  'YOUR_USER_ID'::uuid,
  'TRANSFER',
  250000,
  'CASH_ACCOUNT_ID'::uuid,
  'TRANSFER_CATEGORY_ID'::uuid,
  'BANK_ACCOUNT_ID'::uuid,
  'Transfer ke bank',
  NOW()
);
```

#### **4. Test INSUFFICIENT BALANCE**

```sql
-- Coba transfer amount lebih besar dari balance
SELECT create_transaction(
  'YOUR_USER_ID'::uuid,
  'EXPENSE',
  9999999999,                      -- Amount sangat besar
  'ACCOUNT_ID'::uuid,
  'CATEGORY_ID'::uuid,
  NULL,
  'Test insufficient balance',
  NOW()
);
```

**Expected Result:**
```json
{
  "success": false,
  "error": "INSUFFICIENT_BALANCE",
  "message": "Insufficient balance in source account",
  "required": 9999999999,
  "available": 1000000
}
```

### **Test di Postman/Thunder Client**

#### **POST /api/transactions**

```bash
POST http://localhost:3000/api/transactions
Content-Type: application/json

{
  "type": "INCOME",
  "amount": 500000,
  "accountId": "xxx-xxx-xxx",
  "categoryId": "xxx-xxx-xxx",
  "description": "Test income",
  "date": "2025-12-29T10:00:00Z"
}
```

#### **PUT /api/transactions/[id]**

```bash
PUT http://localhost:3000/api/transactions/xxx-xxx-xxx
Content-Type: application/json

{
  "type": "EXPENSE",
  "amount": 150000,
  "accountId": "xxx-xxx-xxx",
  "categoryId": "xxx-xxx-xxx",
  "description": "Updated transaction",
  "date": "2025-12-29T10:00:00Z"
}
```

#### **DELETE /api/transactions/[id]**

```bash
DELETE http://localhost:3000/api/transactions/xxx-xxx-xxx
```

---

## 🐛 Troubleshooting

### **Error: function create_transaction does not exist**

**Penyebab:** Stored procedure belum dibuat di database

**Solusi:**
1. Buka Supabase SQL Editor
2. Run `supabase-stored-procedures.sql` lagi
3. Verify dengan query di [Step 3](#step-3-verify-installation)

---

### **Error: permission denied for function**

**Penyebab:** User tidak punya permission untuk execute function

**Solusi:**
```sql
GRANT EXECUTE ON FUNCTION create_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION update_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION delete_transaction TO authenticated;
```

---

### **Error: INSUFFICIENT_BALANCE tapi balance sebenarnya cukup**

**Penyebab:** Ada concurrent transaction yang belum selesai (race condition)

**Solusi:** Stored procedure sudah handle ini dengan `FOR UPDATE` row locking. Tapi kalau masih terjadi:
1. Check apakah ada transaction yang stuck
2. Restart Supabase (kalau local development)
3. Check logs di Supabase Dashboard

---

### **Error: UNAUTHORIZED**

**Penyebab:** User mencoba edit/delete transaction milik user lain

**Solusi:** Ini expected behavior (security feature). Pastikan user ID benar.

---

### **Balance tidak update di frontend setelah transaction**

**Penyebab:** Frontend tidak refetch data setelah transaction berhasil

**Solusi:**
Di `components/transaction/form-transaction.tsx`:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  // ... submit logic ...
  
  if (response.ok) {
    toast.success('Transaction created successfully')
    
    // ✅ Refetch accounts to show updated balances
    fetchAccounts()
    
    onComplete() // This will refetch dashboard stats
  }
}
```

---

## 📊 Monitoring & Debugging

### **Check Active Transactions**

```sql
SELECT 
  pid,
  usename,
  application_name,
  state,
  query_start,
  state_change,
  wait_event_type,
  wait_event,
  query
FROM pg_stat_activity
WHERE state = 'active'
  AND query NOT LIKE '%pg_stat_activity%';
```

### **Check Locked Rows**

```sql
SELECT 
  l.locktype,
  l.relation::regclass,
  l.mode,
  l.granted,
  a.usename,
  a.query,
  a.pid
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT l.granted
ORDER BY l.relation;
```

### **Kill Stuck Transaction (Jika Ada)**

```sql
-- HATI-HATI! Ini akan terminate connection
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND state_change < NOW() - INTERVAL '5 minutes';
```

---

## 🎉 Kesimpulan

Dengan stored procedures, aplikasi finance tracker Anda sekarang:

- ✅ **100% Data Consistency** → Tidak ada balance yang hilang/corrupt
- ✅ **No Race Conditions** → Row locking mencegah concurrent updates
- ✅ **Auto Rollback** → Error di tengah jalan tidak akan rusak data
- ✅ **Better Performance** → Mengurangi round-trip database calls
- ✅ **Centralized Logic** → Business logic ada di satu tempat (database)

**Sekarang Anda bisa tidur nyenyak tanpa khawatir ada bug yang bikin uang user hilang! 😴✨**

---

## 📚 Referensi

- [PostgreSQL PL/pgSQL Documentation](https://www.postgresql.org/docs/current/plpgsql.html)
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)
- [ACID Properties](https://en.wikipedia.org/wiki/ACID)
- [Database Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)

---

**Made with ❤️ for Finance Tracker**
