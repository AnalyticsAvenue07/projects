import Plot from 'react-plotly.js'

export default function HeatmapLevelOverTime({ data }: { data: Array<Record<string, any>> }) {
  return (
    <section className="rounded-[22px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <h4 className="mb-4 text-lg font-semibold text-[#0F172A]">Heatmap Level Over Time</h4>
      <Plot
        data={[
          {
            x: data.map((row) => row.Order_Timestamp),
            y: data.map((row) => Number(row.Heatmap_Level)),
            mode: 'lines',
            type: 'scatter',
            line: { color: '#0F766E', width: 2 },
            hovertemplate: 'Time: %{x}<br>Heatmap Level: %{y:.2f}<extra></extra>',
          },
        ]}
        layout={{
          margin: { l: 50, r: 20, t: 10, b: 45 },
          paper_bgcolor: 'white',
          plot_bgcolor: '#F8FAFC',
          autosize: true,
          height: 420,
          xaxis: { title: 'Order Timestamp', gridcolor: '#E2E8F0' },
          yaxis: { title: 'Heatmap Level', gridcolor: '#E2E8F0' },
        }}
        config={{ displaylogo: false, responsive: true }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </section>
  )
}
