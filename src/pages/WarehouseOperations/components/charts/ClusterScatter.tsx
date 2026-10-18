import Plot from 'react-plotly.js'

export default function ClusterScatter({ data }: { data: Array<Record<string, any>> }) {
  const clusters = Array.from(new Set(data.map((row) => String(row.Cluster ?? '0'))))

  return (
    <section className="rounded-[22px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <h4 className="mb-4 text-lg font-semibold text-[#0F172A]">KMeans Congestion Clusters by Pick Qty &amp; Congestion Factor</h4>
      <Plot
        data={clusters.map((cluster) => {
          const rows = data.filter((row) => String(row.Cluster ?? '0') === cluster)
          return {
            x: rows.map((row) => Number(row.Pick_Qty)),
            y: rows.map((row) => Number(row.Congestion_Factor)),
            mode: 'markers',
            type: 'scatter',
            name: `Cluster ${cluster}`,
            marker: { size: 10 },
            hovertemplate: 'Pick Qty: %{x}<br>Congestion Factor: %{y}<extra></extra>',
          }
        })}
        layout={{
          margin: { l: 50, r: 20, t: 10, b: 45 },
          paper_bgcolor: 'white',
          plot_bgcolor: '#F8FAFC',
          autosize: true,
          height: 420,
          xaxis: { title: 'Pick Quantity', gridcolor: '#E2E8F0' },
          yaxis: { title: 'Congestion Factor', gridcolor: '#E2E8F0' },
          legend: { orientation: 'h', y: -0.2 },
        }}
        config={{ displaylogo: false, responsive: true }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </section>
  )
}
