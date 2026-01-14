# 🗄️ Database Setup & Troubleshooting

## 📋 Overview

Finance Tracker menggunakan **Supabase PostgreSQL** dengan stored procedures untuk atomic transaction operations. Dokumentasi ini menjelaskan schema database, setup procedures, dan troubleshooting common issues.

---

## 🏗️ Database Schema

### Tables

#### **accounts**
```sql
- id: TEXT (PRIMARY KEY) ⚠️ NOT UUID!
- user_id: UUID (FOREIGN KEY → auth.users)
- name: TEXT
- balance: NUMERIC
- type: TEXT
- created_at: TIMESTAMP
```

#### **transactions**
```sql
- id: UUID (PRIMARY KEY, auto-generated)
- type: TransactionType (ENUM: 'INCOME', 'EXPENSE', 'TRANSFER')
- amount: NUMERIC
- accountId: TEXT (FOREIGN KEY → accounts.id)
- categoryId: TEXT (FOREIGN KEY → categories.id)
- toAccountId: TEXT (nullable, untuk TRANSFER)
- description: TEXT
- date: TIMESTAMP WITH TIME ZONE
- is_initial_balance: BOOLEAN
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

#### **categories**
```sql
- id: TEXT (PRIMARY KEY)
- user_id: UUID
- name: TEXT
- type: TEXT
- color: TEXT
- icon: TEXT
```

### ⚠️ Important Schema Notes

1. **ID Types Mismatch**: 
   - `accounts.id` dan `transactions.accountId` adalah **TEXT**, bukan UUID
   - `accounts.user_id` adalah **UUID**
   - Stored procedures harus menerima parameter **TEXT** untuk account/category IDs

2. **Enum Type**:
   - `transactions.type` menggunakan custom PostgreSQL ENUM `TransactionType`
   - Must cast text to enum: `p_type::"TransactionType"`

3. **No updated_at in accounts**:
   - Table `accounts` tidak punya kolom `updated_at`
   - Jangan include di UPDATE statement

---

## 🚀 Setup Stored Procedures

### Step 1: Login ke Supabase Dashboard
1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Finance Tracker
3. Navigasi ke **SQL Editor**

### Step 2: Drop Existing Functions (jika ada)
```sql
-- Drop all existing versions to prevent conflicts
DO $$ 
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT oid::regprocedure 
        FROM pg_proc 
        WHERE proname = 'create_transaction'
    LOOP
        EXECUTE 'DROP FUNCTION ' || func_record.oid::regprocedure || ' CASCADE';
        RAISE NOTICE 'Dropped: %', func_record.oid::regprocedure;
    END LOOP;
END $$;
```

### Step 3: Create Functions
Copy seluruh isi file `supabase-stored-procedures.sql` dan paste ke SQL Editor, lalu klik **Run**.

### Step 4: Refresh Schema Cache
```sql
NOTIFY pgrst, 'reload schema';
```

### Step 5: Verify Installation
```sql
SELECT 
  proname as function_name,
  pg_get_function_result(oid) as return_type,
  pg_get_function_identity_arguments(oid) as parameters
FROM pg_proc 
WHERE proname IN ('create_transaction', 'update_transaction', 'delete_transaction');
```

**Expected Output:**
- Function names: `create_transaction`, `update_transaction`, `delete_transaction`
- Return type: `json`
- Parameters should show `text` for user_id, account_id, category_id (NOT uuid)

---

## 🔧 Troubleshooting

### Error: "operator does not exist: text = uuid"

**Cause**: Stored procedure parameter types don't match database schema.

**Solution**: 
- Database uses TEXT for IDs, NOT UUID
- Update function signature:
  ```sql
  p_user_id text,        -- NOT uuid
  p_account_id text,     -- NOT uuid
  p_category_id text,    -- NOT uuid
  ```

### Error: "column type is of type TransactionType but expression is of type text"

**Cause**: PostgreSQL enum type requires explicit casting.

**Solution**: Cast text to enum in INSERT:
```sql
INSERT INTO transactions (type, ...)
VALUES (p_type::"TransactionType", ...);
```

### Error: "column updated_at does not exist"

**Cause**: `accounts` table doesn't have `updated_at` column.

**Solution**: Remove from UPDATE statement:
```sql
-- ❌ WRONG
UPDATE accounts SET balance = x, updated_at = NOW() WHERE id = y;

