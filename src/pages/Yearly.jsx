import { PieChart as CategoryPieChart } from '../App.jsx';

export default function Yearly({ period, yenUnit, lockColors, hideOthers }) {
  return (
    <section>
      <h2>年間サマリ</h2>
      <div className='card'>
        <CategoryPieChart
          period={period}
          yenUnit={yenUnit}
          lockColors={lockColors}
          hideOthers={hideOthers}
        />
      </div>
    </section>
  );
}
