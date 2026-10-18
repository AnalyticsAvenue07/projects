import Plot from 'react-plotly.js'

export default function EfficiencyLine({ data }: { data: Array<{ Timestamp: string; Efficiency_Score: number }> }) {
	return (
		<section className="rounded-[22px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
			<h4 className="mb-4 text-lg font-semibold text-[#0F172A]">Daily Average Efficiency Score</h4>
			<Plot
				data={[
					{
						x: data.map((row) => row.Timestamp),
						y: data.map((row) => Number(row.Efficiency_Score)),
						type: 'scatter',
						mode: 'lines+markers',
						line: { color: '#0F766E', width: 3 },
						marker: { color: '#0F766E', size: 7 },
					},
				]}
				layout={{
					margin: { l: 50, r: 20, t: 10, b: 45 },
					paper_bgcolor: 'white',
					plot_bgcolor: '#F8FAFC',
					height: 340,
					xaxis: { title: 'Date', gridcolor: '#E2E8F0' },
					yaxis: { title: 'Efficiency Score', gridcolor: '#E2E8F0' },
				}}
				config={{ displaylogo: false, responsive: true }}
				useResizeHandler
				style={{ width: '100%', height: '100%' }}
			/>
		</section>
	)
}
