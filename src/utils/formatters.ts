// Direitos Autorais: Andre Silva

export const formatCurrency = (value: number): string => {
  return value.toLocaleString('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};
