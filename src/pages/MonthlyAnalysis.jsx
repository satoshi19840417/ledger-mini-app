import BarByMonth from '../BarByMonth.jsx';
import MonthAmountMatrix from '../MonthAmountMatrix.jsx';

export default function MonthlyAnalysis({
  transactions,
  period,
  yenUnit,
  lockColors,
  hideOthers,
  filterMode,
}) {
  void filterMode;
  return (
    <section>
      {/* 月次推移グラフ */}
      <div className='card' style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 16 }}>月次推移</h3>
        <BarByMonth
          transactions={transactions}
          period={period}
          lockColors={lockColors}
          hideOthers={hideOthers}
          kind="expense"
          height={350}
        />
      </div>
      <div className='card'>
        <h3 style={{ marginBottom: 16 }}>月別ヒートマップ</h3>
        <MonthAmountMatrix
          transactions={transactions}
          yenUnit={yenUnit}
          kind="expense"
        />
      </div>
    </section>
  );
}
