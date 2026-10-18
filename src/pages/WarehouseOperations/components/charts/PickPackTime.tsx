import Plot from 'react-plotly.js'

export default function PickPackTime({ data }: { data: Array<Record<string, any>> }) {
  return (
    <section className="rounded-[22px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <h4 className="mb-4 text-lg font-semibold text-[#0F172A]">Pick Time vs Pack Time</h4>
      <Plot
        data={[
          {
            x: data.map((row) => Number(row.Pick_Time_Sec)),
            y: data.map((row) => Number(row.Pack_Time_Sec)),
            mode: 'markers',
            type: 'scatter',
            marker: { color: '#0F766E', size: 6, opacity: 0.7 },
            hovertemplate: 'Pick Time: %{x} sec<br>Pack Time: %{y} sec<extra></extra>',
          },
        ]}
        layout={{
          margin: { l: 50, r: 20, t: 10, b: 45 },
          paper_bgcolor: 'white',
          plot_bgcolor: '#F8FAFC',
          autosize: true,
          height: 420,
          xaxis: { title: 'Pick Time (Sec)', gridcolor: '#E2E8F0' },
          yaxis: { title: 'Pack Time (Sec)', gridcolor: '#E2E8F0' },
        }}
        config={{ displaylogo: false, responsive: true }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </section>
  )
}
