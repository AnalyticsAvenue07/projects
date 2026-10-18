import Plot from 'react-plotly.js'

export default function TravelDistanceOverTime({ data }: { data: Array<Record<string, any>> }) {
  const warehouses = Array.from(new Set(data.map((row) => String(row.Warehouse ?? 'Default'))))

  return (
    <section className="rounded-[22px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <h4 className="mb-4 text-lg font-semibold text-[#0F172A]">Travel Distance Over Time</h4>
      <Plot
        data={warehouses.map((wh) => {
          const rows = data.filter((row) => String(row.Warehouse ?? 'Default') === wh)
          return {
            x: rows.map((row) => row.Order_Timestamp),
            y: rows.map((row) => Number(row.Travel_Distance_M)),
            mode: 'markers',
            type: 'scatter',
            name: wh,
            marker: { size: 8 },
            hovertemplate: 'Time: %{x}<br>Distance: %{y} m<extra></extra>',
          }
        })}
        layout={{
          margin: { l: 50, r: 20, t: 10, b: 45 },
          paper_bgcolor: 'white',
          plot_bgcolor: '#F8FAFC',
          autosize: true,
          height: 420,
          xaxis: { title: 'Order Timestamp', gridcolor: '#E2E8F0' },
          yaxis: { title: 'Travel Distance (M)', gridcolor: '#E2E8F0' },
          legend: { orientation: 'h', y: -0.2 },
        }}
        config={{ displaylogo: false, responsive: true }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </section>
  )
}
