-- Add personal|farm scope (+ optional meta) to wealth tables.
-- Safe for Postgres. Existing rows default to personal.

ALTER TABLE wealth_transactions
  ADD COLUMN IF NOT EXISTS scope varchar(16) NOT NULL DEFAULT 'personal';

ALTER TABLE wealth_transactions
  ADD COLUMN IF NOT EXISTS meta jsonb NULL;

ALTER TABLE wealth_category_budgets
  ADD COLUMN IF NOT EXISTS scope varchar(16) NOT NULL DEFAULT 'personal';

CREATE INDEX IF NOT EXISTS idx_wealth_tx_user_scope_date
  ON wealth_transactions (user_id, scope, date);

-- Drop legacy unique index if present, then recreate with scope.
DROP INDEX IF EXISTS "IDX_wealth_category_budgets_user_id_category_period_type_year_month";

CREATE UNIQUE INDEX IF NOT EXISTS idx_wealth_budgets_scope_unique
  ON wealth_category_budgets (user_id, scope, category, period_type, year, month);
