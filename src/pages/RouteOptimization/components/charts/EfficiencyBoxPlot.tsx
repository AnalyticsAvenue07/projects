import Plot from 'react-plotly.js'

export default function EfficiencyBoxPlot({ data }: { data: Array<Record<string, any>> }) {
	const grouped = data.reduce<Record<string, number[]>>((acc, row) => {
		const key = String(row.Vehicle_Type ?? 'Unknown')
		acc[key] ||= []
		const value = Number(row.Efficiency_Score)
		if (!Number.isNaN(value)) acc[key].push(value)
		return acc
	}, {})

	return (
		<section className="rounded-[22px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
			<h4 className="mb-4 text-lg font-semibold text-[#0F172A]">Efficiency Score by Vehicle Type</h4>
			<Plot
				data={Object.entries(grouped).map(([vehicleType, values]) => ({
					y: values,
					type: 'box',
					name: vehicleType,
					marker: { color: '#0F766E' },
				}))}
				layout={{
					margin: { l: 50, r: 20, t: 10, b: 90 },
					paper_bgcolor: 'white',
					plot_bgcolor: '#F8FAFC',
					height: 360,
					xaxis: { title: 'Vehicle Type', tickangle: -25, gridcolor: '#E2E8F0' },
					yaxis: { title: 'Efficiency Score', gridcolor: '#E2E8F0' },
					boxmode: 'group',
				}}
				config={{ displaylogo: false, responsive: true }}
				useResizeHandler
				style={{ width: '100%', height: '100%' }}
			/>
		</section>
	)
}
