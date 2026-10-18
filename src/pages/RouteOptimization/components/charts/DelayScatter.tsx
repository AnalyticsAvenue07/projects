import Plot from 'react-plotly.js'

export default function DelayScatter({ data }: { data: Array<Record<string, any>> }) {
	const trafficLevels = Array.from(new Set(data.map((row) => String(row.Traffic_Level ?? 'Unknown'))))

	return (
		<section className="rounded-[22px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
			<h4 className="mb-4 text-lg font-semibold text-[#0F172A]">Delay vs Distance</h4>
			<Plot
				data={trafficLevels.map((trafficLevel) => {
					const rows = data.filter((row) => String(row.Traffic_Level ?? 'Unknown') === trafficLevel)
					return {
						x: rows.map((row) => Number(row.Route_Distance_km)),
						y: rows.map((row) => Number(row.Delay_Hours)),
						mode: 'markers',
						type: 'scatter',
						name: trafficLevel,
						marker: {
							size: rows.map((row) => Math.max(Number(row.Load_Weight_kg ?? 1) / 25, 8)),
							opacity: 0.8,
						},
						hovertemplate: 'Distance: %{x:.1f} km<br>Delay: %{y:.2f} hrs<extra>' + trafficLevel + '</extra>',
					}
				})}
				layout={{
					margin: { l: 50, r: 20, t: 10, b: 45 },
					paper_bgcolor: 'white',
					plot_bgcolor: '#F8FAFC',
					height: 360,
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
