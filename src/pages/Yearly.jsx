import { PieChart } from '../App.jsx';

export default function Yearly({ period, yenUnit, lockColors, hideOthers }) {
  return (
    <section>
      <div className='card'>
        <PieChart
          period={period}
          yenUnit={yenUnit}
          lockColors={lockColors}
          hideOthers={hideOthers}
        />
      </div>
    </section>
  );
}
