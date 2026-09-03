/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * US Equity Trading Calendar (NYSE & NASDAQ)
 *
 * Implements the official NYSE Rule 7.2 trading calendar including:
 * - All official holidays (New Year's Day, MLK Day, Presidents' Day, Good Friday,
 *   Memorial Day, Juneteenth, Independence Day, Labor Day, Thanksgiving, Christmas).
 * - Proper weekend rollover rules (Sunday holiday -> observed Monday; Saturday holiday -> observed Friday).
 * - Exact Good Friday computation via Meeus/Jones/Butcher Gregorian Easter algorithm.
 * - Early close sessions (closes at 1:00 PM ET = 13:00 ET on day before 4th of July if weekday,
 *   Black Friday, and Christmas Eve if weekday).
 * - Exact America/New_York timezone resolution via Intl.DateTimeFormat.
 */

export interface UsMarketHoursStatus {
  isOpen: boolean;
  sessionType: 'REGULAR' | 'EARLY_CLOSE' | 'PRE_MARKET' | 'AFTER_HOURS' | 'CLOSED_HOLIDAY' | 'CLOSED_WEEKEND' | 'CLOSED';
  statusLabel: string;
  badgeColor: 'emerald' | 'amber' | 'slate';
  detail: string;
  easternTimeFormatted: string;
  nextEventLabel: string;
  isEarlyClose?: boolean;
  holidayName?: string;
  closeTimeLabel?: string;
}

/**
 * Computes Easter Sunday for any Gregorian calendar year using the Meeus/Jones/Butcher algorithm.
 */
function getEasterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/**
 * Computes Good Friday (2 days before Easter Sunday).
 */
function getGoodFriday(year: number): { month: number; day: number } {
  const easter = getEasterSunday(year);
  const easterDate = new Date(Date.UTC(year, easter.month - 1, easter.day));
  easterDate.setUTCDate(easterDate.getUTCDate() - 2);
  return { month: easterDate.getUTCMonth() + 1, day: easterDate.getUTCDate() };
}

/**
 * Finds the Nth occurrence of a weekday in a given month (1-based index).
 * weekday: 0=Sun, 1=Mon, ..., 6=Sat
 */
function getNthWeekdayOfMonth(year: number, month: number, targetWeekday: number, n: number): number {
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCMonth() !== month - 1) break;
    if (d.getUTCDay() === targetWeekday) {
      count++;
      if (count === n) return day;
    }
  }
  return 1;
}

/**
 * Finds the last occurrence of a weekday in a given month.
 */
function getLastWeekdayOfMonth(year: number, month: number, targetWeekday: number): number {
  for (let day = 31; day >= 20; day--) {
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCMonth() === month - 1 && d.getUTCDay() === targetWeekday) {
      return day;
    }
  }
  return 25;
}

/**
 * Computes observed date for fixed holidays (New Year's, Juneteenth, July 4, Dec 25).
 * NYSE Rule 7.2:
 * - If falls on Sunday, observed on following Monday.
 * - If falls on Saturday, observed on preceding Friday.
 */
function getObservedHoliday(year: number, month: number, day: number): { month: number; day: number } {
  const d = new Date(Date.UTC(year, month - 1, day));
  const weekday = d.getUTCDay();
  if (weekday === 0) { // Sunday -> Monday
    const obs = new Date(Date.UTC(year, month - 1, day + 1));
    return { month: obs.getUTCMonth() + 1, day: obs.getUTCDate() };
  }
  if (weekday === 6) { // Saturday -> Friday
    const obs = new Date(Date.UTC(year, month - 1, day - 1));
    return { month: obs.getUTCMonth() + 1, day: obs.getUTCDate() };
  }
  return { month, day };
}

export interface HolidayCheckResult {
  isHoliday: boolean;
  holidayName?: string;
  isEarlyClose?: boolean;
  earlyCloseReason?: string;
}

/**
 * Checks if a specific New York date is an official US market holiday or an early close session.
 */
