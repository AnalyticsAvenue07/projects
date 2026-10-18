import Plot from 'react-plotly.js'

export default function CorrelationHeatmap({
	data,
}: {
	data: { columns: string[]; values: Array<Array<number | null>> } | null
}) {
	const columns = data?.columns ?? []
	const values = data?.values ?? []

	return (
		<section className="rounded-[22px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
			<h4 className="mb-4 text-lg font-semibold text-[#0F172A]">Correlation Matrix</h4>
			<Plot
				data={[
					{
						z: values,
						x: columns,
						y: columns,
						type: 'heatmap',
						colorscale: [
							[0, '#DBEAFE'],
							[0.5, '#93C5FD'],
							[1, '#0F766E'],
						],
						zmin: -1,
						zmax: 1,
						hovertemplate: '%{y} vs %{x}: %{z}<extra></extra>',
					},
				]}
				layout={{
					margin: { l: 80, r: 20, t: 10, b: 70 },
					paper_bgcolor: 'white',
					plot_bgcolor: '#F8FAFC',
					height: 380,
				}}
				config={{ displaylogo: false, responsive: true }}
				useResizeHandler
				style={{ width: '100%', height: '100%' }}
			/>
		</section>
	)
}
