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

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MM", { locale: ptBR });
}

export function formatFullDate(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
}
