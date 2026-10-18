import Plot from 'react-plotly.js'

export default function TravelTimeVsDistance({ data }: { data: Array<Record<string, any>> }) {
  return (
    <section className="rounded-[22px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <h4 className="mb-4 text-lg font-semibold text-[#0F172A]">Travel Time vs Travel Distance</h4>
      <Plot
        data={[
          {
            x: data.map((row) => Number(row.Travel_Distance_M)),
            y: data.map((row) => Number(row.Travel_Time_Sec)),
            mode: 'markers',
            type: 'scatter',
            marker: { color: '#0F766E', size: 6, opacity: 0.7 },
            hovertemplate: 'Distance: %{x} m<br>Time: %{y} sec<extra></extra>',
          },
        ]}
        layout={{
          margin: { l: 50, r: 20, t: 10, b: 45 },
          paper_bgcolor: 'white',
          plot_bgcolor: '#F8FAFC',
          autosize: true,
          height: 420,
          xaxis: { title: 'Travel Distance (M)', gridcolor: '#E2E8F0' },
          yaxis: { title: 'Travel Time (Sec)', gridcolor: '#E2E8F0' },
        }}
        config={{ displaylogo: false, responsive: true }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </section>
  )
}
