import Plot from 'react-plotly.js'

export default function AisleCongestion({ data }: { data: Array<Record<string, any>> }) {
  // Extract unique sorted aisles
  const aisles = Array.from(new Set(data.map((row) => String(row.Aisle ?? ''))))
    .filter(Boolean)
    .sort((a, b) => {
      const numA = parseInt(a.replace(/^\D+/g, ''), 10)
      const numB = parseInt(b.replace(/^\D+/g, ''), 10)
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB
      return a.localeCompare(b)
    })

  // Extract unique sorted heatmap levels
  const heatmapLevels = Array.from(new Set(data.map((row) => Number(row.Heatmap_Level ?? 0))))
    .filter((h) => h > 0 && !isNaN(h))
    .sort((a, b) => a - b)

  // Compute 2D z array where z[y][x] = count of rows
  const z: number[][] = Array(heatmapLevels.length)
    .fill(0)
    .map(() => Array(aisles.length).fill(0))

  data.forEach((row) => {
    const xVal = String(row.Aisle ?? '')
    const yVal = Number(row.Heatmap_Level ?? 0)
    const xIdx = aisles.indexOf(xVal)
    const yIdx = heatmapLevels.indexOf(yVal)
    if (xIdx !== -1 && yIdx !== -1) {
      z[yIdx][xIdx]++
    }
  })

  return (
    <section className="rounded-[22px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <h4 className="mb-4 text-lg font-semibold text-[#0F172A]">Aisle Congestion Heatmap (2D Density)</h4>
      <Plot
        data={[
          {
            x: aisles,
            y: heatmapLevels.map(String),
            z: z,
            type: 'heatmap',
            colorscale: 'Blues',
            showscale: true,
            colorbar: { title: 'count' },
            hovertemplate: 'Aisle: %{x}<br>Heatmap Level: %{y}<br>Count: %{z}<extra></extra>',
          },
        ]}
        layout={{
          margin: { l: 60, r: 20, t: 10, b: 45 },
          paper_bgcolor: 'white',
          plot_bgcolor: '#F8FAFC',
          autosize: true,
          height: 420,
          xaxis: { title: 'Aisle', gridcolor: '#E2E8F0' },
          yaxis: { title: 'Heatmap Level', gridcolor: '#E2E8F0', type: 'category' },
        }}
        config={{ displaylogo: false, responsive: true }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </section>
  )
}
