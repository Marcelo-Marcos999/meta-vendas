-- Remove a constraint única antiga que é apenas na coluna date
ALTER TABLE public.daily_sales DROP CONSTRAINT IF EXISTS daily_sales_date_key;

-- Cria nova constraint única composta (user_id + date)
-- Isso permite que diferentes usuários tenham registros na mesma data
ALTER TABLE public.daily_sales ADD CONSTRAINT daily_sales_user_date_unique UNIQUE (user_id, date);