/**
 * Add specified amount of days to the date
 * @param date
 * @param days
 */
export const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Subtract specified amount of days from the date
 * @param date
 * @param days
 */
export const subtractDays = (date: Date, days: number) => {
  return addDays(date, -days);
};
