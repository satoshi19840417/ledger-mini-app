import { BarChart } from '../App.jsx';

export default function Monthly({ period, yenUnit, lockColors, hideOthers }) {
  return (
    <section>
      <h2>月次比較</h2>
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
