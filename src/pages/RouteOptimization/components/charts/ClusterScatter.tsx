import Plot from 'react-plotly.js'

export default function ClusterScatter({ data }: { data: Array<Record<string, any>> }) {
	const clusters = Array.from(new Set(data.map((row) => String(row.cluster ?? '0'))))

	return (
		<section className="rounded-[22px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
			<h4 className="mb-4 text-lg font-semibold text-[#0F172A]">KMeans Clusters by Distance &amp; Delay</h4>
			<Plot
				data={clusters.map((cluster) => {
					const rows = data.filter((row) => String(row.cluster ?? '0') === cluster)
					return {
						x: rows.map((row) => Number(row.Route_Distance_km)),
						y: rows.map((row) => Number(row.Delay_Hours)),
						mode: 'markers',
						type: 'scatter',
						name: `Cluster ${cluster}`,
						marker: { size: 10 },
					}
				})}
				layout={{
					margin: { l: 50, r: 20, t: 10, b: 45 },
					paper_bgcolor: 'white',
					plot_bgcolor: '#F8FAFC',
					height: 340,
					xaxis: { title: 'Route Distance (km)', gridcolor: '#E2E8F0' },
					yaxis: { title: 'Delay (hrs)', gridcolor: '#E2E8F0' },
					legend: { orientation: 'h' },
				}}
				config={{ displaylogo: false, responsive: true }}
				useResizeHandler
				style={{ width: '100%', height: '100%' }}
			/>
		</section>
	)
}
