import {
  format,
  eachDayOfInterval,
  parseISO,
  isSaturday,
  isSunday,
  getDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";

/* =====================================================
 * TIPOS
 * ===================================================== */

export interface Holiday {
  date: string;
  isWorked: boolean;
}

export interface DayConfig {
  date: string;
  dayOfWeek: string;
  dayOfWeekShort: string;
  isWeekend: boolean;
  isSaturday: boolean;
  isSunday: boolean;
  isHoliday: boolean;
  holidayWorked: boolean;
  weight: number;
}

export interface DailySaleInput {
  date: string;
  totalSold: number;
  customers: number;
}

/* =====================================================
 * NOMES DOS DIAS
 * ===================================================== */

const dayNames: Record<number, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

const dayNamesShort: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

/* =====================================================
 * CONFIGURAÇÃO DOS DIAS
 * ===================================================== */

export function getDayConfig(date: Date, holidays: Holiday[]): DayConfig {
  const dateStr = format(date, "yyyy-MM-dd");
  const dayNum = getDay(date);
  const holiday = holidays.find((h) => h.date === dateStr);

  const isSat = isSaturday(date);
  const isSun = isSunday(date);
  const isHoliday = !!holiday;
  const holidayWorked = holiday?.isWorked ?? false;

  let weight = 1;

  if (isSun) weight = 0;
  else if (isHoliday) weight = holidayWorked ? 0.5 : 0;
  else if (isSat) weight = 0.5;

  return {
    date: dateStr,
    dayOfWeek: dayNames[dayNum],
    dayOfWeekShort: dayNamesShort[dayNum],
    isWeekend: isSat || isSun,
    isSaturday: isSat,
    isSunday: isSun,
    isHoliday,
    holidayWorked,
    weight,
  };
}

export function generateWorkDays(
  startDate: string,
  endDate: string,
  holidays: Holiday[]
): DayConfig[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  return eachDayOfInterval({ start, end }).map((day) =>
    getDayConfig(day, holidays)
  );
}

/* =====================================================
 * META MÁXIMA DINÂMICA (REGRA FINAL)
 * ===================================================== */

export function calculateDynamicDailyMaxGoal(
  workDays: DayConfig[],
  monthlyMaxGoal: number,
  salesHistory: DailySaleInput[],
  currentDate: string
) {
  const workedDays = workDays.filter((d) => d.weight > 0);

  const totalWeight = workedDays.reduce(
    (sum, d) => sum + d.weight,
    0
  );

  const baseDailyGoal = monthlyMaxGoal / totalWeight;

  const effectiveSales = salesHistory.filter(
    (s) => s.date < currentDate && s.totalSold > 0
  );

  if (effectiveSales.length === 0) {
    return {
      dailyMaxGoal: Math.round(baseDailyGoal * 100) / 100,
    };
  }

  const soldSoFar = effectiveSales.reduce(
    (sum, s) => sum + s.totalSold,
    0
  );

  const remainingGoal = monthlyMaxGoal - soldSoFar;

  const remainingDays = workedDays.filter(
    (d) => d.date >= currentDate
  );

  const remainingWeight = remainingDays.reduce(
    (sum, d) => sum + d.weight,
    0
  );

  const today = remainingDays.find(
    (d) => d.date === currentDate
  );

  if (!today || remainingWeight === 0) {
    return { dailyMaxGoal: 0 };
  }

  const dailyMaxGoal =
    (remainingGoal / remainingWeight) * today.weight;

  return {
    dailyMaxGoal: Math.round(dailyMaxGoal * 100) / 100,
  };
}

/* =====================================================
 * TICKET IDEAL (1º DIA INCLUSO)
 * ===================================================== */

export function calculateIdealTicket(
  dailyMaxGoal: number,
  salesHistory: DailySaleInput[],
  currentDate: string,
  todayCustomers: number
): number | null {
  if (todayCustomers > 0) {
    return Math.round(
      (dailyMaxGoal / todayCustomers) * 100
    ) / 100;
  }

  const history = salesHistory.filter(
    (s) => s.date < currentDate && s.customers > 0
  );

  if (!history.length) return null;

  const avgCustomers =
    history.reduce((sum, s) => sum + s.customers, 0) /
    history.length;

  return Math.round(
    (dailyMaxGoal / avgCustomers) * 100
  ) / 100;
}


/* =====================================================
 * FORMATADORES
 * ===================================================== */

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MM", { locale: ptBR });
}

export function formatFullDate(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MM/yyyy", {
    locale: ptBR,
  });
}


/* =====================================================
 * RECÁLCULO COMPLETO DAS METAS DIÁRIAS
 * ===================================================== */

export interface RecalculatedDailyGoal {
  date: string;
  dayOfWeek: string;
  dayOfWeekShort: string;
  minGoal: number;
  maxGoal: number;
}

// nova versão: calcula metas levando em conta vendas já realizadas
export interface DailySaleInputExt {
  date: string;
  totalSold: number; // já convertido para número
  customers?: number;
  // se seu objeto "sale" já traz minGoal/maxGoal salvos no DB, inclua aqui:
  minGoal?: number | string;
  maxGoal?: number | string;
}

