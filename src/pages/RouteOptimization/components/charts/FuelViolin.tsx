import Plot from 'react-plotly.js'

export default function FuelViolin({ data }: { data: Array<Record<string, any>> }) {
	return (
		<section className="rounded-[22px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
			<h4 className="mb-4 text-lg font-semibold text-[#0F172A]">Fuel consumption (L per km)</h4>
			<Plot
				data={[
					{
						y: data.map((row) => Number(row.Fuel_L_per_km)),
						type: 'violin',
						name: 'Fuel L/km',
						box: { visible: true },
						meanline: { visible: true },
						marker: { color: '#0F766E' },
					},
				]}
				layout={{
					margin: { l: 50, r: 20, t: 10, b: 35 },
					paper_bgcolor: 'white',
					plot_bgcolor: '#F8FAFC',
					height: 340,
					yaxis: { title: 'Fuel L/km', gridcolor: '#E2E8F0' },
				}}
				config={{ displaylogo: false, responsive: true }}
				useResizeHandler
				style={{ width: '100%', height: '100%' }}
			/>
		</section>
	)
}
