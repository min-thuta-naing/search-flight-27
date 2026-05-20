'use client'

import { useState, useEffect, useRef } from 'react'
import { TrendingUp, Maximize2, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DateRange } from 'react-day-picker'
import { format, differenceInDays, parseISO, addDays, subDays } from 'date-fns'
import { th } from 'date-fns/locale/th'
import dynamic from 'next/dynamic'

const Plot = dynamic(() => import('react-plotly.js'), { 
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm animate-pulse bg-muted/10 rounded-lg border border-dashed">กำลังโหลดกราฟ...</div>
})

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const chartUiConfig = {
  fonts: {
    xTick: 11,
    yTick: 10,
    yLabel: 16,
    tooltipTitle: 14,
    tooltipText: 14,
    dialogTitle: 24,
    headerTitle: 26,
  },
  colors: {
    arrival: 'hsl(221, 83%, 53%)',
    departure: 'hsl(142, 76%, 36%)',
    combined: 'hsl(212, 76%, 35%)',
    grid: 'hsl(var(--border))',
    axis: 'hsl(var(--muted-foreground))',
    tickLine: 'hsl(var(--primary))',
  },
  lines: {
    showMarkers: false, // เปิด/ปิด จุดของกราฟ
    markerSize: 6,     // ขนาดของจุด
    lineWidth: 2,      // ขนาดความหนาของเส้น
  },
  layout: {
    cardPadding: 'p-3 sm:p-6',
    headerGap: 'gap-3 sm:gap-4',
    chartHeight: 'h-[380px] sm:h-[440px]',
    chartHeightZoom: 'h-[400px] sm:h-[500px]',
    chartMinWidth: 'min-w-[280px]',
    chartMinWidthZoom: 'min-w-[320px]',
    chartMargin: { t: 10, r: 10, l: 45, b: 40 },
    chartMarginZoom: { t: 20, r: 20, l: 50, b: 40 },
  },
  grid: {
    strokeDasharray: '3 3',
    opacity: 0.3,
  },
  axis: {
    xTickSize: 10,
    xMinTickGap: 30,
    xHeight: 44,
    yWidth: 45,
  },
  legend: {
    container: 'flex flex-wrap items-center gap-2',
    item: 'inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs sm:text-sm min-w-0 transition-colors hover:bg-muted/50',
    label: 'truncate',
    marker: {
      wrapper: 'relative w-8 h-3 shrink-0',
      line: 'absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2',
      point: 'absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background',
    },
  },
  tooltip: {
    bgcolor: 'rgba(255, 255, 255, 0.95)',
    bordercolor: 'rgba(226, 232, 240, 1)',
    fontColor: 'rgba(15, 23, 42, 1)',
    fontFamily: 'Arial, sans-serif',
    nameLength: -1, // -1 หมายถึงแสดงข้อความแบบไม่จำกัดความยาว
  },
  zoomSliders: {
    xAccent: 'accent-blue-500',
    yAccent: 'accent-emerald-500',
  },
  todayMarker: {
    lineColor: 'hsl(14, 12%, 49%)',
    labelColor: 'hsl(24, 7%, 40%)',
    strokeWidth: 1.5,
    dash: '4 4',
    label: 'Today',
    labelFontSize: 13,
    labelOffset: 18,
    labelDy: -10,
    labelPlacement: 'top' as 'top' | 'bottom',
  },
}

interface FlightRoutesChartProps {
  chartData: any[]
  dateRange: DateRange | undefined
  compareMode: boolean
  isDeparture: boolean
  chartHeightClass?: string
}