-- ✅ CORRECT
UPDATE accounts SET balance = x WHERE id = y;
```

### Error: "column userId does not exist"

**Cause**: Table `transactions` tidak punya kolom `userId`.

**Solution**: Remove from INSERT statement - user ownership tracked via `accountId` relationship.

### Error: "Could not find the function in schema cache"

**Cause**: PostgREST schema cache belum refresh setelah create/drop function.

**Solutions**:
1. Run: `NOTIFY pgrst, 'reload schema';`
2. Wait 30-60 seconds for auto-refresh
3. Restart Supabase project (Settings → Database → Restart)

### Error: "function does not exist"

**Cause**: Function belum di-create atau signature tidak match.

**Verification Steps**:
```sql
-- Check if function exists
SELECT COUNT(*) FROM pg_proc WHERE proname = 'create_transaction';
-- Should return > 0

-- Check function signature
SELECT pg_get_function_identity_arguments(oid) 
FROM pg_proc 
WHERE proname = 'create_transaction';
-- Should show text types, not uuid
```

---

## ✅ Verification Checklist

After setup, verify everything works:

### 1. Test dari SQL Editor
```sql
-- Replace with actual IDs from your database
SELECT create_transaction(
  'user-uuid-here',           -- p_user_id
  'INCOME',                    -- p_type
  100000,                      -- p_amount
  'account-id-here',          -- p_account_id
  'category-id-here',         -- p_category_id
  NULL,                        -- p_to_account_id
  'Test transaction',          -- p_description
  NOW()                        -- p_date
);
```

**Expected Response:**
```json
{
  "success": true,
  "transaction_id": "uuid-here",
  "message": "Transaction created successfully"
}
```

### 2. Test dari Aplikasi
1. Login ke aplikasi
2. Navigate ke dashboard
3. Create INCOME transaction → Should succeed ✅
4. Create EXPENSE transaction → Should validate balance ✅
5. Create TRANSFER transaction → Should update both accounts ✅

### 3. Verify Balance Updates
```sql
-- Check account balances updated correctly
SELECT id, name, balance FROM accounts 
WHERE user_id = 'your-user-id';

-- Check transaction created
SELECT * FROM transactions 
ORDER BY "createdAt" DESC 
LIMIT 5;
```

---

## 🛠️ Maintenance

### Update Stored Procedures

When updating functions:
1. Always DROP existing function first (see Step 2 above)
2. Run updated SQL from `supabase-stored-procedures.sql`
3. Run `NOTIFY pgrst, 'reload schema';`
4. Test immediately after

### Schema Migrations

If you need to change database schema:
1. **Never** change production schema directly
2. Test in development first
3. Update stored procedures to match new schema
4. Update TypeScript types in application code
5. Deploy in sequence: DB → Functions → Application

### Backup

Before major changes:
```sql
-- Backup functions
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname IN ('create_transaction', 'update_transaction', 'delete_transaction');
```

---

## 📞 Support

**Common Issues Resolved:**
- ✅ UUID vs TEXT type mismatch
- ✅ TransactionType enum casting
- ✅ Schema cache refresh
- ✅ Missing/extra columns in INSERT/UPDATE
- ✅ Function signature compatibility

**If issues persist:**
1. Check PostgreSQL logs in Supabase Dashboard (Logs → Postgres Logs)
2. Verify RLS policies not blocking operations
3. Check function permissions (SECURITY DEFINER)
4. Review console logs in browser DevTools

---

## 📄 Related Files

- `supabase-stored-procedures.sql` - Complete function definitions
- `app/api/transactions/route.ts` - API implementation
- `components/transaction/form-transaction.tsx` - UI form

**Last Updated:** 2026-01-13
