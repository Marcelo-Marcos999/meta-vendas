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


export function calculateDailyGoals(workDays: DayConfig[], arg1: number, arg2: number) {
    throw new Error("Function not implemented.");
}
