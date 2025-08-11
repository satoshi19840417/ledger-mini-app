import { BarChart } from '../App.jsx';

export default function Monthly({ period, yenUnit, lockColors, hideOthers }) {
  return (
    <section>
      <div className='card'>
        <BarChart
          period={period}
          yenUnit={yenUnit}
          lockColors={lockColors}
          hideOthers={hideOthers}
        />
      </div>
    </section>
  );
}
