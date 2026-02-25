// המרת תאריך לועזי לעברי - אלגוריתם Dershowitz-Reingold
const EPOCH = -1373427; // RD של א' תשרי שנה א'

const isLeapYear = y => ((7 * y + 1) % 19) < 7;

function elapsedDays(year) {
  const m = Math.floor((235 * year - 234) / 19);
  const p = 12084 + 13753 * m;
  let d = m * 29 + Math.floor(p / 25920);
  if ((3 * (d + 1)) % 7 < 3) d++;
  return d;
}

function newYear(year) {
  const d0 = elapsedDays(year - 1);
  const d1 = elapsedDays(year);
  const d2 = elapsedDays(year + 1);
  return EPOCH + d1 + (d2 - d1 === 356 ? 2 : d1 - d0 === 382 ? 1 : 0);
}

function yearLen(year) {
  return newYear(year + 1) - newYear(year);
}

function monthDays(m, year) {
  if ([1, 3, 5, 7, 11].includes(m)) return 30;
  if (m === 8) return yearLen(year) % 10 === 5 ? 30 : 29;
  if (m === 9) return yearLen(year) % 10 === 3 ? 29 : 30;
  if (m === 12) return isLeapYear(year) ? 30 : 29;
  return 29;
}

function fixedFromGregorian(y, m, d) {
  const leap = y => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  return 365 * (y - 1) + Math.floor((y - 1) / 4) - Math.floor((y - 1) / 100) +
    Math.floor((y - 1) / 400) + Math.floor((367 * m - 362) / 12) +
    (m <= 2 ? 0 : leap(y) ? -1 : -2) + d;
}

function fromFixed(fixed) {
  let year = Math.floor((fixed - EPOCH) / 365.2468);
  while (newYear(year + 1) <= fixed) year++;
  while (newYear(year) > fixed) year--;

  const months = isLeapYear(year)
    ? [7, 8, 9, 10, 11, 12, 13, 1, 2, 3, 4, 5, 6]
    : [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];

  let offset = fixed - newYear(year);
  for (const mo of months) {
    const days = monthDays(mo, year);
    if (offset < days) return { year, month: mo, day: offset + 1 };
    offset -= days;
  }
  return { year, month: 6, day: offset + 1 };
}

const MONTH_NAMES = {
  1: 'ניסן', 2: 'אייר', 3: 'סיוון', 4: 'תמוז', 5: 'אב', 6: 'אלול',
  7: 'תשרי', 8: 'חשוון', 9: 'כסלו', 10: 'טבת', 11: 'שבט', 12: 'אדר', 13: 'אדר ב׳',
};

export function toHebrewDate(jsDate) {
  // שימוש בתאריך IST (לא תלוי בשעון המכשיר)
  const ist = jsDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
  const [y, m, d] = ist.split('-').map(Number);
  const fixed = fixedFromGregorian(y, m, d);
  const { year, month, day } = fromFixed(fixed);
  const monthName = (month === 12 && isLeapYear(year)) ? 'אדר א׳' : MONTH_NAMES[month];
  return { year, month, day, monthName };
}