export function FlightRoutesChart({
  chartData,
  compareMode,
  isDeparture,
  dateRange,
  chartHeightClass,
}: FlightRoutesChartProps) {
  const { fonts, colors, layout, grid, axis, legend, tooltip, zoomSliders, todayMarker } = chartUiConfig
  const [chartZoomed, setChartZoomed] = useState(false)
  const [isPortraitMobile, setIsPortraitMobile] = useState(false)
  const [activeSeries, setActiveSeries] = useState<'all' | 'main' | 'compare'>('all')
  const [xZoomPercent, setXZoomPercent] = useState(0)
  const [yGapStep, setYGapStep] = useState(4)
  const zoomDialogRef = useRef<HTMLDivElement>(null)

  const mainLabel = isDeparture ? 'ขาออก' : 'ขาเข้า '
  const compareLabel = isDeparture ? 'ขาเข้า ' : 'ขาออก '
  const mainBaseColor = isDeparture ? colors.departure : colors.arrival
  const compareBaseColor = isDeparture ? colors.arrival : colors.departure
  const combinedBaseColor = colors.combined
  const legendItems = [
    {
      key: 'departure' as const,
      label: 'ขาออก',
      targetSeries: isDeparture ? 'main' as const : 'compare' as const,
    },
    ...(compareMode ? [{
      key: 'arrival' as const,
      label: 'ขาเข้า',
      targetSeries: isDeparture ? 'compare' as const : 'main' as const,
    }] : []),
    ...(compareMode ? [{
      key: 'all' as const,
      label: 'รวม',
      targetSeries: 'all' as const,
    }] : []),
  ]

  useEffect(() => {
    if (!compareMode) {
      setActiveSeries('main')
    }
  }, [compareMode])

  const getCombinedFlights = (item: any) => {
    const flights = typeof item.flights === 'number' ? item.flights : 0
    const flightsCompare = typeof item.flightsCompare === 'number' ? item.flightsCompare : 0
    return flights + flightsCompare
  }

  const getSeriesTone = (series: 'main' | 'compare') => {
    const isMuted = activeSeries !== 'all' && activeSeries !== series

    const activeColor = compareMode && activeSeries === 'all'
      ? combinedBaseColor
      : series === 'main'
        ? mainBaseColor
        : compareBaseColor

    return {
      stroke: isMuted ? 'rgba(148, 163, 184, 0.5)' : activeColor,
      fillcolor: isMuted 
        ? 'rgba(148, 163, 184, 0.1)' 
        : activeColor.replace('hsl', 'hsla').replace(')', ', 0.4)'),
      markerOpacityClassName: isMuted ? 'opacity-35' : 'opacity-100',
    }
  }

  const getLegendButtonClass = (series: 'all' | 'main' | 'compare') => {
    const isSelected = activeSeries === series
    return isSelected
      ? 'border-primary bg-primary/10 text-foreground shadow-sm'
      : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
  }

  const handleLegendSelect = (series: 'all' | 'main' | 'compare') => {
    if (!compareMode && series === 'compare') return
    setActiveSeries(series)
  }

  const renderChartLegend = () => (
    <div className={legend.container}>
      {legendItems.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => handleLegendSelect(item.targetSeries)}
          className={`${legend.item} ${getLegendButtonClass(item.targetSeries)}`}
        >
          {item.targetSeries === 'all' ? null : (
            <span className={legend.marker.wrapper}>
              <span
                className={`${legend.marker.line} ${getSeriesTone(item.targetSeries).markerOpacityClassName}`}
                style={{ backgroundColor: getSeriesTone(item.targetSeries).stroke }}
              />
              <span
                className={`${legend.marker.point} ${getSeriesTone(item.targetSeries).markerOpacityClassName}`}
                style={{ backgroundColor: getSeriesTone(item.targetSeries).stroke }}
              />
            </span>
          )}
          <span className={legend.label}>{item.label}</span>
        </button>
      ))}
    </div>
  )

  // Calculate current days diff for buttons state
  const currentDaysDiff = dateRange?.from && dateRange?.to 
    ? differenceInDays(dateRange.to, dateRange.from) + 1 
    : 0

  // ตรวจจับมือถือแนวตั้ง
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px) and (orientation: portrait)')
    const update = () => setIsPortraitMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Fullscreen handling
  useEffect(() => {
    if (chartZoomed) return

    const exitFullscreen = () => {
      const doc = document as Document & { fullscreenElement?: Element; exitFullscreen?: () => Promise<void> }
      if (doc.fullscreenElement) {
        doc.exitFullscreen?.().catch(() => { })
      }
      const so = screen as unknown as { orientation?: { unlock?: () => void } }
      so?.orientation?.unlock?.()
    }

    exitFullscreen()
  }, [chartZoomed])

  useEffect(() => {
    if (!chartZoomed) return
    const onFullscreenChange = () => {
      const doc = document as Document & { fullscreenElement?: Element }
      if (!doc.fullscreenElement) setChartZoomed(false)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [chartZoomed])

  // Filter chartData to remove leading and trailing zero-data days
  // Keep days in between even if they are zero
  const filteredChartData = (() => {
    if (!chartData || chartData.length === 0) return []

    let firstIndex = -1
    let lastIndex = -1

    for (let i = 0; i < chartData.length; i++) {
      const hasData = chartData[i].flights > 0 || (compareMode && chartData[i].flightsCompare > 0)
      if (hasData) {
        if (firstIndex === -1) firstIndex = i
        lastIndex = i
      }
    }

    return firstIndex !== -1 ? chartData.slice(firstIndex, lastIndex + 1) : chartData
  })()

  const formatXAxisDate = (value: string) => {
    if (!value) return ''
    const date = parseISO(value)
    if (currentDaysDiff > 120) {
      return format(date, 'MMM yy', { locale: th })
    } else if (currentDaysDiff > 60) {
      return format(date, 'd MMM', { locale: th })
    }
    return format(date, 'd MMM', { locale: th })
  }

  const zoomedChartData = (() => {
    if (!filteredChartData.length) return []
    if (xZoomPercent <= 0) return filteredChartData

    const zoomIn = Math.min(1, Math.max(0, xZoomPercent / 100))
    const full = filteredChartData.length
    const minWindow = Math.min(2, full)
    const windowSize = Math.max(
      minWindow,
      Math.ceil(full - (full - minWindow) * zoomIn)
    )
    // Anchor to start date, do not extend beyond end date
    return filteredChartData.slice(0, windowSize)
  })()

  const yAxisStats = (() => {
    if (!zoomedChartData.length) return { min: 0, max: 1 }
    let minVal = Infinity
    let maxVal = -Infinity
    for (const item of zoomedChartData) {
      if (compareMode && activeSeries === 'all') {
        const combinedFlights = getCombinedFlights(item)
        minVal = Math.min(minVal, combinedFlights)
        maxVal = Math.max(maxVal, combinedFlights)
        continue
      }
      if (typeof item.flights === 'number') {
        minVal = Math.min(minVal, item.flights)
        maxVal = Math.max(maxVal, item.flights)
      }
      if (compareMode && typeof item.flightsCompare === 'number') {
        minVal = Math.min(minVal, item.flightsCompare)
        maxVal = Math.max(maxVal, item.flightsCompare)
      }
    }
    if (!isFinite(minVal) || !isFinite(maxVal)) return { min: 0, max: 1 }
    return { min: minVal, max: maxVal }
  })()

  const yAxisMin = (() => {
    const minVal = yAxisStats.min
    const maxVal = yAxisStats.max
    const stepFactor = yGapStep / 4
    if (stepFactor >= 1) {
      // Keep slight bottom headroom so low points are not stuck to the axis floor.
      const bottomPad = Math.max(1, Math.ceil(Math.max(1, maxVal) * 0.04))
      return Math.floor(Math.max(0, minVal - bottomPad))
    }

    const range = Math.max(1, yAxisStats.max - minVal)
    const pad = range * 0.2 * (1 - stepFactor)
    let nextMin = Math.max(0, minVal - pad)

    // Keep original rule for non-100%: min - 1 and round down to end with 0
    nextMin = Math.max(0, nextMin - 1)
    nextMin = Math.floor(nextMin / 10) * 10
    return Math.floor(nextMin)
  })()

  const yAxisMax = (() => {
    const minVal = yAxisStats.min
    const maxVal = yAxisStats.max
    const stepFactor = yGapStep / 4
    if (stepFactor >= 1) {
      // Keep a fixed headroom so the peak point never touches the top border.
      const topPad = Math.max(2, Math.ceil(Math.max(1, maxVal) * 0.06))
      return Math.ceil(maxVal + topPad)
    }

    const range = Math.max(1, maxVal - minVal)
    const pad = range * 0.2 * (1 - stepFactor)
    return Math.ceil(maxVal + pad)
  })()

  const yAxisTicks = (() => {
    if (yGapStep !== 4) return undefined
    const min = yAxisMin
    const max = yAxisMax
    const step = (max - min) / 4
    return [min, min + step, min + step * 2, min + step * 3, max]
  })()

  const mainTone = getSeriesTone('main')
  const compareTone = getSeriesTone('compare')
  const showMainTooltip = activeSeries === 'all' || activeSeries === 'main'
  const showCompareTooltip = compareMode && (activeSeries === 'all' || activeSeries === 'compare')
  const mainActiveDot = showMainTooltip ? { r: 4, fill: mainTone.stroke, stroke: '#fff', strokeWidth: 2 } : false
  const compareActiveDot = showCompareTooltip ? { r: 4, fill: compareTone.stroke, stroke: '#fff', strokeWidth: 2 } : false
  const xAxisBounds = (() => {
    if (!zoomedChartData.length) return undefined

    const firstDate = parseISO(zoomedChartData[0].date)
    const lastDate = parseISO(zoomedChartData[zoomedChartData.length - 1].date)

    // Plotly needs a non-zero date window for single-day views.
    if (zoomedChartData.length === 1 || firstDate.getTime() === lastDate.getTime()) {
      return {
        min: subDays(firstDate, 1).toISOString(),
        max: addDays(lastDate, 1).toISOString(),
      }
    }

    return {
      min: firstDate.toISOString(),
      max: lastDate.toISOString(),
    }
  })()
  const todayKey = format(new Date(), 'yyyy-MM-dd')
  const isTodayVisible = zoomedChartData.some((item: any) => item.date === todayKey)

  const traces = [
    {
      x: zoomedChartData.map((d: any) => d.date),
      y: zoomedChartData.map((d: any) =>
        compareMode && activeSeries === 'all' ? getCombinedFlights(d) : d.flights
      ),
      type: 'scatter',
      mode: chartUiConfig.lines.showMarkers ? 'lines+markers' : 'lines',
      name: compareMode && activeSeries === 'all' ? 'ขาออก + ขาเข้า' : mainLabel,
      line: { color: mainTone.stroke, width: chartUiConfig.lines.lineWidth, shape: 'spline' },
      marker: { color: mainTone.stroke, size: chartUiConfig.lines.markerSize },
      visible: compareMode ? true : activeSeries === 'all' || activeSeries === 'main' ? true : 'legendonly',
      fill: 'tozeroy',
      fillcolor: mainTone.fillcolor,
    },
    ...(compareMode ? [{
      x: zoomedChartData.map((d: any) => d.date),
      y: zoomedChartData.map((d: any) => d.flightsCompare),
      type: 'scatter',
      mode: chartUiConfig.lines.showMarkers ? 'lines+markers' : 'lines',
      name: compareLabel,
      line: { color: compareTone.stroke, width: chartUiConfig.lines.lineWidth, shape: 'spline' },
      marker: { color: compareTone.stroke, size: chartUiConfig.lines.markerSize },
      visible: activeSeries !== 'all' ? true : 'legendonly',
      fill: 'tozeroy',
      fillcolor: compareTone.fillcolor,
    }] : [])
  ]

  const plotlyLayout = {
    autosize: true,
    margin: layout.chartMargin,
    xaxis: {
      automargin: true,
      range: xAxisBounds ? [xAxisBounds.min, xAxisBounds.max] : undefined,
      minallowed: xAxisBounds?.min,
      maxallowed: xAxisBounds?.max,
      tickfont: { size: fonts.xTick, color: colors.axis },
      gridcolor: colors.grid,
      griddash: (grid.strokeDasharray ? 'dash' : 'solid') as 'dash' | 'solid',
      showgrid: true,
      tickformat: '%d %b',
      zeroline: false,
    },
    yaxis: {
      title: {
        text: 'จำนวนเที่ยวบิน',
        font: { size: fonts.yLabel, color: colors.axis },
        standoff: 10,
      },
      automargin: true,
      tickfont: { size: fonts.yTick, color: colors.axis },
      gridcolor: colors.grid,
      griddash: (grid.strokeDasharray ? 'dash' : 'solid') as 'dash' | 'solid',
      showgrid: true,
      range: [yAxisMin, yAxisMax],
      minallowed: yAxisMin,
      maxallowed: yAxisMax,
      zeroline: false,
    },
    showlegend: false,
    hovermode: 'x unified' as const,
    dragmode: 'zoom' as const,
    hoverlabel: {
      font: { size: fonts.tooltipText, family: tooltip.fontFamily, color: tooltip.fontColor },
      bgcolor: tooltip.bgcolor,
      bordercolor: tooltip.bordercolor,
      namelength: tooltip.nameLength,
      align: 'left' as const,
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    shapes: isTodayVisible ? [
      {
        type: 'line' as const,
        x0: todayKey,
        x1: todayKey,
        y0: 0,
        y1: 1,
        yref: 'paper' as const,
        line: { color: todayMarker.lineColor, width: todayMarker.strokeWidth, dash: 'dash' },
      }
    ] : [],
    annotations: isTodayVisible ? [
      {
        x: todayKey,
        y: todayMarker.labelPlacement === 'top' ? 1 : 0,
        yref: 'paper' as const,
        text: todayMarker.label,
        showarrow: false,
        font: { size: todayMarker.labelFontSize, color: todayMarker.labelColor },
        xanchor: 'left' as const,
        xshift: 6,
        yshift: todayMarker.labelDy,
      }
    ] : [],
  }

  return (
    <>
      {/* Daily frequency chart - responsive */}
      <Card className={`${layout.cardPadding} border min-w-0 overflow-visible flight-routes-accent`}>
        <div className={`flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${layout.headerGap} mb-3 sm:mb-4`}>
          <h1
            className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2 shrink-0"
            style={{ fontSize: fonts.headerTitle }}
          >
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            สถิติความถี่เที่ยวบินรายวัน
          </h1>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg border h-8 px-2.5 sm:px-3 text-xs sm:text-sm shrink-0 md:hidden"
              onClick={() => {
                const docEl = document.documentElement as HTMLElement & { requestFullscreen?: () => Promise<void> }
                docEl.requestFullscreen?.()
                  ?.then(() => {
                    setChartZoomed(true)
                    const so = (screen as unknown as { orientation?: { lock?: (o: string) => Promise<void> } }).orientation
                    so?.lock?.('landscape').catch(() => { })
                  })
                  .catch(() => setChartZoomed(true))
              }}
              title="ขยายกราฟ (แนวนอน)"
              aria-label="ขยายกราฟ"
            >
              <Maximize2 className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">ขยาย</span>
            </Button>
            {renderChartLegend()}
          </div>
        </div>
        <div className="w-full min-w-0 overflow-x-auto overflow-y-visible -mx-1 px-1">
          <div className={`relative overflow-visible ${chartHeightClass ?? layout.chartHeight} w-full ${layout.chartMinWidth} flight-routes-accent`}>
             <Plot
               data={traces as any}
               layout={plotlyLayout as any}
               config={{
                 scrollZoom: true,
                 displaylogo: false,
                 modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
                 displayModeBar: 'hover',
               }}
               useResizeHandler={true}
               style={{ width: '100%', height: '100%' }}
             />
          </div>
        </div>
      </Card>

      {/* Dialog ซูมกราฟ - แนวนอนเต็มจอ (เหมาะกับ mobile) */}
      <Dialog open={chartZoomed} onOpenChange={setChartZoomed}>
        <DialogContent
          className="max-w-[95vw] w-full sm:max-w-4xl max-h-[90vh] overflow-auto p-3 sm:p-6"
          showCloseButton={true}
        >
          <div
            ref={zoomDialogRef}
            className="min-h-0 w-full rounded-lg bg-background [&:fullscreen]:min-h-screen [&:fullscreen]:flex [&:fullscreen]:flex-col [&:fullscreen]:justify-center [&:fullscreen]:p-4"
          >
            {isPortraitMobile && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 text-primary px-3 py-2 mb-3 text-sm">
                <Smartphone className="w-4 h-4 shrink-0" />
                <span>กรุณาหมุนมือถือเป็นแนวนอนเพื่อดูกราฟเต็มจอ</span>
              </div>
            )}
            <DialogHeader>
              <DialogTitle
                className="flex items-center gap-2 text-base sm:text-lg"
                style={{ fontSize: fonts.dialogTitle }}
              >
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                สถิติความถี่เที่ยวบินรายวัน
              </DialogTitle>
            </DialogHeader>
            <div className="mt-2">
              {renderChartLegend()}
            </div>
            <div className="w-full min-w-0 mt-2">
              <div className={`relative overflow-visible ${layout.chartHeightZoom} w-full ${layout.chartMinWidthZoom} flight-routes-accent`}>
                 <Plot
                   data={traces as any}
                   layout={{...plotlyLayout, margin: layout.chartMarginZoom } as any}
                   config={{
                     scrollZoom: true,
                     displaylogo: false,
                     modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
                     displayModeBar: 'hover',
                   }}
                   useResizeHandler={true}
                   style={{ width: '100%', height: '100%' }}
                 />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
