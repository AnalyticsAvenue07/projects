import Plot from 'react-plotly.js'

export default function ZoneHeatmapActivity({ data }: { data: Array<Record<string, any>> }) {
  return (
    <section className="rounded-[22px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <h4 className="mb-4 text-lg font-semibold text-[#0F172A]">Zone Heatmap Activity</h4>
      <Plot
        data={[
          {
            x: data.map((row) => row.Zone),
            y: data.map((row) => Number(row.Heatmap_Level)),
            type: 'box',
            marker: { color: '#0F766E' },
          },
        ]}
        layout={{
          margin: { l: 50, r: 20, t: 10, b: 45 },
          paper_bgcolor: 'white',
          plot_bgcolor: '#F8FAFC',
          autosize: true,
          height: 420,
          xaxis: { title: 'Zone', gridcolor: '#E2E8F0' },
          yaxis: { title: 'Heatmap Level', gridcolor: '#E2E8F0' },
        }}
        config={{ displaylogo: false, responsive: true }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </section>
  )
}
