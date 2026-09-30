import { createContext, useContext } from 'react';

export const MonthContext = createContext({
  selectedMonth: { month: new Date().getMonth() + 1, year: new Date().getFullYear() },
  setSelectedMonth: () => {}
});

export const useMonth = () => useContext(MonthContext);