export function calculateDailyGoals(
  workDays: DayConfig[],
  totalMinGoal: number,
  totalMaxGoal: number,
  salesHistory: DailySaleInputExt[]
): { date: string; dayOfWeek: string; minGoal: number; maxGoal: number }[] {
  // 1) dias válidos (só os que contam)
  const validDays = workDays.filter((d) => d.weight > 0)
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

  if (!validDays.length) return [];

  // 2) mapa de vendas por data (totalSold) e valores atuais de min/max se existirem
  const saleMap = new Map<string, DailySaleInputExt>();
  salesHistory.forEach((s) => {
    saleMap.set(s.date, {
      date: s.date,
      totalSold: Number(s.totalSold ?? 0),
      customers: s.customers,
      minGoal: (s as any).minGoal,
      maxGoal: (s as any).maxGoal,
    });
  });

  // 3) Soma total vendida até agora (todas as datas)
  const totalSoldSoFar = Array.from(saleMap.values()).reduce(
    (sum, s) => sum + (Number(s.totalSold) || 0),
    0
  );

  // 4) Calcula quanto ainda falta para cada meta (valor a distribuir)
  const remainingMinTotal = Math.max(0, totalMinGoal - totalSoldSoFar);
  const remainingMaxTotal = Math.max(0, totalMaxGoal - totalSoldSoFar);

  // 5) Determina os dias *sem venda*, que são os que vamos recacular/redistribuir
  const remainingDays = validDays.filter(
    (d) => (saleMap.get(d.date)?.totalSold ?? 0) === 0
  );

  // Se não há dias restantes, retornamos os dados atuais (preservando min/max do map quando existir)
  if (remainingDays.length === 0) {
    return validDays.map((d) => {
      const s = saleMap.get(d.date);
      return {
        date: d.date,
        dayOfWeek: d.dayOfWeekShort,
        minGoal: s && s.minGoal !== undefined ? Number(s.minGoal) : 0,
        maxGoal: s && s.maxGoal !== undefined ? Number(s.maxGoal) : 0,
      };
    });
  }

  const remainingWeight = remainingDays.reduce((sum, d) => sum + d.weight, 0);

  // 6) Distribui o restante proporcionalmente ao weight apenas entre remainingDays
  //    e preserva min/max das datas que já tem venda (se existirem no saleMap).
  //    Faz ajuste no último dia para corrigir erro por arredondamento.
  const resultsMap = new Map<string, { minGoal: number; maxGoal: number }>();

  // Distribuição inicial (com 2 casas decimais)
  let assignedMinSum = 0;
  let assignedMaxSum = 0;

  for (let i = 0; i < remainingDays.length; i++) {
    const day = remainingDays[i];

    const rawMin =
      remainingWeight > 0 ? (remainingMinTotal / remainingWeight) * day.weight : 0;
    const rawMax =
      remainingWeight > 0 ? (remainingMaxTotal / remainingWeight) * day.weight : 0;

    // arredonda para centavos
    let minGoal = Math.round(rawMin * 100) / 100;
    let maxGoal = Math.round(rawMax * 100) / 100;

    // se for o último dia restante, corrige o residual para garantir soma == remainingTotal
    if (i === remainingDays.length - 1) {
      const remMinResidual = Math.round((remainingMinTotal - assignedMinSum) * 100) / 100;
      const remMaxResidual = Math.round((remainingMaxTotal - assignedMaxSum) * 100) / 100;
      minGoal = Math.max(0, remMinResidual);
      maxGoal = Math.max(0, remMaxResidual);
    }

    assignedMinSum += minGoal;
    assignedMaxSum += maxGoal;

    resultsMap.set(day.date, { minGoal, maxGoal });
  }

  // 7) Monta o array final:
  //    - para dias com venda: preserva min/max do saleMap (se existir), senão coloca 0
  //    - para dias sem venda: usa o valor calculado em resultsMap
  const final = validDays.map((d) => {
    const sale = saleMap.get(d.date);
    if (sale && (Number(sale.totalSold) || 0) > 0) {
      // se o DB já tem min/max salvos, prefira esses; caso contrário retornar 0
      const minG = sale.minGoal !== undefined ? Number(sale.minGoal) : 0;
      const maxG = sale.maxGoal !== undefined ? Number(sale.maxGoal) : 0;
      return {
        date: d.date,
        dayOfWeek: d.dayOfWeekShort,
        minGoal: Math.round(minG * 100) / 100,
        maxGoal: Math.round(maxG * 100) / 100,
      };
    } else {
      const r = resultsMap.get(d.date) ?? { minGoal: 0, maxGoal: 0 };
      return {
        date: d.date,
        dayOfWeek: d.dayOfWeekShort,
        minGoal: Math.round(r.minGoal * 100) / 100,
        maxGoal: Math.round(r.maxGoal * 100) / 100,
      };
    }
  });

  return final;
}
