-- ============================================
-- FINANCE TRACKER - STORED PROCEDURES
-- ============================================
-- Description: Atomic transaction operations to ensure data consistency
-- Author: Finance Tracker Team
-- Date: 2025-12-29
-- 
-- CARA PAKAI:
-- 1. Login ke Supabase Dashboard
-- 2. Buka SQL Editor
-- 3. Copy-paste semua SQL di bawah ini
-- 4. Klik "Run" untuk execute
-- ============================================

-- ============================================
-- FUNCTION 1: CREATE TRANSACTION
-- ============================================
-- Purpose: Atomically create transaction and update account balances
-- Features:
--   - Row locking with FOR UPDATE to prevent race conditions
--   - Automatic balance validation
--   - Auto-rollback on error
--   - Support INCOME, EXPENSE, and TRANSFER types
-- ============================================

CREATE OR REPLACE FUNCTION create_transaction(
  p_user_id uuid,
  p_type text,
  p_amount numeric,
  p_account_id uuid,
  p_category_id uuid,
  p_to_account_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_date timestamptz DEFAULT NOW()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id uuid;
  v_source_balance numeric;
  v_dest_balance numeric;
  v_new_source_balance numeric;
  v_new_dest_balance numeric;
  v_source_user_id uuid;
  v_dest_user_id uuid;
BEGIN
  -- Validate input
  IF p_type NOT IN ('INCOME', 'EXPENSE', 'TRANSFER') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'INVALID_TYPE',
      'message', 'Transaction type must be INCOME, EXPENSE, or TRANSFER'
    );
  END IF;

  IF p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'INVALID_AMOUNT',
      'message', 'Amount must be greater than 0'
    );
  END IF;

  -- Get source account balance and verify ownership
  SELECT balance, user_id 
  INTO v_source_balance, v_source_user_id
  FROM accounts 
  WHERE id = p_account_id
  FOR UPDATE; -- Lock the row to prevent concurrent updates

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'ACCOUNT_NOT_FOUND',
      'message', 'Source account not found'
    );
  END IF;

  -- Verify account ownership
  IF v_source_user_id != p_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'You do not own this account'
    );
  END IF;

  -- Check sufficient balance for EXPENSE and TRANSFER
  IF (p_type = 'EXPENSE' OR p_type = 'TRANSFER') AND v_source_balance < p_amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'INSUFFICIENT_BALANCE',
      'message', 'Insufficient balance in source account',
      'required', p_amount,
      'available', v_source_balance
    );
  END IF;

  -- For TRANSFER: validate destination account
  IF p_type = 'TRANSFER' THEN
    IF p_to_account_id IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'MISSING_DESTINATION',
        'message', 'Destination account is required for transfer'
      );
    END IF;

    IF p_account_id = p_to_account_id THEN
      RETURN json_build_object(
        'success', false,
        'error', 'SAME_ACCOUNT',
        'message', 'Source and destination accounts must be different'
      );
    END IF;

    -- Get destination account balance and verify ownership
    SELECT balance, user_id 
    INTO v_dest_balance, v_dest_user_id
    FROM accounts 
    WHERE id = p_to_account_id
    FOR UPDATE; -- Lock the row

    IF NOT FOUND THEN
      RETURN json_build_object(
        'success', false,
        'error', 'DESTINATION_NOT_FOUND',
        'message', 'Destination account not found'
      );
    END IF;

    -- Verify destination account ownership
    IF v_dest_user_id != p_user_id THEN
      RETURN json_build_object(
        'success', false,
        'error', 'UNAUTHORIZED',
        'message', 'You do not own the destination account'
      );
    END IF;
  END IF;

  -- Calculate new balances
  CASE p_type
    WHEN 'INCOME' THEN
      v_new_source_balance := v_source_balance + p_amount;
    WHEN 'EXPENSE' THEN
      v_new_source_balance := v_source_balance - p_amount;
    WHEN 'TRANSFER' THEN
      v_new_source_balance := v_source_balance - p_amount;
      v_new_dest_balance := v_dest_balance + p_amount;
  END CASE;

  -- Insert transaction record
  INSERT INTO transactions (
    type,
    amount,
    "accountId",
    "categoryId",
    "toAccountId",
    description,
    date,
    is_initial_balance
  ) VALUES (
    p_type,
    p_amount,
    p_account_id,
    p_category_id,
    p_to_account_id,
    p_description,
    p_date,
    false
  )
  RETURNING id INTO v_transaction_id;

  -- Update source account balance
  UPDATE accounts
  SET balance = v_new_source_balance,
      updated_at = NOW()
  WHERE id = p_account_id
    AND user_id = p_user_id;

  -- Update destination account balance (if TRANSFER)
  IF p_type = 'TRANSFER' THEN
    UPDATE accounts
    SET balance = v_new_dest_balance,
        updated_at = NOW()
    WHERE id = p_to_account_id
      AND user_id = p_user_id;
  END IF;

  -- Return success with transaction details
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'message', 'Transaction created successfully',
    'details', json_build_object(
      'type', p_type,
      'amount', p_amount,
      'old_source_balance', v_source_balance,
      'new_source_balance', v_new_source_balance,
      'old_dest_balance', v_dest_balance,
      'new_dest_balance', v_new_dest_balance
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Automatic rollback on any error
    RETURN json_build_object(
      'success', false,
      'error', 'DATABASE_ERROR',
      'message', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_transaction TO authenticated;

-- ============================================
-- FUNCTION 2: UPDATE TRANSACTION
-- ============================================
-- Purpose: Atomically update transaction and revert/apply balance changes
-- Features:
--   - Revert old transaction effects first
--   - Apply new transaction effects
--   - Handle account changes (if user changes wallet)
--   - Auto-rollback on error
-- ============================================

CREATE OR REPLACE FUNCTION update_transaction(
  p_user_id uuid,
  p_transaction_id uuid,
  p_type text,
  p_amount numeric,
  p_account_id uuid,
  p_category_id uuid,
  p_to_account_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_date timestamptz DEFAULT NOW()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_transaction record;
  v_source_account record;
  v_dest_account record;
  v_old_source_account record;
  v_old_dest_account record;
BEGIN
  -- Get old transaction details
  SELECT * INTO v_old_transaction
  FROM transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'TRANSACTION_NOT_FOUND',
      'message', 'Transaction not found'
    );
  END IF;

  -- Verify ownership of old source account
  SELECT * INTO v_old_source_account
  FROM accounts
  WHERE id = v_old_transaction."accountId" AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'You do not own this transaction'
    );
  END IF;

  -- STEP 1: Revert old transaction effects
  IF v_old_transaction.type = 'INCOME' THEN
    UPDATE accounts SET balance = balance - v_old_transaction.amount
    WHERE id = v_old_transaction."accountId";
  ELSIF v_old_transaction.type = 'EXPENSE' THEN
    UPDATE accounts SET balance = balance + v_old_transaction.amount
    WHERE id = v_old_transaction."accountId";
  ELSIF v_old_transaction.type = 'TRANSFER' THEN
    UPDATE accounts SET balance = balance + v_old_transaction.amount
    WHERE id = v_old_transaction."accountId";
    UPDATE accounts SET balance = balance - v_old_transaction.amount
    WHERE id = v_old_transaction."toAccountId";
  END IF;

  -- STEP 2: Verify new accounts ownership and get balances
  SELECT * INTO v_source_account
  FROM accounts
  WHERE id = p_account_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Rollback: revert step 1
    IF v_old_transaction.type = 'INCOME' THEN
      UPDATE accounts SET balance = balance + v_old_transaction.amount
      WHERE id = v_old_transaction."accountId";
    ELSIF v_old_transaction.type = 'EXPENSE' THEN
      UPDATE accounts SET balance = balance - v_old_transaction.amount
      WHERE id = v_old_transaction."accountId";
    ELSIF v_old_transaction.type = 'TRANSFER' THEN
      UPDATE accounts SET balance = balance - v_old_transaction.amount
      WHERE id = v_old_transaction."accountId";
      UPDATE accounts SET balance = balance + v_old_transaction.amount
      WHERE id = v_old_transaction."toAccountId";
    END IF;
    
    RETURN json_build_object(
      'success', false,
      'error', 'ACCOUNT_NOT_FOUND',
      'message', 'Source account not found or unauthorized'
    );
  END IF;

  -- Check sufficient balance for new transaction
  IF (p_type = 'EXPENSE' OR p_type = 'TRANSFER') 
     AND v_source_account.balance < p_amount THEN
    -- Rollback step 1
    IF v_old_transaction.type = 'INCOME' THEN
      UPDATE accounts SET balance = balance + v_old_transaction.amount
      WHERE id = v_old_transaction."accountId";
    ELSIF v_old_transaction.type = 'EXPENSE' THEN
      UPDATE accounts SET balance = balance - v_old_transaction.amount
      WHERE id = v_old_transaction."accountId";
    ELSIF v_old_transaction.type = 'TRANSFER' THEN
      UPDATE accounts SET balance = balance - v_old_transaction.amount
      WHERE id = v_old_transaction."accountId";
      UPDATE accounts SET balance = balance + v_old_transaction.amount
      WHERE id = v_old_transaction."toAccountId";
    END IF;
    
    RETURN json_build_object(
      'success', false,
      'error', 'INSUFFICIENT_BALANCE',
      'message', 'Insufficient balance in source account',
      'available', v_source_account.balance,
      'required', p_amount
    );
  END IF;

  -- STEP 3: Apply new transaction effects
  IF p_type = 'INCOME' THEN
    UPDATE accounts SET balance = balance + p_amount
    WHERE id = p_account_id;
  ELSIF p_type = 'EXPENSE' THEN
    UPDATE accounts SET balance = balance - p_amount
    WHERE id = p_account_id;
  ELSIF p_type = 'TRANSFER' THEN
    -- Verify destination account
    SELECT * INTO v_dest_account
    FROM accounts
    WHERE id = p_to_account_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      -- Rollback everything
      IF v_old_transaction.type = 'INCOME' THEN
        UPDATE accounts SET balance = balance + v_old_transaction.amount
        WHERE id = v_old_transaction."accountId";
      ELSIF v_old_transaction.type = 'EXPENSE' THEN
        UPDATE accounts SET balance = balance - v_old_transaction.amount
        WHERE id = v_old_transaction."accountId";
      ELSIF v_old_transaction.type = 'TRANSFER' THEN
        UPDATE accounts SET balance = balance - v_old_transaction.amount
        WHERE id = v_old_transaction."accountId";
        UPDATE accounts SET balance = balance + v_old_transaction.amount
        WHERE id = v_old_transaction."toAccountId";
      END IF;
      
      RETURN json_build_object(
        'success', false,
        'error', 'DESTINATION_NOT_FOUND',
        'message', 'Destination account not found'
      );
    END IF;

    UPDATE accounts SET balance = balance - p_amount WHERE id = p_account_id;
    UPDATE accounts SET balance = balance + p_amount WHERE id = p_to_account_id;
  END IF;

  -- STEP 4: Update transaction record
  UPDATE transactions
  SET type = p_type,
      amount = p_amount,
      "accountId" = p_account_id,
      "categoryId" = p_category_id,
      "toAccountId" = p_to_account_id,
      description = p_description,
      date = p_date,
      updated_at = NOW()
  WHERE id = p_transaction_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Transaction updated successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'DATABASE_ERROR',
      'message', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION update_transaction TO authenticated;

-- ============================================
-- FUNCTION 3: DELETE TRANSACTION
-- ============================================
-- Purpose: Atomically delete transaction and revert balance changes
-- Features:
--   - Revert transaction effects before deletion
--   - Handle TRANSFER type (revert both accounts)
--   - Auto-rollback on error
-- ============================================

CREATE OR REPLACE FUNCTION delete_transaction(
  p_user_id uuid,
  p_transaction_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction record;
  v_source_account record;
BEGIN
  -- Get transaction
  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'TRANSACTION_NOT_FOUND',
      'message', 'Transaction not found'
    );
  END IF;

  -- Verify ownership
  SELECT * INTO v_source_account
  FROM accounts
  WHERE id = v_transaction."accountId" AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'You do not own this transaction'
    );
  END IF;

  -- Revert transaction effects
  IF v_transaction.type = 'INCOME' THEN
    UPDATE accounts SET balance = balance - v_transaction.amount
    WHERE id = v_transaction."accountId";
  ELSIF v_transaction.type = 'EXPENSE' THEN
    UPDATE accounts SET balance = balance + v_transaction.amount
    WHERE id = v_transaction."accountId";
  ELSIF v_transaction.type = 'TRANSFER' THEN
    UPDATE accounts SET balance = balance + v_transaction.amount
    WHERE id = v_transaction."accountId";
    UPDATE accounts SET balance = balance - v_transaction.amount
    WHERE id = v_transaction."toAccountId";
  END IF;

  -- Delete transaction
  DELETE FROM transactions WHERE id = p_transaction_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Transaction deleted successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'DATABASE_ERROR',
      'message', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION delete_transaction TO authenticated;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these queries to verify the functions are created successfully

