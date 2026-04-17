/**
 * Utilitários para formatação de datas no padrão japones (AAAA/MM/DD)
 */

/**
 * Formata uma data para o padrão AAAA/MM/DD (formato japonês)
 * @param date - Data em string (YYYY-MM-DD) ou objeto Date
 * @returns String no formato AAAA/MM/DD ou null se inválido
 */
export const formatDateToJapanese = (date: string | Date | null | undefined): string | null => {
  if (!date) return null;

  let dateObj: Date;
  
  if (typeof date === 'string') {
    // Se for string YYYY-MM-DD ou YYYY-MM-DDTHH:MM:SS
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    return null;
  }

  if (isNaN(dateObj.getTime())) {
    return null;
  }

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}/${month}/${day}`;
};

/**
 * Converte data do padrão AAAA/MM/DD para YYYY-MM-DD
 * @param dateJapanese - Data no formato AAAA/MM/DD
 * @returns String no formato YYYY-MM-DD ou null se inválido
 */
export const convertJapaneseDateToISO = (dateJapanese: string): string | null => {
  if (!dateJapanese || typeof dateJapanese !== 'string') {
    return null;
  }

  const parts = dateJapanese.split('/');
  if (parts.length !== 3) {
    return null;
  }

  const [year, month, day] = parts;
  
  if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month) || !/^\d{1,2}$/.test(day)) {
    return null;
  }

  const monthPadded = String(month).padStart(2, '0');
  const dayPadded = String(day).padStart(2, '0');

  return `${year}-${monthPadded}-${dayPadded}`;
};

/**
 * Valida se uma data está no padrão AAAA/MM/DD
 * @param dateJapanese - Data no formato AAAA/MM/DD
 * @returns Boolean indicando se é válida
 */
export const isValidJapaneseDate = (dateJapanese: string): boolean => {
  if (!dateJapanese || typeof dateJapanese !== 'string') {
    return false;
  }

  const parts = dateJapanese.split('/');
  if (parts.length !== 3) {
    return false;
  }

  const [year, month, day] = parts;
  
  if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month) || !/^\d{1,2}$/.test(day)) {
    return false;
  }

  const monthNum = parseInt(month);
  const dayNum = parseInt(day);

  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
    return false;
  }

  // Validar se é uma data válida
  const isoDate = convertJapaneseDateToISO(dateJapanese);
  if (!isoDate) return false;

  const dateObj = new Date(isoDate);
  return !isNaN(dateObj.getTime());
};

/**
 * Obtém data de hoje no formato AAAA/MM/DD
 * @returns String no formato AAAA/MM/DD
 */
export const getTodayJapanese = (): string => {
  return formatDateToJapanese(new Date()) || '';
};
