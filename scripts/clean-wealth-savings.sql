-- Remove all wealth savings rows only (safe to run in pgAdmin).
-- Does NOT affect wealth_transactions or any other tables.

DELETE FROM wealth_savings;

-- Optional: reset if you use a serial/sequence (wealth_savings uses UUID, so not required).
