// Расчёт калорийности: базовый метаболизм, суточная норма, БЖУ.
// Модуль без зависимостей — используется и в браузере, и в тестах (node --test).

export const ACTIVITY_LEVELS = {
  minimal: { label: 'Минимальная (сидячая работа)', factor: 1.2 },
  light: { label: 'Лёгкая (тренировки 1–3 раза в неделю)', factor: 1.375 },
  moderate: { label: 'Средняя (тренировки 3–5 раз в неделю)', factor: 1.55 },
  high: { label: 'Высокая (тренировки 6–7 раз в неделю)', factor: 1.725 },
  extreme: { label: 'Экстремальная (тяжёлая физическая работа)', factor: 1.9 },
};

export const GOALS = {
  lose: { label: 'Похудение', factor: 0.85 },
  maintain: { label: 'Поддержание веса', factor: 1 },
  gain: { label: 'Набор массы', factor: 1.15 },
};

// Доли макронутриентов от целевой калорийности.
const MACRO_SPLIT = {
  lose: { protein: 0.3, fat: 0.3, carbs: 0.4 },
  maintain: { protein: 0.25, fat: 0.3, carbs: 0.45 },
  gain: { protein: 0.25, fat: 0.25, carbs: 0.5 },
};

const KCAL_PER_GRAM = { protein: 4, fat: 9, carbs: 4 };

// Ниже этого порога суточную норму не опускаем.
const MIN_DAILY_KCAL = 1200;

// Базовый метаболизм по формуле Миффлина — Сан Жеора.
// weight — кг, height — см, age — лет.
export function calculateBmr({ sex, weight, height, age }) {
  if (!['male', 'female'].includes(sex)) {
    throw new Error(`Неизвестный пол: ${sex}`);
  }
  if (![weight, height, age].every((n) => Number.isFinite(n) && n > 0)) {
    throw new Error('Вес, рост и возраст должны быть положительными числами');
  }

  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

// Суточный расход с учётом активности.
export function calculateTdee(bmr, activity) {
  const level = ACTIVITY_LEVELS[activity];
  if (!level) {
    throw new Error(`Неизвестный уровень активности: ${activity}`);
  }
  return Math.round(bmr * level.factor);
}

// Целевая калорийность с учётом цели, не ниже безопасного минимума.
export function calculateTarget(tdee, goal) {
  const goalInfo = GOALS[goal];
  if (!goalInfo) {
    throw new Error(`Неизвестная цель: ${goal}`);
  }
  return Math.max(Math.round(tdee * goalInfo.factor), MIN_DAILY_KCAL);
}

// Граммы белков/жиров/углеводов для целевой калорийности.
export function calculateMacros(targetKcal, goal) {
  const split = MACRO_SPLIT[goal];
  if (!split) {
    throw new Error(`Неизвестная цель: ${goal}`);
  }
  return {
    protein: Math.round((targetKcal * split.protein) / KCAL_PER_GRAM.protein),
    fat: Math.round((targetKcal * split.fat) / KCAL_PER_GRAM.fat),
    carbs: Math.round((targetKcal * split.carbs) / KCAL_PER_GRAM.carbs),
  };
}

// Полный расчёт: от анкеты до нормы и БЖУ.
export function calculateProfile({ sex, weight, height, age, activity, goal }) {
  const bmr = calculateBmr({ sex, weight, height, age });
  const tdee = calculateTdee(bmr, activity);
  const target = calculateTarget(tdee, goal);
  return { bmr, tdee, target, macros: calculateMacros(target, goal) };
}

// Пищевая ценность порции: product — на 100 г, grams — размер порции.
export function portionNutrients(product, grams) {
  if (!Number.isFinite(grams) || grams <= 0) {
    throw new Error('Масса порции должна быть положительным числом');
  }
  const ratio = grams / 100;
  return {
    kcal: Math.round(product.kcal * ratio),
    protein: Math.round(product.protein * ratio * 10) / 10,
    fat: Math.round(product.fat * ratio * 10) / 10,
    carbs: Math.round(product.carbs * ratio * 10) / 10,
  };
}

// Итог по списку съеденного за день.
export function totalNutrients(entries) {
  const sum = entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      protein: acc.protein + e.protein,
      fat: acc.fat + e.fat,
      carbs: acc.carbs + e.carbs,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  );
  return {
    kcal: Math.round(sum.kcal),
    protein: Math.round(sum.protein * 10) / 10,
    fat: Math.round(sum.fat * 10) / 10,
    carbs: Math.round(sum.carbs * 10) / 10,
  };
}