export function checkUsMarketHoliday(year: number, month: number, day: number): HolidayCheckResult {
  // 1. New Year's Day (Jan 1)
  const nyObs = getObservedHoliday(year, 1, 1);
  if (month === nyObs.month && day === nyObs.day) {
    return { isHoliday: true, holidayName: "New Year's Day" };
  }

  // 2. Martin Luther King, Jr. Day (3rd Monday in January)
  const mlkDay = getNthWeekdayOfMonth(year, 1, 1, 3);
  if (month === 1 && day === mlkDay) {
    return { isHoliday: true, holidayName: 'Martin Luther King, Jr. Day' };
  }

  // 3. Washington's Birthday / Presidents' Day (3rd Monday in February)
  const presDay = getNthWeekdayOfMonth(year, 2, 1, 3);
  if (month === 2 && day === presDay) {
    return { isHoliday: true, holidayName: "Washington's Birthday (Presidents' Day)" };
  }

  // 4. Good Friday
  const goodFriday = getGoodFriday(year);
  if (month === goodFriday.month && day === goodFriday.day) {
    return { isHoliday: true, holidayName: 'Good Friday' };
  }

  // 5. Memorial Day (Last Monday in May)
  const memDay = getLastWeekdayOfMonth(year, 5, 1);
  if (month === 5 && day === memDay) {
    return { isHoliday: true, holidayName: 'Memorial Day' };
  }

  // 6. Juneteenth National Independence Day (June 19)
  const juneObs = getObservedHoliday(year, 6, 19);
  if (month === juneObs.month && day === juneObs.day) {
    return { isHoliday: true, holidayName: 'Juneteenth National Independence Day' };
  }

  // 7. Independence Day (July 4)
  const july4Obs = getObservedHoliday(year, 7, 4);
  if (month === july4Obs.month && day === july4Obs.day) {
    return { isHoliday: true, holidayName: 'Independence Day (July 4th)' };
  }

  // 8. Labor Day (1st Monday in September)
  const laborDay = getNthWeekdayOfMonth(year, 9, 1, 1);
  if (month === 9 && day === laborDay) {
    return { isHoliday: true, holidayName: 'Labor Day' };
  }

  // 9. Thanksgiving Day (4th Thursday in November)
  const thxDay = getNthWeekdayOfMonth(year, 11, 4, 4);
  if (month === 11 && day === thxDay) {
    return { isHoliday: true, holidayName: 'Thanksgiving Day' };
  }

  // 10. Christmas Day (December 25)
  const xmasObs = getObservedHoliday(year, 12, 25);
  if (month === xmasObs.month && day === xmasObs.day) {
    return { isHoliday: true, holidayName: 'Christmas Day' };
  }

  // --- EARLY CLOSE SESSIONS (Closes at 1:00 PM ET = 13:00 ET) ---
  // A. Day after Thanksgiving (Black Friday - 4th Friday in November = thxDay + 1)
  if (month === 11 && day === thxDay + 1) {
    return { isHoliday: false, isEarlyClose: true, earlyCloseReason: 'Black Friday (Early Close at 1:00 PM ET)' };
  }

  // B. Christmas Eve (Dec 24) when falling on a weekday
  if (month === 12 && day === 24) {
    const d24 = new Date(Date.UTC(year, 11, 24));
    const dow = d24.getUTCDay();
    if (dow >= 1 && dow <= 5) {
      return { isHoliday: false, isEarlyClose: true, earlyCloseReason: 'Christmas Eve (Early Close at 1:00 PM ET)' };
    }
  }

  // C. Day before Independence Day (July 3) when July 4 is weekday
  if (month === 7 && day === 3) {
    const d3 = new Date(Date.UTC(year, 6, 3));
    const dow = d3.getUTCDay();
    if (dow >= 1 && dow <= 5) {
      return { isHoliday: false, isEarlyClose: true, earlyCloseReason: 'Independence Day Eve (Early Close at 1:00 PM ET)' };
    }
  }

  return { isHoliday: false, isEarlyClose: false };
}

/**
 * Computes exact US Equities (NYSE / NASDAQ) market hours status.
 * Regular trading session: Monday through Friday, 09:30 AM to 04:00 PM Eastern Time (America/New_York).
 * Early-close session: 09:30 AM to 01:00 PM Eastern Time.
 */
