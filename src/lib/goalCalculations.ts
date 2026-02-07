import { format, eachDayOfInterval, parseISO, isSaturday, isSunday, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface Holiday {
  date: string;
  is_worked: boolean;
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
  weight: number; // 0 = não conta, 0.5 = meio dia, 1 = dia cheio
}

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

export function getDayConfig(date: Date, holidays: Holiday[]): DayConfig {
  const dateStr = format(date, "yyyy-MM-dd");
  const dayNum = getDay(date);
  const holiday = holidays.find((h) => h.date === dateStr);

  const isSat = isSaturday(date);
  const isSun = isSunday(date);
  const isHoliday = !!holiday;
  const holidayWorked = holiday?.is_worked ?? false;

  let weight = 1;
  if (isSun) {
    weight = 0; // Domingo não trabalha
  } else if (isHoliday) {
    if (holidayWorked) {
      weight = 0.5; // Feriado trabalhado = metade
    } else {
      weight = 0; // Feriado não trabalhado = abatido
    }
  } else if (isSat) {
    weight = 0.5; // Sábado = metade
  }

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
  const days = eachDayOfInterval({ start, end });

  return days.map((day) => getDayConfig(day, holidays));
}

export function calculateDailyGoals(
  workDays: DayConfig[],
  minGoal: number,
  maxGoal: number
): { date: string; dayOfWeek: string; minGoal: number; maxGoal: number }[] {
  const totalWeight = workDays.reduce((sum, day) => sum + day.weight, 0);

  if (totalWeight === 0) return [];

  const minPerWeight = minGoal / totalWeight;
  const maxPerWeight = maxGoal / totalWeight;

  return workDays
    .filter((day) => day.weight > 0)
    .map((day) => ({
      date: day.date,
      dayOfWeek: day.dayOfWeekShort,
      minGoal: Math.round(minPerWeight * day.weight * 100) / 100,
      maxGoal: Math.round(maxPerWeight * day.weight * 100) / 100,
    }));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
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

export function calculateDailyGoals(
  workDays: DayConfig[],
  totalMinGoal: number,
  totalMaxGoal: number,
  salesHistory: DailySaleInput[]
): RecalculatedDailyGoal[] {
  // Apenas dias que contam no cálculo
  const validDays = workDays
    .filter((d) => d.weight > 0)
    .sort(
      (a, b) =>
        parseISO(a.date).getTime() -
        parseISO(b.date).getTime()
    );

  const salesMap = new Map<string, number>();
  salesHistory.forEach((s) =>
    salesMap.set(s.date, s.totalSold)
  );

  const results: RecalculatedDailyGoal[] = [];

  let accumulatedSales = 0;

  for (let i = 0; i < validDays.length; i++) {
    const day = validDays[i];
    const soldToday = salesMap.get(day.date) ?? 0;

    const remainingMin = Math.max(
      0,
      totalMinGoal - accumulatedSales
    );
    const remainingMax = Math.max(
      0,
      totalMaxGoal - accumulatedSales
    );

    const remainingDays = validDays.slice(i);
    const remainingWeight = remainingDays.reduce(
      (sum, d) => sum + d.weight,
      0
    );

    let minGoal = 0;
    let maxGoal = 0;

    if (remainingWeight > 0) {
      minGoal =
        (remainingMin / remainingWeight) * day.weight;
      maxGoal =
        (remainingMax / remainingWeight) * day.weight;
    }

    results.push({
      date: day.date,
      dayOfWeek: day.dayOfWeek,
      dayOfWeekShort: day.dayOfWeekShort,
      minGoal: Math.round(minGoal * 100) / 100,
      maxGoal: Math.round(maxGoal * 100) / 100,
    });

    if (soldToday > 0) {
      accumulatedSales += soldToday;
    }
  }

  return results;
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MM", { locale: ptBR });
}

export function formatFullDate(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
}
