import Plot from 'react-plotly.js'

export default function EquipmentUsage({ data }: { data: Array<{ Equipment_Type: string; Count: number }> }) {
  return (
    <section className="rounded-[22px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <h4 className="mb-4 text-lg font-semibold text-[#0F172A]">Equipment Usage</h4>
      <Plot
        data={[
          {
            x: data.map((item) => item.Equipment_Type),
            y: data.map((item) => item.Count),
            type: 'bar',
            marker: { color: '#0F766E' },
            hovertemplate: '%{x}<br>Count: %{y}<extra></extra>',
          },
        ]}
        layout={{
          margin: { l: 50, r: 20, t: 10, b: 45 },
          paper_bgcolor: 'white',
          plot_bgcolor: '#F8FAFC',
          autosize: true,
          height: 420,
          xaxis: { title: 'Equipment Type', gridcolor: '#E2E8F0' },
          yaxis: { title: 'Count', gridcolor: '#E2E8F0' },
        }}
        config={{ displaylogo: false, responsive: true }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </section>
  )
}