export function getUsMarketHoursStatus(date: Date = new Date()): UsMarketHoursStatus {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  parts.forEach(p => {
    partMap[p.type] = p.value;
  });

  const weekday = partMap.weekday; // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  const year = parseInt(partMap.year, 10);
  const month = parseInt(partMap.month, 10);
  const day = parseInt(partMap.day, 10);
  const hour = parseInt(partMap.hour, 10);
  const minute = parseInt(partMap.minute, 10);
  const totalMinutes = hour * 60 + minute;

  const isWeekend = weekday === 'Sat' || weekday === 'Sun';
  const timeStringET = `${partMap.hour}:${partMap.minute} ET (${weekday})`;

  if (isWeekend) {
    return {
      isOpen: false,
      sessionType: 'CLOSED_WEEKEND',
      statusLabel: 'Market Closed (Weekend)',
      badgeColor: 'amber',
      detail: 'On-chain 24/7 token quote active — underlying NYSE/NASDAQ equity market opens Monday at 9:30 AM ET.',
      easternTimeFormatted: timeStringET,
      nextEventLabel: 'Opens Monday 9:30 AM ET'
    };
  }

  const holidayCheck = checkUsMarketHoliday(year, month, day);

  if (holidayCheck.isHoliday) {
    return {
      isOpen: false,
      sessionType: 'CLOSED_HOLIDAY',
      holidayName: holidayCheck.holidayName,
      statusLabel: `Market Closed (${holidayCheck.holidayName})`,
      badgeColor: 'amber',
      detail: `US equity exchanges are closed today for ${holidayCheck.holidayName}. On-chain xStock tokens continue 24/7 secondary quoting.`,
      easternTimeFormatted: timeStringET,
      nextEventLabel: 'Opens next business day 9:30 AM ET'
    };
  }

  const isEarlyClose = Boolean(holidayCheck.isEarlyClose);
  const marketOpenMinutes = 9 * 60 + 30; // 09:30 ET
  const marketCloseMinutes = isEarlyClose ? (13 * 60) : (16 * 60); // 13:00 ET (1:00 PM) or 16:00 ET (4:00 PM)
  const closeTimeLabel = isEarlyClose ? '1:00 PM ET' : '4:00 PM ET';

  // Pre-market session (04:00 to 09:30 ET)
  if (totalMinutes < marketOpenMinutes) {
    const minsUntilOpen = marketOpenMinutes - totalMinutes;
    const hoursUntil = Math.floor(minsUntilOpen / 60);
    const minsRem = minsUntilOpen % 60;
    const isPreMarket = totalMinutes >= 4 * 60;
    return {
      isOpen: false,
      sessionType: isPreMarket ? 'PRE_MARKET' : 'CLOSED',
      isEarlyClose,
      closeTimeLabel,
      statusLabel: isPreMarket ? 'US Equities Pre-Market' : 'Market Closed (Overnight)',
      badgeColor: 'amber',
      detail: isEarlyClose
        ? `Early-close trading day (${holidayCheck.earlyCloseReason}). Primary session begins at 9:30 AM ET.`
        : 'On-chain 24/7 token quote active — underlying NYSE/NASDAQ opens at 9:30 AM ET.',
      easternTimeFormatted: timeStringET,
      nextEventLabel: `Opens in ${hoursUntil > 0 ? `${hoursUntil}h ` : ''}${minsRem}m`
    };
  }

  // Active regular / early-close market session
  if (totalMinutes >= marketOpenMinutes && totalMinutes < marketCloseMinutes) {
    const minsUntilClose = marketCloseMinutes - totalMinutes;
    const hoursUntil = Math.floor(minsUntilClose / 60);
    const minsRem = minsUntilClose % 60;
    return {
      isOpen: true,
      sessionType: isEarlyClose ? 'EARLY_CLOSE' : 'REGULAR',
      isEarlyClose,
      closeTimeLabel,
      statusLabel: isEarlyClose ? 'US Equities Market Open (Early Close Session)' : 'US Equities Market Open',
      badgeColor: 'emerald',
      detail: isEarlyClose
        ? `Early-close session active (${holidayCheck.earlyCloseReason}). Equities trade until 1:00 PM ET.`
        : 'Live NYSE/NASDAQ session active. Primary equities & on-chain tokens trading in sync.',
      easternTimeFormatted: timeStringET,
      nextEventLabel: `Closes in ${hoursUntil > 0 ? `${hoursUntil}h ` : ''}${minsRem}m (${closeTimeLabel})`
    };
  }

  // After-hours session
  const afterHoursEndMinutes = isEarlyClose ? (17 * 60) : (20 * 60); // 17:00 ET or 20:00 ET
  const isAfterHours = totalMinutes < afterHoursEndMinutes;

  return {
    isOpen: false,
    sessionType: isAfterHours ? 'AFTER_HOURS' : 'CLOSED',
    isEarlyClose,
    closeTimeLabel,
    statusLabel: isAfterHours ? 'Market Closed — After-Hours' : 'Market Closed (Overnight)',
    badgeColor: 'amber',
    detail: 'On-chain 24/7 token quote active — underlying equity trading resumes next business day at 9:30 AM ET.',
    easternTimeFormatted: timeStringET,
    nextEventLabel: 'Opens next business day 9:30 AM ET'
  };
}

/**
 * High-performance timestamp-based NYSE market hour checker.
 * Checks whether a Unix timestamp (ms) falls within active NYSE trading hours,
 * taking into account weekends, all official NYSE holidays, and 1:00 PM ET early-close sessions.
 */
export function isNyseMarketHour(timestamp: number): boolean {
  const date = new Date(timestamp);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric'
  });

  const parts = formatter.formatToParts(date);
  let weekday = '';
  let year = 0;
  let month = 0;
  let day = 0;
  let hour = 0;
  let minute = 0;

  for (const part of parts) {
    if (part.type === 'weekday') weekday = part.value;
    if (part.type === 'year') year = parseInt(part.value, 10);
    if (part.type === 'month') month = parseInt(part.value, 10);
    if (part.type === 'day') day = parseInt(part.value, 10);
    if (part.type === 'hour') hour = parseInt(part.value, 10);
    if (part.type === 'minute') minute = parseInt(part.value, 10);
  }

  if (weekday === 'Sat' || weekday === 'Sun') return false;

  const holidayCheck = checkUsMarketHoliday(year, month, day);
  if (holidayCheck.isHoliday) return false;

  const totalMinutes = hour * 60 + minute;
  const marketOpenMinutes = 9 * 60 + 30; // 09:30 ET
  const marketCloseMinutes = holidayCheck.isEarlyClose ? (13 * 60) : (16 * 60); // 13:00 ET or 16:00 ET

  return totalMinutes >= marketOpenMinutes && totalMinutes <= marketCloseMinutes;
}
