-- Adicionar coluna user_id às tabelas existentes
ALTER TABLE public.daily_sales 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.goals_config 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.holidays 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Remover políticas RLS antigas (públicas)
DROP POLICY IF EXISTS "Allow public read daily_sales" ON public.daily_sales;
DROP POLICY IF EXISTS "Allow public insert daily_sales" ON public.daily_sales;
DROP POLICY IF EXISTS "Allow public update daily_sales" ON public.daily_sales;
DROP POLICY IF EXISTS "Allow public delete daily_sales" ON public.daily_sales;

DROP POLICY IF EXISTS "Allow public read goals_config" ON public.goals_config;
DROP POLICY IF EXISTS "Allow public insert goals_config" ON public.goals_config;
DROP POLICY IF EXISTS "Allow public update goals_config" ON public.goals_config;
DROP POLICY IF EXISTS "Allow public delete goals_config" ON public.goals_config;

DROP POLICY IF EXISTS "Allow public read holidays" ON public.holidays;
DROP POLICY IF EXISTS "Allow public insert holidays" ON public.holidays;
DROP POLICY IF EXISTS "Allow public update holidays" ON public.holidays;
DROP POLICY IF EXISTS "Allow public delete holidays" ON public.holidays;

-- Criar novas políticas RLS baseadas em user_id

-- daily_sales
CREATE POLICY "Users can view their own daily_sales" 
ON public.daily_sales FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily_sales" 
ON public.daily_sales FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily_sales" 
ON public.daily_sales FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily_sales" 
ON public.daily_sales FOR DELETE 
USING (auth.uid() = user_id);

-- goals_config
CREATE POLICY "Users can view their own goals_config" 
ON public.goals_config FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals_config" 
ON public.goals_config FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals_config" 
ON public.goals_config FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals_config" 
ON public.goals_config FOR DELETE 
USING (auth.uid() = user_id);

-- holidays
CREATE POLICY "Users can view their own holidays" 
ON public.holidays FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own holidays" 
ON public.holidays FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own holidays" 
ON public.holidays FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own holidays" 
ON public.holidays FOR DELETE 
USING (auth.uid() = user_id);