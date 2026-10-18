declare module 'react-plotly.js' {
  import type { ComponentType, ReactNode } from 'react'

  type PlotProps = {
    data?: any[]
    layout?: any
    config?: any
    frames?: any[]
    style?: any
    useResizeHandler?: boolean
    onInitialized?: (figure: any) => void
    onUpdate?: (figure: any) => void
    [key: string]: any
  }

  const Plot: ComponentType<PlotProps>
  export default Plot
}
