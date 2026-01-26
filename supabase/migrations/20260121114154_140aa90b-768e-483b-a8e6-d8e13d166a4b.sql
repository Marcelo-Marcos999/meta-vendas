-- Tabela de configuração de metas
CREATE TABLE public.goals_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  min_goal DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_goal DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de feriados
CREATE TABLE public.holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_worked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de vendas diárias
CREATE TABLE public.daily_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  day_of_week TEXT NOT NULL,
  min_goal DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_goal DECIMAL(12,2) NOT NULL DEFAULT 0,
  sales_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (permitir acesso público já que não há autenticação)
ALTER TABLE public.goals_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sales ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para permitir CRUD sem autenticação
CREATE POLICY "Allow public read goals_config" ON public.goals_config FOR SELECT USING (true);
CREATE POLICY "Allow public insert goals_config" ON public.goals_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update goals_config" ON public.goals_config FOR UPDATE USING (true);
CREATE POLICY "Allow public delete goals_config" ON public.goals_config FOR DELETE USING (true);

CREATE POLICY "Allow public read holidays" ON public.holidays FOR SELECT USING (true);
CREATE POLICY "Allow public insert holidays" ON public.holidays FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update holidays" ON public.holidays FOR UPDATE USING (true);
CREATE POLICY "Allow public delete holidays" ON public.holidays FOR DELETE USING (true);

CREATE POLICY "Allow public read daily_sales" ON public.daily_sales FOR SELECT USING (true);
CREATE POLICY "Allow public insert daily_sales" ON public.daily_sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update daily_sales" ON public.daily_sales FOR UPDATE USING (true);
CREATE POLICY "Allow public delete daily_sales" ON public.daily_sales FOR DELETE USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_goals_config_updated_at
  BEFORE UPDATE ON public.goals_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_sales_updated_at
  BEFORE UPDATE ON public.daily_sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();