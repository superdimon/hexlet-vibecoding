import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateBmr,
  calculateTdee,
  calculateTarget,
  calculateMacros,
  calculateProfile,
  portionNutrients,
  totalNutrients,
} from '../js/calories.js';

test('calculateBmr: мужчина по Миффлину — Сан Жеору', () => {
  // 10*80 + 6.25*180 − 5*30 + 5 = 1780
  assert.equal(calculateBmr({ sex: 'male', weight: 80, height: 180, age: 30 }), 1780);
});

test('calculateBmr: женщина по Миффлину — Сан Жеору', () => {
  // 10*60 + 6.25*165 − 5*25 − 161 = 1345.25 → 1345
  assert.equal(calculateBmr({ sex: 'female', weight: 60, height: 165, age: 25 }), 1345);
});

test('calculateBmr: ошибка при некорректных данных', () => {
  assert.throws(() => calculateBmr({ sex: 'other', weight: 80, height: 180, age: 30 }));
  assert.throws(() => calculateBmr({ sex: 'male', weight: -1, height: 180, age: 30 }));
  assert.throws(() => calculateBmr({ sex: 'male', weight: NaN, height: 180, age: 30 }));
});

test('calculateTdee: умножает на коэффициент активности', () => {
  assert.equal(calculateTdee(1780, 'minimal'), 2136);
  assert.equal(calculateTdee(1780, 'moderate'), 2759);
  assert.throws(() => calculateTdee(1780, 'unknown'));
});

test('calculateTarget: учитывает цель', () => {
  assert.equal(calculateTarget(2000, 'lose'), 1700);
  assert.equal(calculateTarget(2000, 'maintain'), 2000);
  assert.equal(calculateTarget(2000, 'gain'), 2300);
  assert.throws(() => calculateTarget(2000, 'unknown'));
});

test('calculateTarget: не опускается ниже безопасного минимума', () => {
  assert.equal(calculateTarget(1300, 'lose'), 1200);
});

test('calculateMacros: раскладка БЖУ для похудения', () => {
  // 2000 ккал: белки 30% / 4 = 150 г, жиры 30% / 9 ≈ 67 г, углеводы 40% / 4 = 200 г
  assert.deepEqual(calculateMacros(2000, 'lose'), { protein: 150, fat: 67, carbs: 200 });
});

test('calculateProfile: сквозной расчёт', () => {
  const result = calculateProfile({
    sex: 'male',
    weight: 80,
    height: 180,
    age: 30,
    activity: 'moderate',
    goal: 'lose',
  });
  assert.equal(result.bmr, 1780);
  assert.equal(result.tdee, 2759);
  assert.equal(result.target, 2345);
  assert.deepEqual(result.macros, { protein: 176, fat: 78, carbs: 235 });
});

test('portionNutrients: пересчитывает на массу порции', () => {
  const chicken = { kcal: 137, protein: 29.8, fat: 1.8, carbs: 0.5 };
  assert.deepEqual(portionNutrients(chicken, 150), {
    kcal: 206,
    protein: 44.7,
    fat: 2.7,
    carbs: 0.8,
  });
});

test('portionNutrients: ошибка при некорректной массе', () => {
  const product = { kcal: 100, protein: 1, fat: 1, carbs: 1 };
  assert.throws(() => portionNutrients(product, 0));
  assert.throws(() => portionNutrients(product, -50));
  assert.throws(() => portionNutrients(product, NaN));
});

test('totalNutrients: суммирует записи дневника', () => {
  const entries = [
    { kcal: 206, protein: 44.7, fat: 2.7, carbs: 0.8 },
    { kcal: 110, protein: 4.2, fat: 1.1, carbs: 21.3 },
  ];
  assert.deepEqual(totalNutrients(entries), {
    kcal: 316,
    protein: 48.9,
    fat: 3.8,
    carbs: 22.1,
  });
});

test('totalNutrients: пустой дневник', () => {
  assert.deepEqual(totalNutrients([]), { kcal: 0, protein: 0, fat: 0, carbs: 0 });
});
