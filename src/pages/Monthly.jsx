import BarByMonth from '../BarByMonth.jsx';

export default function Monthly({
  transactions,
  period,
  yenUnit,
  lockColors,
  hideOthers,
  kind,
}) {
  return (
    <section>
      <div className='card'>
        <BarByMonth
          transactions={transactions}
          period={period}
          yenUnit={yenUnit}
          lockColors={lockColors}
          hideOthers={hideOthers}
          kind={kind}
        />
      </div>
    </section>
  );
}