-- 1. Check if functions exist
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('create_transaction', 'update_transaction', 'delete_transaction')
ORDER BY routine_name;

-- 2. Check function permissions
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name IN ('create_transaction', 'update_transaction', 'delete_transaction')
ORDER BY routine_name, grantee;

-- ============================================
-- TESTING QUERIES (OPTIONAL)
-- ============================================
-- Uncomment and modify these to test the functions

/*
-- Test CREATE transaction (INCOME)
SELECT create_transaction(
  'YOUR_USER_ID'::uuid,           -- Replace with actual user ID
  'INCOME',
  500000,
  'ACCOUNT_ID'::uuid,             -- Replace with actual account ID
  'CATEGORY_ID'::uuid,            -- Replace with actual category ID
  NULL,
  'Test income transaction',
  NOW()
);

-- Test CREATE transaction (EXPENSE)
SELECT create_transaction(
  'YOUR_USER_ID'::uuid,
  'EXPENSE',
  100000,
  'ACCOUNT_ID'::uuid,
  'CATEGORY_ID'::uuid,
  NULL,
  'Test expense transaction',
  NOW()
);

-- Test CREATE transaction (TRANSFER)
SELECT create_transaction(
  'YOUR_USER_ID'::uuid,
  'TRANSFER',
  250000,
  'SOURCE_ACCOUNT_ID'::uuid,
  'TRANSFER_CATEGORY_ID'::uuid,
  'DEST_ACCOUNT_ID'::uuid,
  'Test transfer transaction',
  NOW()
);

-- Test UPDATE transaction
SELECT update_transaction(
  'YOUR_USER_ID'::uuid,
  'TRANSACTION_ID'::uuid,         -- Replace with actual transaction ID
  'EXPENSE',
  150000,
  'ACCOUNT_ID'::uuid,
  'CATEGORY_ID'::uuid,
  NULL,
  'Updated transaction',
  NOW()
);

-- Test DELETE transaction
SELECT delete_transaction(
  'YOUR_USER_ID'::uuid,
  'TRANSACTION_ID'::uuid          -- Replace with actual transaction ID
);
*/

-- ============================================
-- ROLLBACK (IF NEEDED)
-- ============================================
-- Uncomment these if you need to remove the functions

/*
DROP FUNCTION IF EXISTS create_transaction;
DROP FUNCTION IF EXISTS update_transaction;
DROP FUNCTION IF EXISTS delete_transaction;
*/

-- ============================================
-- END OF FILE
-- ============================================
