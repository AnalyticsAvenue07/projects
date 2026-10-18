import Plot from 'react-plotly.js'

export default function DelayReasonsDistribution({ data }: { data: Array<{ Delay_Reason: string; Count: number }> }) {
  return (
    <section className="rounded-[22px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <h4 className="mb-4 text-lg font-semibold text-[#0F172A]">Delay Reasons Distribution</h4>
      <Plot
        data={[
          {
            labels: data.map((item) => item.Delay_Reason),
            values: data.map((item) => item.Count),
            type: 'pie',
            hole: 0.4,
            textinfo: 'percent+label',
          },
        ]}
        layout={{
          margin: { l: 20, r: 20, t: 10, b: 20 },
          paper_bgcolor: 'white',
          autosize: true,
          height: 420,
          showlegend: true,
          legend: { orientation: 'h', y: -0.1 },
        }}
        config={{ displaylogo: false, responsive: true }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </section>
  )
}
