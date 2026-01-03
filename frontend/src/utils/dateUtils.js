/**
 * המרת תאריך מכל פורמט (Firestore Timestamp, ISO string, Date object) ל-Date object
 * @param {*} date - התאריך בכל פורמט
 * @returns {Date|null} - Date object או null אם לא תקף
 */
export const parseDate = (date) => {
  if (!date) return null;

  // אם זה כבר Date object
  if (date instanceof Date) {
    return date;
  }

  // אם זה Firestore Timestamp (יש לו seconds או toDate)
  if (date.seconds) {
    return new Date(date.seconds * 1000);
  }

  if (typeof date.toDate === 'function') {
    return date.toDate();
  }

  // אם זה מחרוזת או מספר
  try {
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch (e) {
    return null;
  }
};

/**
 * פורמט תאריך בעברית (dd/mm/yyyy)
 * @param {*} date - התאריך בכל פורמט
 * @returns {string} - תאריך מפורמט או '-'
 */
export const formatDate = (date) => {
  const parsed = parseDate(date);
  if (!parsed) return '-';

  return parsed.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

/**
 * פורמט תאריך ושעה בעברית (dd/mm/yyyy, hh:mm)
 * @param {*} date - התאריך בכל פורמט
 * @returns {string} - תאריך ושעה מפורמטים או '-'
 */
export const formatDateTime = (date) => {
  const parsed = parseDate(date);
  if (!parsed) return '-';

  return parsed.toLocaleString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * פורמט מספר עם פסיקים בעברית
 * @param {number} num - המספר לפרמט
 * @returns {string} - מספר מפורמט או '0'
 */
export const formatNumber = (num) => {
  if (!num && num !== 0) return '0';
  return num.toLocaleString('he-IL');
};
