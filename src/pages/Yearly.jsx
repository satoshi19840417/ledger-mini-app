import PieByCategory from '../PieByCategory.jsx';

export default function Yearly({ transactions, period, yenUnit, lockColors, hideOthers }) {
  return (
    <section>
      <div className='card'>
        <PieByCategory
          transactions={transactions}
          period={period}
          yenUnit={yenUnit}
          lockColors={lockColors}
          hideOthers={hideOthers}
        />
      </div>
    </section>
  );
}
