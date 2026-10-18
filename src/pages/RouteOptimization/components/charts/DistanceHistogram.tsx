import Plot from 'react-plotly.js'

export default function DistanceHistogram({ data }: { data: Array<{ bin_start: number; bin_end: number; count: number }> }) {
	return (
		<section className="rounded-[22px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
			<h4 className="mb-4 text-lg font-semibold text-[#0F172A]">Route distance distribution (km)</h4>
			<Plot
				data={[
					{
						x: data.map((item) => (item.bin_start + item.bin_end) / 2),
						y: data.map((item) => item.count),
						type: 'bar',
						marker: { color: '#0F766E' },
						hovertemplate: '%{x:.1f} km<br>Count: %{y}<extra></extra>',
					},
				]}
				layout={{
					margin: { l: 50, r: 20, t: 10, b: 45 },
					paper_bgcolor: 'white',
					plot_bgcolor: '#F8FAFC',
					height: 340,
					xaxis: { title: 'Route Distance (km)', gridcolor: '#E2E8F0' },
					yaxis: { title: 'Count', gridcolor: '#E2E8F0' },
				}}
				config={{ displaylogo: false, responsive: true }}
				useResizeHandler
				style={{ width: '100%', height: '100%' }}
			/>
		</section>
	)
}
