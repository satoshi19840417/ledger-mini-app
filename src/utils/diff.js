export function addMonthlyDiffs(data, key) {
  return data.map((item, index, arr) => {
    const current = item[key];
    const prev = index > 0 ? arr[index - 1][key] : null;
    const prevMonthDiff = prev !== null ? current - prev : null;

    const [year, month] = item.month.split('-').map(Number);
    const prevYearMonth = `${year - 1}-${String(month).padStart(2, '0')}`;
    const prevYearEntry = arr.find((d) => d.month === prevYearMonth);
    const yearOnYearDiff = prevYearEntry ? current - prevYearEntry[key] : null;

    return { ...item, prevMonthDiff, yearOnYearDiff };
  });
}
