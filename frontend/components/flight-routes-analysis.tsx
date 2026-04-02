'use client'

import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react'
import { Plane, Calendar as CalendarIcon, Search, Send, TrendingUp, ChevronDown, ChevronUp, Clock, PlaneTakeoff, PlaneLanding, ArrowRightLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { DestinationSelect } from '@/components/destination-select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format, subDays, addDays, differenceInCalendarDays } from 'date-fns'
import {th } from 'date-fns/locale/th'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { DateRange, type MonthCaptionProps, useDayPicker } from 'react-day-picker'
import { Badge } from '@/components/ui/badge'
import { FlightRoutesChart } from './flight-routes-chart'
import { readSharedRangePreset, writeSharedRangePreset, type SharedRangePreset } from '@/lib/dashboard/range-preset-store'



// // Helper to parse date string that might be YYYYMMDD or YYYY-MM-DD
// const parseFlightDate = (dateStr: any): Date | null => {
//   if (!dateStr) return null
//   if (dateStr instanceof Date) return dateStr
//   const str = String(dateStr)
//   // YYYYMMDD
//   if (/^\d{8}$/.test(str)) {
//     const y = parseInt(str.substring(0, 4))
//     const m = parseInt(str.substring(4, 6)) - 1
//     const d = parseInt(str.substring(6, 8))
//     return new Date(y, m, d)
//   }
//   // YYYY-MM-DD
//   const d = new Date(str)
//   return isNaN(d.getTime()) ? null : d
// }

// Helper to parse date string that might be YYYYMMDD or YYYY-MM-DD
const parseFlightDate = (dateStr: any): Date | null => {
  if (!dateStr) return null
  if (dateStr instanceof Date) return dateStr
  const str = String(dateStr)
  // YYYYMMDD
  if (/^\d{8}$/.test(str)) {
    const y = parseInt(str.substring(0, 4))
    const m = parseInt(str.substring(4, 6)) - 1
    const d = parseInt(str.substring(6, 8))
    return new Date(y, m, d)
  }
  // YYYY-MM-DD
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

const CALENDAR_MONTH_OPTIONS = Array.from({ length: 12 }, (_, monthIndex) => ({
  value: monthIndex,
  label: format(new Date(2024, monthIndex, 1), 'LLLL', { locale: th }),
}))

const CALENDAR_YEAR_RANGE = (() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 8 }, (_, index) => currentYear - 2 + index)
})()

function AnalysisCalendarCaption({
  calendarMonth,
  displayIndex: _displayIndex,
  ...props
}: MonthCaptionProps) {
  const { goToMonth } = useDayPicker()
  const currentMonth = calendarMonth.date.getMonth()
  const currentYear = calendarMonth.date.getFullYear()

  const handleMonthChange = (value: string) => {
    goToMonth(new Date(currentYear, Number(value), 1))
  }

  const handleYearChange = (value: string) => {
    goToMonth(new Date(Number(value), currentMonth, 1))
  }

  return (
    <div
      {...props}
      className={cn(
        'flex h-8 w-full items-center justify-between gap-2 px-2',
        props.className
      )}
    >
      <select
        aria-label="เลือกเดือน"
        className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px]"
        value={String(currentMonth)}
        onChange={(event) => handleMonthChange(event.target.value)}
      >
        {CALENDAR_MONTH_OPTIONS.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>
      <select
        aria-label="เลือกปี"
        className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-[96px] shrink-0 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px]"
        value={String(currentYear)}
        onChange={(event) => handleYearChange(event.target.value)}
      >
        {CALENDAR_YEAR_RANGE.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  )
}

const normalizeAnalysisRoutes = (rawRoutes: any[]) =>
  (rawRoutes || []).map((r: any) => {
    const getTimeFromDate = (dateStr: string) => {
      if (!dateStr) return null
      try {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return null
        return format(d, 'HH:mm')
      } catch {
        return null
      }
    }

    let duration = r.duration
    if ((!duration || duration === 0) && r.departure_date && r.arrival_date) {
      const start = new Date(r.departure_date)
      const end = new Date(r.arrival_date)
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diffMs = end.getTime() - start.getTime()
        if (diffMs > 0) {
          duration = Math.floor(diffMs / 60000)
        }
      }
    }

    return {
      ...r,
      // Keep country metadata on each route so KPI cards can summarize at country level
      departureName: r.departureName || r.departure_name,
      departureCode: r.departureCode || r.departure_code,
      departureCountryName: r.departureCountryName || r.departure_country_name,
      departureCountryCode: r.departureCountryCode || r.departure_country_code,
      arrivalCity: r.arrivalCity || r.arrival_city,
      arrivalCode: r.arrivalCode || r.arrival_code,
      arrivalCountryName: r.arrivalCountryName || r.arrival_country_name,
      arrivalCountryCode: r.arrivalCountryCode || r.arrival_country_code,
      airlineName: r.airlineName || r.airline_name,
      airlineCode: r.airlineCode || r.airline_code,
      departureTime:
        r.departureTime ||
        r.departure_time ||
        r.time ||
        getTimeFromDate(r.departure_date) ||
        getTimeFromDate(r.departureDate),
      arrivalTime:
        r.arrivalTime ||
        r.arrival_time ||
        getTimeFromDate(r.arrival_date) ||
        getTimeFromDate(r.arrivalDate),
      date: r.date || r.departure_date || r.departureDate,
      arrivalDate: r.arrivalDate || r.arrival_date || r.arrivalDate,
      duration,
    }
  })

const formatDisplayNumber = (value: number | null | undefined) =>
  new Intl.NumberFormat('en-US').format(value ?? 0)

const sidebarKpiUi = {
  card: 'p-3 sm:p-4 rounded-lg bg-muted/40 border',
  title: 'text-xs sm:text-sm font-medium text-foreground',
  hero: 'text-xl sm:text-2xl font-bold text-primary mt-1',
  heroLarge: 'mt-2 text-xl sm:text-2xl font-bold text-primary leading-none',
  unitInline: 'text-base sm:text-lg font-semibold',
  entity: 'text-xl sm:text-2xl font-bold text-primary mt-1 break-words',
  meta: 'text-xs text-muted-foreground mt-1',
  body: 'mt-3 text-sm leading-relaxed text-foreground',
  emphasis: 'font-semibold text-foreground',
}

type RouteScope = 'all' | 'domestic' | 'international'

const formatCountryLabel = (name?: string | null, code?: string | null) => {
  if (name?.trim()) return name.trim()
  if (code?.trim()) return code.trim()
  return 'Unknown country'
}

const getRouteScope = (route: any): Exclude<RouteScope, 'all'> => {
  const departureCountry = formatCountryLabel(route.departureCountryName, route.departureCountryCode)
  const arrivalCountry = formatCountryLabel(route.arrivalCountryName, route.arrivalCountryCode)
  return departureCountry === arrivalCountry ? 'domestic' : 'international'
}

function RouteColumnHeader({
  title,
  subtitle,
  flights,
  airports,
  activeScope,
  onScopeChange,
  tone,
}: {
  title: string
  subtitle?: string
  flights: {
    total: number
    domestic: number
    international: number
  }
  airports: number
  activeScope: RouteScope
  onScopeChange: (scope: RouteScope) => void
  tone: 'incoming' | 'outgoing'
}) {
  const palette = tone === 'incoming'
    ? {
        card: 'border-blue-100 bg-blue-50/40',
        iconWrap: 'bg-blue-500/10 text-blue-600',
        count: 'text-blue-700',
        active: 'border-blue-600 bg-blue-600 text-white shadow-md',
        inactive: 'border-blue-200 bg-white text-blue-800 hover:bg-blue-50 hover:border-blue-300',
        allActive: 'bg-slate-700 text-white border-slate-700 shadow-sm',
        allInactive: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200',
        barDominant: 'bg-blue-600',
        barSecondary: 'bg-blue-300',
      }
    : {
        card: 'border-emerald-100 bg-emerald-50/40',
        iconWrap: 'bg-emerald-500/10 text-emerald-600',
        count: 'text-emerald-700',
        active: 'border-emerald-600 bg-emerald-600 text-white shadow-md',
        inactive: 'border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50 hover:border-emerald-300',
        allActive: 'bg-slate-700 text-white border-slate-700 shadow-sm',
        allInactive: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200',
        barDominant: 'bg-emerald-600',
        barSecondary: 'bg-emerald-300',
      }

  const DirectionIcon = tone === 'incoming' ? PlaneLanding : PlaneTakeoff

  // จัดเรียงหา Dominant segment ของ flights
  const sortedSegments = [
    { key: 'international' as const, label: 'ต่างประเทศ', count: flights.international },
    { key: 'domestic' as const, label: 'ในประเทศ', count: flights.domestic },
  ].sort((a, b) => b.count - a.count)

  return (
    <div className={cn('flex flex-col justify-between rounded-xl border px-4 py-4 sm:px-5', palette.card)}>
      {/* 1. Top Row: Strong Metric Hierarchy */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', palette.iconWrap)}>
            <DirectionIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-foreground">{title}</p>
            {subtitle ? <p className="mt-0.5 text-xs font-medium text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          {/* Primary Metric: Flights */}
          <p className={cn('text-2xl font-black tracking-tight leading-none', palette.count)}>
            {new Intl.NumberFormat('en-US').format(flights.total)} <span className="text-sm font-semibold tracking-normal opacity-90">เที่ยวบิน</span>
          </p>
          {/* Secondary Metric: Airports */}
          <p className="text-xs font-medium text-muted-foreground mt-1.5">
            {new Intl.NumberFormat('en-US').format(airports)} สนามบิน
          </p>
        </div>
      </div>

      {/* 2 & 3. Segmented Control */}
      <div className="mt-5 flex justify-end gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {/* Dominant and Secondary Segment */}
        {sortedSegments.map((segment) => {
          const isActive = activeScope === segment.key;
          const pct = flights.total > 0 ? Math.round((segment.count / flights.total) * 100) : 0;
          return (
            <button
              key={segment.key}
              type="button"
              onClick={() => onScopeChange(segment.key)}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-left transition-all duration-200',
                isActive ? palette.active : palette.inactive
              )}
            >
              <span className="text-xs font-bold">
                {segment.label}
              </span>
              <span className={cn(
                "text-[11px] font-semibold px-1.5 py-0.5 rounded-md",
                isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}>
                {new Intl.NumberFormat('en-US').format(segment.count)} ({pct}%)
              </span>
            </button>
          )
        })}

        {/* Ghost style Utility "All" */}
        <button
          type="button"
          onClick={() => onScopeChange('all')}
          className={cn(
            'inline-flex h-9 shrink-0 items-center justify-center rounded-lg border px-3 transition-all duration-200 text-xs font-semibold',
            activeScope === 'all' ? palette.allActive : palette.allInactive
          )}
        >
          ทั้งหมด
        </button>
      </div>

      {/* 5. Distribution Progress Bar */}
      <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60">
        {sortedSegments.map((segment, index) => {
          const pct = flights.total > 0 ? (segment.count / flights.total) * 100 : 0;
          if (pct === 0) return null;
          
          const isMuted = activeScope !== 'all' && activeScope !== segment.key;
          const colorClass = isMuted
            ? "bg-slate-300"
            : (index === 0 ? palette.barDominant : palette.barSecondary);

          return (
            <div
              key={segment.key}
              style={{ width: `${pct}%` }}
              className={cn(
                "transition-all duration-500",
                colorClass
              )}
              title={`${segment.label} ${pct.toFixed(1)}%`}
            />
          )
        })}
      </div>
    </div>
  )
}

export function FlightRoutesAnalysis() {
  const ROUTE_GROUPS_PAGE_SIZE = 50
  const sharedPreset = readSharedRangePreset('focus')
  const [origin, setOrigin] = useState('')
  const [originName, setOriginName] = useState('')
  const [destination, setDestination] = useState('')
  const [destinationName, setDestinationName] = useState('')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [dateError, setDateError] = useState(false)
  const [compareMode, setCompareMode] = useState(true)
  const [durationMode, setDurationMode] = useState<SharedRangePreset | null>(sharedPreset)
  const [showCustomDateRange, setShowCustomDateRange] = useState(false)
  const [isExtendedRangeOpen, setIsExtendedRangeOpen] = useState(false)
  const [fromCalendarMonth, setFromCalendarMonth] = useState(new Date())
  const [toCalendarMonth, setToCalendarMonth] = useState(new Date())
  const [hasAnalyzed, setHasAnalyzed] = useState(false)

  const [dailyData, setDailyData] = useState<any[]>([])
  const [dailyDataCompare, setDailyDataCompare] = useState<any[]>([])
  const [routes, setRoutes] = useState<any[]>([])
  const [routesCompare, setRoutesCompare] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedRouteKey, setExpandedRouteKey] = useState<string | null>(null)
  const [visibleRouteGroupsCount, setVisibleRouteGroupsCount] = useState(ROUTE_GROUPS_PAGE_SIZE)
  const [incomingRouteScope, setIncomingRouteScope] = useState<RouteScope>('all')
  const [outgoingRouteScope, setOutgoingRouteScope] = useState<RouteScope>('all')
  const routeListRef = useRef<HTMLDivElement | null>(null)

  const buildPresetRange = (mode: SharedRangePreset, baseDate = new Date()) => {
    if (mode === 'focus') {
      return { from: subDays(baseDate, 15), to: addDays(baseDate, 15) }
    }

    if (mode === '7') {
      return { from: baseDate, to: addDays(baseDate, 6) }
    }

    if (mode === '30') {
      return { from: baseDate, to: addDays(baseDate, 29) }
    }

    if (mode === '90') {
      return { from: baseDate, to: addDays(baseDate, 89) }
    }

    if (mode === '180') {
      return { from: baseDate, to: addDays(baseDate, 179) }
    }

    if (mode === '365') {
      return { from: baseDate, to: addDays(baseDate, 364) }
    }

    return { from: subDays(baseDate, 1), to: addDays(baseDate, 365) }
  }

  const applyDefaultQueryWindow = () => {
    if (dateRange?.from) {
      setShowCustomDateRange(false)
      setIsExtendedRangeOpen(false)
      setDateError(false)
      return
    }

    const range = buildPresetRange(readSharedRangePreset('focus'))
    const from = range.from || new Date()
    const to = range.to || from

    setDateRange({ from, to })
    setFromCalendarMonth(from)
    setToCalendarMonth(to)
    setDurationMode(readSharedRangePreset('focus'))
    setShowCustomDateRange(false)
    setIsExtendedRangeOpen(false)
    setDateError(false)
  }

  const applyPresetRange = (mode: SharedRangePreset) => {
    const range = buildPresetRange(mode)
    const from = range.from || new Date()
    const to = range.to || from

    setDateRange({ from, to })
    setFromCalendarMonth(from)
    setToCalendarMonth(to)
    setDurationMode(mode)
    writeSharedRangePreset(mode)

    setShowCustomDateRange(false)
    setIsExtendedRangeOpen(false)
    setDateError(false)
  }

  const handleCustomDateToggle = () => {
    setShowCustomDateRange((prev) => !prev)
    setDurationMode(null)
    setDateError(false)
  }

  const extendedRangeLabel =
    durationMode === '90'
      ? 'ไตรมาสนี้'
      : durationMode === '180'
        ? '6 เดือน'
        : durationMode === '365'
          ? '1 ปี'
          : 'รอบเดือน'

  const fetchedDataBounds = useRef<{ 
    main: { range: DateRange, origin: string, destination: string } | null, 
    compare: { range: DateRange, origin: string, destination: string } | null 
  }>({ main: null, compare: null });

  // Helper to check if range A is inside range B
  const isRangeCovered = (inner: DateRange, outer: DateRange | null) => {
    if (!outer || !outer.from || !outer.to || !inner.from || !inner.to) return false
    return inner.from.getTime() >= outer.from.getTime() && inner.to.getTime() <= outer.to.getTime()
  }

  // Fetch analysis data
useEffect(() => {
  async function fetchAnalysis() {
    if (!origin && !destination) {
      setHasAnalyzed(false)
      return
    }

    if (!dateRange?.from) {
      setDateError(true)
      setHasAnalyzed(false)
      return
    }
    setDateError(false)

    try {
      const requiredRange = {
        from: dateRange.from,
        to: dateRange.to || dateRange.from,
      }

      // Check if we already have this data cached
      const isMainCached = fetchedDataBounds.current.main && 
        fetchedDataBounds.current.main.origin === origin &&
        fetchedDataBounds.current.main.destination === destination &&
        isRangeCovered(requiredRange, fetchedDataBounds.current.main.range)

      const shouldFetchReverse = Boolean(origin || destination)
      const isCompareCached = !shouldFetchReverse || (fetchedDataBounds.current.compare && 
        fetchedDataBounds.current.compare.origin === destination && // Swapped for compare
        fetchedDataBounds.current.compare.destination === origin && // Swapped for compare
        isRangeCovered(requiredRange, fetchedDataBounds.current.compare.range))

      if (isMainCached && isCompareCached) {
        setHasAnalyzed(true)
        return
      }

      setLoading(true)
      setHasAnalyzed(true)

      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

      const isAirportCode = (val: string) => /^[A-Z]{3}$/.test(val)

      const params = new URLSearchParams()

      if (origin) {
        if (isAirportCode(origin)) params.append('origin', origin)
        else params.append('origin_country', origin)
      }

      if (destination) {
        if (isAirportCode(destination))
          params.append('destination', destination)
        else params.append('destination_country', destination)
      }

      params.append(
        'start_date',
        format(requiredRange.from, 'yyyy-MM-dd')
      )
      params.append(
        'end_date',
        format(requiredRange.to, 'yyyy-MM-dd')
      )

      if (!isMainCached) {
      // ===== MAIN FETCH =====
      const response = await fetch(
        `${baseUrl}/flights/analysis-range?${params.toString()}`
      )

      const data = await response.json()

      if (data) {
        console.log('📊 Flight Analysis Data Received:', data)
        console.log(`   - Daily Data Points: ${data.dailyFrequency?.length || 0}`)
        console.log(`   - Routes Found: ${data.routes?.length || 0}`)
        
        setDailyData(data.dailyFrequency || [])
        setRoutes(normalizeAnalysisRoutes(data.routes || []))
        
        fetchedDataBounds.current.main = { range: requiredRange, origin, destination }
        // console.log('Daily data:', data.dailyFrequency)
        
      }
      }
      
      // ===== COMPARE =====
      if (shouldFetchReverse) {
        if (!isCompareCached) {
          const compareParams = new URLSearchParams()

        if (origin) {
          if (isAirportCode(origin))
            compareParams.append('destination', origin)
          else compareParams.append('destination_country', origin)
        }

        if (destination) {
          if (isAirportCode(destination))
            compareParams.append('origin', destination)
          else compareParams.append('origin_country', destination)
        }

        compareParams.append(
          'start_date',
          format(requiredRange.from, 'yyyy-MM-dd')
        )
        compareParams.append(
          'end_date',
          format(requiredRange.to, 'yyyy-MM-dd')
        )

        const compareResponse = await fetch(
          `${baseUrl}/flights/analysis-range?${compareParams.toString()}`
        )

        const compareData = await compareResponse.json()

        setDailyDataCompare(compareData.dailyFrequency || [])
        setRoutesCompare(normalizeAnalysisRoutes(compareData.routes || []))
        fetchedDataBounds.current.compare = { range: requiredRange, origin: destination, destination: origin }
        }
      } else {
        setDailyDataCompare([])
        setRoutesCompare([])
        fetchedDataBounds.current.compare = null
      }
    } catch (error) {
      console.error('Failed to fetch flight analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  fetchAnalysis()
  // console.log('Fetching with:', origin, destination)
  
}, [origin, destination, dateRange, compareMode])

  // Helper to process flight data (dates, duration, etc.)
  const processFlightData = (flight: any) => {
    // Fallback date if flight.date is missing
    const baseDate = flight.date 
      ? parseFlightDate(flight.date) || parseFlightDate(flight.departure_date) || parseFlightDate(flight.departureDate)
      : (dateRange?.from ? new Date(dateRange.from) : new Date())

    let depDateObj = baseDate
    let arrDateObj = parseFlightDate(flight.arrivalDate)
    
    // 1. Parse Duration from string "4h 45m" to minutes
    let durationVal = 0
    if (typeof flight.duration === 'number') {
      durationVal = flight.duration
    } else if (typeof flight.duration === 'string') {
      const hMatch = flight.duration.match(/(\d+)h/)
      const mMatch = flight.duration.match(/(\d+)m/)
      if (hMatch) durationVal += parseInt(hMatch[1]) * 60
      if (mMatch) durationVal += parseInt(mMatch[1])
    }

    let depTime = flight.departureTime || flight.time
    let arrTime = flight.arrivalTime
    let durationStr = flight.duration

    // 2. Handle Direction: Swap time/date for Arrival flights
    if (flight.direction === 'arrival') {
      // If we have time but it's in the wrong slot (mapped to departure by default)
      if (depTime && !arrTime) {
        arrTime = depTime
        depTime = null
      }
      // The 'date' column for arrival flights is actually Arrival Date
      if (depDateObj && !arrDateObj) {
        arrDateObj = depDateObj
        depDateObj = null
      }
    }

    // Calculate if duration is numeric (minutes)
    if (!isNaN(durationVal) && durationVal > 0) {
      durationStr = `${Math.floor(durationVal / 60)} ชม. ${durationVal % 60} นาที`
      
      // Case 1: Have Departure Time, Calculate Arrival
      if (depTime && (depDateObj || baseDate)) {
        const [h, m] = depTime.split(':').map(Number)
        const start = new Date(depDateObj || baseDate!)
        start.setHours(h, m, 0, 0)
        
        const end = new Date(start.getTime() + durationVal * 60000)
        if (!arrTime) arrTime = format(end, 'HH:mm')
        if (!arrDateObj) arrDateObj = end
        if (!depDateObj) depDateObj = start
      }
      // Case 2: Have Arrival Time, Missing Departure Time
      else if (arrTime && (arrDateObj || baseDate)) {
        const [h, m] = arrTime.split(':').map(Number)
        // If arrDateObj is missing, assume baseDate (approx)
        const end = new Date(arrDateObj || baseDate!)
        end.setHours(h, m, 0, 0)
        
        const start = new Date(end.getTime() - durationVal * 60000)
        depTime = format(start, 'HH:mm')
        depDateObj = start
        if (!arrDateObj) arrDateObj = end
      }
    }
    
    return { 
      ...flight, 
      depDateObj, 
      departureTime: depTime || '-', 
      arrivalTime: arrTime || '-', 
      arrTime: arrTime || '-', // Keep for compatibility
      arrDateObj, 
      durationStr 
    }
  }

  const [selectedRouteFlights, setSelectedRouteFlights] = useState<any[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleShowFlightDetails = (flights: any[]) => {
    // Show unique flights only (Schedule view) - do not expand by date range
    const processed = flights.map(processFlightData)
    setSelectedRouteFlights(processed)
    setIsDialogOpen(true)
  }

  // Filter routes based on the current dateRange to sync with the chart
  const filteredRoutes = useMemo(() => {
    if (!routes || !dateRange?.from) return []

    const from = new Date(dateRange.from)
    from.setHours(0, 0, 0, 0)
    const to = dateRange.to ? new Date(dateRange.to) : new Date(from)
    to.setHours(23, 59, 59, 999)

    return routes.filter(route => {
      const routeDate = parseFlightDate(route.date)
      if (!routeDate) return false
      
      // console.log(`Checking route date: ${format(routeDate, 'yyyy-MM-dd')} vs Range: ${format(from, 'yyyy-MM-dd')} - ${format(to, 'yyyy-MM-dd')}`)
      // Ensure routeDate is within the selected range
      return routeDate.getTime() >= from.getTime() && routeDate.getTime() <= to.getTime()
    })
  }, [routes, dateRange])

  const filteredRoutesCompare = useMemo(() => {
    if (!routesCompare || !dateRange?.from) return []

    const from = new Date(dateRange.from)
    from.setHours(0, 0, 0, 0)
    const to = dateRange.to ? new Date(dateRange.to) : new Date(from)
    to.setHours(23, 59, 59, 999)

    return routesCompare.filter(route => {
      const routeDate = parseFlightDate(route.date)
      if (!routeDate) return false
      return routeDate.getTime() >= from.getTime() && routeDate.getTime() <= to.getTime()
    })
  }, [routesCompare, dateRange])

  // Helper to prepare data (fill missing dates)
  const prepareChartData = (data: any[], range: DateRange | undefined) => {
    if (!range?.from || !range?.to) {
      return [...data].sort((a: any, b: any) => a.date.localeCompare(b.date))
    }

    const dataMap = new Map(
      data.map((item: any) => {
        const dateKey = format(new Date(item.date), 'yyyy-MM-dd')
        return [dateKey, item]
      })
    )
    
    const startDate = new Date(
      range.from.getFullYear(),
      range.from.getMonth(),
      range.from.getDate()
    )

    const endDate = new Date(
      range.to.getFullYear(),
      range.to.getMonth(),
      range.to.getDate()
    )

    const days = differenceInCalendarDays(endDate, startDate)
    const filledData: any[] = []

    for (let i = 0; i <= days; i++) {
      const curr = addDays(startDate, i)
      const dateStr = format(curr, 'yyyy-MM-dd')
      
      if (dataMap.has(dateStr)) {
        filledData.push({ ...dataMap.get(dateStr), date: dateStr })
      } else {
        filledData.push({ date: dateStr, flights: 0 })
      }
    }
    return filledData
  }

  // Format date for chart display
  const formatChartDate = (dateStr: string) =>
    format(new Date(dateStr), 'd MMM', { locale: th })

  const processedDailyData = prepareChartData(dailyData, dateRange)
  const processedDailyDataCompare = compareMode ? prepareChartData(dailyDataCompare, dateRange) : []

  // Filter out leading/trailing zero days for statistics calculation
  // This ensures stats reflect the actual data period, not the full selected range
  const effectiveDailyData = (() => {
    if (!processedDailyData || processedDailyData.length === 0) return []
    
    let firstIndex = -1
    let lastIndex = -1
    
    for (let i = 0; i < processedDailyData.length; i++) {
      if (processedDailyData[i].flights > 0) {
        if (firstIndex === -1) firstIndex = i
        lastIndex = i
      }
    }
    
    if (firstIndex === -1) return []
    return processedDailyData.slice(firstIndex, lastIndex + 1)
  })()

  const calculatedTotalFlights = effectiveDailyData.reduce((sum, item) => sum + (item.flights || 0), 0)
  const numberOfDays = effectiveDailyData.length || 1
  const calculatedAvgFlights =
    effectiveDailyData.length > 0
      ? Math.round(calculatedTotalFlights / effectiveDailyData.length)
      : 0
  const insightRoutes = [...filteredRoutes, ...filteredRoutesCompare]

  // Calculate Most Active Carrier from routes data
  const calculateMostActiveCarrier = (filteredRoutesData: any[]) => {
    if (!filteredRoutesData || filteredRoutesData.length === 0) return 'ไม่พบข้อมูล'
    
    const carrierCounts: Record<string, number> = {}
    filteredRoutesData.forEach(r => {
      // Try to find airline name, fallback to code
      const name = r.airlineName || r.airline_name || r.airline || r.airlineCode || r.airline_code || 'Unknown'
      carrierCounts[name] = (carrierCounts[name] || 0) + 1
    })
    
    let maxCarrier = 'ไม่พบข้อมูล'
    let maxCount = 0
    
    Object.entries(carrierCounts).forEach(([carrier, count]) => {
      if (count > maxCount) {
        maxCount = count
        maxCarrier = carrier
      }
    })
    
    return maxCarrier
  }

  // Calculate Peak Hour Range from routes data
  const calculatePeakHourRange = (filteredRoutesData: any[]) => {
    if (!filteredRoutesData || filteredRoutesData.length === 0) return 'ไม่พบข้อมูล'
    
    const hourCounts: Record<number, number> = {}
    
    filteredRoutesData.forEach(r => {
      const timeStr = r.departureTime || r.departure_time || r.time
      if (timeStr) {
        // Handle "HH:mm:ss" or "HH:mm"
        const parts = timeStr.split(':')
        if (parts.length >= 1) {
          const hour = parseInt(parts[0], 10)
          if (!isNaN(hour) && hour >= 0 && hour <= 23) {
            hourCounts[hour] = (hourCounts[hour] || 0) + 1
          }
        }
      }
    })
    
    let maxHour = -1
    let maxCount = 0
    
    Object.entries(hourCounts).forEach(([h, count]) => {
      if (count > maxCount) {
        maxCount = count
        maxHour = parseInt(h, 10)
      }
    })
    
    if (maxHour === -1) return 'ไม่พบข้อมูล'
    
    // Format: "08:00 - 09:00"
    const start = String(maxHour).padStart(2, '0') + ':00'
    const end = String((maxHour + 1) % 24).padStart(2, '0') + ':00'
    return `${start} - ${end}`
  }

  const calculatedMostActiveCarrier = calculateMostActiveCarrier(insightRoutes)
  const calculatedPeakHourRange = calculatePeakHourRange(filteredRoutes)

  const chartData = processedDailyData.map(row => {
    const compareRow = processedDailyDataCompare.find((cr: any) => cr.date === row.date)
    return {
      ...row,
      flightsCompare: compareRow ? compareRow.flights : 0,
      displayDate: formatChartDate(row.date)
    }
  })

  const formatAirportName = (name?: string | null, code?: string | null) => {
    if (name && name.trim()) return name.trim()
    if (code && code.trim()) return code.trim()
    return 'Unknown airport'
  }

  const formatAirportDisplayName = (name?: string | null, code?: string | null) => {
    const resolvedName = formatAirportName(name, code)
    return resolvedName.replace(/\s+Airport$/i, '').trim()
  }

  const renderAirportLabel = (
    name?: string | null,
    code?: string | null,
    options?: {
      align?: 'left' | 'right' | 'center'
      className?: string
      codeClassName?: string
    }
  ): ReactNode => {
    const displayName = formatAirportDisplayName(name, code)
    const displayCode = code?.trim()
    const alignClass =
      options?.align === 'right'
        ? 'items-end text-right'
        : options?.align === 'center'
          ? 'items-center text-center'
          : 'items-start text-left'

    return (
      <span className={cn('flex min-w-0 flex-wrap gap-x-1.5 gap-y-0.5', alignClass, options?.className)}>
        <span className="min-w-0 truncate">{displayName}</span>
        {displayCode ? (
          <span className={cn('shrink-0 text-muted-foreground', options?.codeClassName)}>
            ({displayCode})
          </span>
        ) : null}
      </span>
    )
  }

  const buildAirportGroups = (
    routesData: any[],
    direction: 'incoming' | 'outgoing'
  ) => {
    const grouped = routesData.reduce((acc, route) => {
      const airportCode = direction === 'incoming' ? route.departureCode : route.arrivalCode
      const airportName = direction === 'incoming' ? route.departureName : route.arrivalCity
      const key = airportCode || airportName || 'unknown'

      if (!acc[key]) {
        acc[key] = {
          airportName,
          airportCode,
          scope: getRouteScope(route),
          flights: [],
        }
      }

      acc[key].flights.push(route)
      return acc
    }, {} as Record<string, any>)

    return Object.entries(grouped)
      .map(([key, value]: [string, any]) => ({
        key,
        airportName: value.airportName,
        airportCode: value.airportCode,
        scope: value.scope as Exclude<RouteScope, 'all'>,
        flights: [...value.flights].sort((a: any, b: any) =>
          (a.departureTime || '').localeCompare(b.departureTime || '')
        ),
      }))
      .sort((a, b) => {
        if (b.flights.length !== a.flights.length) {
          return b.flights.length - a.flights.length
        }
        return `${a.airportName || ''}${a.airportCode || ''}`.localeCompare(
          `${b.airportName || ''}${b.airportCode || ''}`
        )
      })
    }

  const outgoingRoutes = origin ? filteredRoutes : filteredRoutesCompare
  const incomingRoutes = origin ? filteredRoutesCompare : filteredRoutes
  
  // คำนวณจำนวนเที่ยวบินตาม Scope (Flights primary metric)
  const calculateFlightStats = (routesData: any[]) => {
    let domestic = 0;
    let international = 0;
    routesData.forEach(route => {
      if (getRouteScope(route) === 'domestic') domestic++;
      else international++;
    });
    return { total: routesData.length, domestic, international };
  };
  const incomingFlightCounts = calculateFlightStats(incomingRoutes);
  const outgoingFlightCounts = calculateFlightStats(outgoingRoutes);

  const outgoingAirportGroups = buildAirportGroups(outgoingRoutes, 'outgoing')
  const incomingAirportGroups = buildAirportGroups(incomingRoutes, 'incoming')
  const incomingGroupCounts = {
    all: incomingAirportGroups.length,
    domestic: incomingAirportGroups.filter((group) => group.scope === 'domestic').length,
    international: incomingAirportGroups.filter((group) => group.scope === 'international').length,
  }
  const outgoingGroupCounts = {
    all: outgoingAirportGroups.length,
    domestic: outgoingAirportGroups.filter((group) => group.scope === 'domestic').length,
    international: outgoingAirportGroups.filter((group) => group.scope === 'international').length,
  }
  const filteredIncomingGroups = incomingRouteScope === 'all'
    ? incomingAirportGroups
    : incomingAirportGroups.filter((group) => group.scope === incomingRouteScope)
  const filteredOutgoingGroups = outgoingRouteScope === 'all'
    ? outgoingAirportGroups
    : outgoingAirportGroups.filter((group) => group.scope === outgoingRouteScope)
  const visibleIncomingGroups = filteredIncomingGroups.slice(0, visibleRouteGroupsCount)
  const visibleOutgoingGroups = filteredOutgoingGroups.slice(0, visibleRouteGroupsCount)
  const visibleRouteGroupTotal = Math.max(visibleIncomingGroups.length, visibleOutgoingGroups.length)
  const routeGroupTotal = Math.max(filteredIncomingGroups.length, filteredOutgoingGroups.length)

  const handleRouteListScroll = () => {
    const viewport = routeListRef.current?.querySelector('[data-radix-scroll-area-viewport], [data-slot="scroll-area-viewport"]') as HTMLDivElement | null
    if (!viewport) return

    const isNearBottom = viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 64
    if (isNearBottom) {
      setVisibleRouteGroupsCount((prev) => Math.min(prev + ROUTE_GROUPS_PAGE_SIZE, routeGroupTotal))
    }
  }

  useEffect(() => {
    setVisibleRouteGroupsCount(ROUTE_GROUPS_PAGE_SIZE)
  }, [routeGroupTotal, origin, destination, dateRange?.from?.getTime(), dateRange?.to?.getTime(), incomingRouteScope, outgoingRouteScope])

  const toggleRouteExpand = (key: string) => {
    setExpandedRouteKey(prev => prev === key ? null : key)
  }

  const renderAirportRouteCard = (
    group: any,
    direction: 'incoming' | 'outgoing'
  ) => {
    const expandKey = `${direction}:${group.key}`
    const isExpanded = expandedRouteKey === expandKey
    const flights = group.flights
    const flightCount = flights.length
    const firstFlight = processFlightData(flights[0])
    const lastFlight = processFlightData(flights[flights.length - 1])
    const iconClassName =
      direction === 'incoming'
        ? 'bg-blue-500/10 text-blue-600'
        : 'bg-emerald-500/10 text-emerald-600'
    const DirectionIcon = direction === 'incoming' ? PlaneLanding : PlaneTakeoff
    const cardAccentClass =
      direction === 'incoming'
        ? 'border-l-4 border-l-blue-300'
        : 'border-l-4 border-l-emerald-300'

    return (
      <div
        key={expandKey}
        className={cn(
          'rounded-lg bg-background border shadow-sm transition-all duration-200 overflow-hidden hover:shadow-md',
          cardAccentClass
        )}
      >
        <div
          className="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-muted/50"
          onClick={() => toggleRouteExpand(expandKey)}
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', iconClassName)}>
              <DirectionIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground text-sm sm:text-base truncate">
                {renderAirportLabel(group.airportName, group.airportCode, {
                  className: 'inline-flex max-w-full align-middle'
                })}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                เที่ยวบินทั้งหมด: <span className="font-medium text-primary">{formatDisplayNumber(flightCount)}</span>
              </p>
            </div>
          </div>
          <div className="shrink-0 ml-2">
            {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </div>
        </div>

        {isExpanded && (
          <div className="px-4 sm:px-5 py-5 sm:py-6 border-t bg-muted/5 space-y-6">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-2 py-0.5 h-5 font-normal">
                  เที่ยวบินแรก (First Flight)
                </Badge>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 sm:gap-5">
                <div className="flex flex-col items-start text-left min-w-[96px] gap-1">
                  <span className="text-2xl font-bold leading-none">
                    {firstFlight.departureTime || '--:--'}
                  </span>
                  <span className="text-sm font-medium">
                    {renderAirportLabel(firstFlight.departureName, firstFlight.departureCode)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {firstFlight.depDateObj
                      ? format(firstFlight.depDateObj, 'EEE, d MMM', { locale: th })
                      : '-'}
                  </span>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center relative gap-1">
                  <span className="text-sm font-medium mb-1">
                    {firstFlight.durationStr || '-'}
                  </span>

                  <div className="w-full flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <Plane className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <span className="text-xs text-muted-foreground mt-1">
                    {firstFlight.direct ? 'Direct' : 'Connecting'}
                  </span>
                </div>

                <div className="flex flex-col items-end text-right min-w-[96px] gap-1">
                  <span className="text-2xl font-bold leading-none">
                    {firstFlight.arrTime || '--:--'}
                  </span>
                  <span className="text-sm font-medium">
                    {renderAirportLabel(firstFlight.arrivalCity, firstFlight.arrivalCode, { align: 'right' })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {firstFlight.arrDateObj
                      ? format(firstFlight.arrDateObj, 'EEE, d MMM', { locale: th })
                      : '-'}
                  </span>
                </div>
              </div>
            </div>

            {flightCount > 1 && (
              <>
                <div className="h-px bg-border/50 border-dashed" />
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] px-2 py-0.5 h-5 font-normal">
                      เที่ยวบินสุดท้าย (Last Flight)
                    </Badge>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 sm:gap-5">
                    <div className="flex flex-col items-start text-left min-w-[96px] gap-1">
                      <span className="text-2xl font-bold leading-none">
                        {lastFlight.departureTime || '--:--'}
                      </span>
                      <span className="text-sm font-medium">
                        {renderAirportLabel(lastFlight.departureName, lastFlight.departureCode)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {lastFlight.depDateObj
                          ? format(lastFlight.depDateObj, 'EEE, d MMM', { locale: th })
                          : '-'}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center relative gap-1">
                      <span className="text-sm font-medium mb-1">
                        {lastFlight.durationStr || '-'}
                      </span>

                      <div className="w-full flex items-center gap-2">
                        <div className="flex-1 h-px bg-border" />
                        <Plane className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1 h-px bg-border" />
                      </div>

                      <span className="text-xs text-muted-foreground mt-1">
                        {lastFlight.direct ? 'Direct' : 'Connecting'}
                      </span>
                    </div>

                    <div className="flex flex-col items-end text-right min-w-[96px] gap-1">
                      <span className="text-2xl font-bold leading-none">
                        {lastFlight.arrTime || '--:--'}
                      </span>
                      <span className="text-sm font-medium">
                        {renderAirportLabel(lastFlight.arrivalCity, lastFlight.arrivalCode, { align: 'right' })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {lastFlight.arrDateObj
                          ? format(lastFlight.arrDateObj, 'EEE, d MMM', { locale: th })
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-1 text-xs h-9"
              onClick={() => handleShowFlightDetails(flights)}
            >
              ดูรายละเอียดเที่ยวบิน
            </Button>
          </div>
        )}
      </div>
    )
  }

  const connectedCarrierCount = (() => {
    const carriers = new Set(
      insightRoutes
        .map((route) => route.airlineName || route.airline_name || route.airlineCode || route.airline_code)
        .filter(Boolean)
    )
    return carriers.size
  })()

  const mostConnectedCountry = (() => {
    if (!insightRoutes.length) return null

    type CountryAggregate = {
      countryLabel: string
      airportKeys: Set<string>
      totalFlights: number
    }

    const countryMap = insightRoutes.reduce((acc, route) => {
      const departureCountryLabel = formatCountryLabel(route.departureCountryName, route.departureCountryCode)
      const arrivalCountryLabel = formatCountryLabel(route.arrivalCountryName, route.arrivalCountryCode)
      const departureAirportKey = route.departureCode || route.departureName || ''
      const arrivalAirportKey = route.arrivalCode || route.arrivalCity || ''

      const appendCountry = (countryLabel: string, airportKey: string) => {
        if (!acc[countryLabel]) {
          acc[countryLabel] = {
            countryLabel,
            airportKeys: new Set<string>(),
            totalFlights: 0,
          }
        }

        if (airportKey) acc[countryLabel].airportKeys.add(airportKey)
        acc[countryLabel].totalFlights += 1
      }

      appendCountry(departureCountryLabel, departureAirportKey)
      appendCountry(arrivalCountryLabel, arrivalAirportKey)

      return acc
    }, {} as Record<string, CountryAggregate>)

    return (Object.values(countryMap) as CountryAggregate[])
      .map((country) => ({
        countryLabel: country.countryLabel,
        airportCount: country.airportKeys.size,
        totalFlights: country.totalFlights,
      }))
      .sort((a, b) => {
        if (b.airportCount !== a.airportCount) return b.airportCount - a.airportCount
        if (b.totalFlights !== a.totalFlights) return b.totalFlights - a.totalFlights
        return a.countryLabel.localeCompare(b.countryLabel)
      })[0] || null
  })()

  return (
    <div className="space-y-6 sm:space-y-8 w-full min-w-0">
      {/* <h1 className="text-xl sm:text-2xl font-bold text-foreground">
        เส้นทางการบิน
      </h1> */}

      {/* Filter bar - responsive: stack on mobile */}
      <Card className="overflow-hidden border bg-card p-4 sm:p-5 xl:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] xl:items-start">
          <div className="space-y-2.5 min-w-0">
            <Label className="text-sm font-medium text-muted-foreground">
              สนามบินต้นทาง (Departure)
            </Label>
            <div className="relative">
              <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
              <DestinationSelect
                value={origin}
                displayValue={originName}
                onChange={(value, name) => {
                  setOrigin(value)
                  setOriginName(name)
                  if (value) {
                    setDestination('')
                    setDestinationName('')
                    applyDefaultQueryWindow()
                  }
                }}
                placeholder={destination ? "คุณกำลังดูข้อมูลปลายทาง" : "เลือกสนามบินต้นทาง"}
                excludeCode={destination || undefined}
                className="pl-9"
                disabled={!!destination}
                enableCountrySelection={true}
              />
            </div>
          </div>
          <div className="space-y-2.5 min-w-0">
            <Label className="text-sm font-medium text-muted-foreground">
              สนามบินปลายทาง (Arrival)
            </Label>
            <div className="relative">
              <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
              <DestinationSelect
                value={destination}
                displayValue={destinationName}
                onChange={(value, name) => {
                  setDestination(value)
                  setDestinationName(name)
                  if (value) {
                    setOrigin('')
                    setOriginName('')
                    applyDefaultQueryWindow()
                  }
                }}
                placeholder={origin ? "คุณกำลังดูข้อมูลต้นทาง" : "เลือกสนามบินปลายทาง"}
                excludeCode={origin || undefined}
                className="pl-9"
                disabled={!!origin}
                enableCountrySelection={true}
              />
            </div>
          </div>
          <div className="space-y-2.5 min-w-0 xl:pl-1">
            <Label className="text-sm font-medium text-muted-foreground">
              ช่วงวันที่ (Start - End)
            </Label>
            <div className="inline-flex min-h-[52px] max-w-full min-w-0 flex-wrap content-start items-end gap-2.5 border-b border-border/70 pb-1">
              <Button
                type="button"
                variant={durationMode === 'focus' ? 'default' : 'outline'}
                size="sm"
                className="h-9 px-3.5 text-xs sm:text-sm"
                onClick={() => applyPresetRange('focus')}
              >
                ± 15 วัน
              </Button>
              <Button
                type="button"
                variant={durationMode === '7' ? 'default' : 'outline'}
                size="sm"
                className="h-9 px-3.5 text-xs sm:text-sm"
                onClick={() => applyPresetRange('7')}
              >
                7 วัน
              </Button>
              <Button
                type="button"
                variant={durationMode === '30' ? 'default' : 'outline'}
                size="sm"
                className="h-9 px-3.5 text-xs sm:text-sm"
                onClick={() => applyPresetRange('30')}
              >
                30 วัน
              </Button>
              <Button
                type="button"
                variant={durationMode === 'all' ? 'default' : 'outline'}
                size="sm"
                className="h-9 px-3.5 text-xs sm:text-sm"
                onClick={() => applyPresetRange('all')}
              >
                ทั้งหมด
              </Button>
              <Popover open={isExtendedRangeOpen} onOpenChange={setIsExtendedRangeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant={durationMode === '90' || durationMode === '180' || durationMode === '365' ? 'default' : 'outline'}
                    size="sm"
                    className="h-9 px-3.5 text-xs sm:text-sm"
                  >
                    {extendedRangeLabel}
                    <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-1" align="start">
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant={durationMode === '90' ? 'default' : 'ghost'}
                      size="sm"
                      className="justify-start"
                      onClick={() => applyPresetRange('90')}
                    >
                      ไตรมาสนี้
                    </Button>
                    <Button
                      type="button"
                      variant={durationMode === '180' ? 'default' : 'ghost'}
                      size="sm"
                      className="justify-start"
                      onClick={() => applyPresetRange('180')}
                    >
                      6 เดือน
                    </Button>
                    <Button
                      type="button"
                      variant={durationMode === '365' ? 'default' : 'ghost'}
                      size="sm"
                      className="justify-start"
                      onClick={() => applyPresetRange('365')}
                    >
                      1 ปี
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <button
                type="button"
                className={cn(
                  'inline-flex h-9 items-center gap-1 rounded-md border px-3.5 text-xs sm:text-sm font-medium leading-none transition-colors',
                  showCustomDateRange
                    ? 'border-primary/20 bg-muted/30 text-foreground'
                    : 'border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                onClick={handleCustomDateToggle}
              >
                <span>กำหนดเอง</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    showCustomDateRange && 'rotate-180'
                  )}
                />
              </button>
            </div>
            <div className="space-y-2 pt-0">
              <div
                className={cn(
                  'overflow-hidden transition-all duration-300 ease-in-out',
                  showCustomDateRange ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                )}
              >
                <div className="grid w-full min-w-0 grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'min-w-0 justify-start text-left font-normal h-11 sm:h-12 bg-white border-gray-300 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/10 px-2.5 sm:px-3',
                          !dateRange?.from && 'text-muted-foreground',
                          dateError && !dateRange?.from && 'border-red-500 ring-1 ring-red-500/20'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                        <span className="truncate">
                          {dateRange?.from ? format(dateRange.from, 'dd/MM/yyyy') : 'วันเริ่มต้น'}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 flight-routes-accent" align="start">
                      <Calendar
                        mode="single"
                        month={fromCalendarMonth}
                        onMonthChange={setFromCalendarMonth}
                        selected={dateRange?.from}
                        captionLayout="label"
                        hideNavigation
                        startMonth={new Date(CALENDAR_YEAR_RANGE[0], 0, 1)}
                        endMonth={new Date(CALENDAR_YEAR_RANGE[CALENDAR_YEAR_RANGE.length - 1], 11, 1)}
                        components={{
                          MonthCaption: AnalysisCalendarCaption,
                        }}
                        onSelect={(date) => {
                          setDurationMode(null)
                          setDateError(false)
                          if (date) {
                            setFromCalendarMonth(date)
                          }
                          setDateRange((prev) => ({
                            from: date,
                            to: prev?.to && date && prev.to < date ? date : prev?.to,
                          }))
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'min-w-0 justify-start text-left font-normal h-11 sm:h-12 bg-white border-gray-300 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/10 px-2.5 sm:px-3',
                          !dateRange?.to && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                        <span className="truncate">
                          {dateRange?.to ? format(dateRange.to, 'dd/MM/yyyy') : 'วันสิ้นสุด'}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 flight-routes-accent" align="start">
                      <Calendar
                        mode="single"
                        month={toCalendarMonth}
                        onMonthChange={setToCalendarMonth}
                        selected={dateRange?.to}
                        captionLayout="label"
                        hideNavigation
                        startMonth={new Date(CALENDAR_YEAR_RANGE[0], 0, 1)}
                        endMonth={new Date(CALENDAR_YEAR_RANGE[CALENDAR_YEAR_RANGE.length - 1], 11, 1)}
                        components={{
                          MonthCaption: AnalysisCalendarCaption,
                        }}
                        onSelect={(date) => {
                          setDurationMode(null)
                          setDateError(false)
                          if (date) {
                            setToCalendarMonth(date)
                          }
                          setDateRange((prev) => ({ from: prev?.from, to: date }))
                        }}
                        disabled={(date) => dateRange?.from ? date < dateRange.from : false}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Empty state - responsive mobile */}
      {!hasAnalyzed && (
        <Card className="p-8 sm:p-12 md:p-16 border bg-card rounded-xl shadow-sm">
          <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4 sm:mb-6">
              <Search className="w-7 h-7 sm:w-10 sm:h-10 text-muted-foreground" />
            </div>
            <p className="text-sm sm:text-base md:text-lg font-medium text-foreground mb-2 px-1">
              กรุณาเลือกสนามบินต้นทางหรือปลายทางเพื่อดูเส้นทางการบิน
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground space-y-1 sm:space-y-0 sm:block px-1">
              <span className="block sm:inline">เลือก Departure เพื่อดูเส้นทางที่ออกจากสนามบิน</span>
              <span className="hidden sm:inline"> | </span>
              <span className="block sm:inline">เลือก Arrival เพื่อดูเส้นทางที่มาถึงสนามบิน</span>
            </p>
          </div>
        </Card>
      )}

      {/* Chart + Summary + รายการเส้นทาง - แสดงหลังกดวิเคราะห์ข้อมูล */}
      {hasAnalyzed && (
      <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 w-full min-w-0 transition-opacity duration-300", loading ? "opacity-50 pointer-events-none" : "opacity-100")}>
          {loading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/20 backdrop-blur-sm pointer-events-none">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          {/* Left column: กราฟ + รายการเส้นทาง */}
          <div className="lg:col-span-2 flex flex-col gap-4 sm:gap-6 min-w-0">
            {/* Daily frequency chart - responsive */}
            <FlightRoutesChart
              chartData={chartData}
              dateRange={dateRange}
              compareMode={compareMode}
              isDeparture={!!origin}
            />

            {/* รายการเส้นทางสายการบิน - ใต้กราฟ */}
            <Card className="p-4 sm:p-6 border min-w-0 overflow-hidden">
              <div className="mb-2 sm:mb-3 space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                  <Send className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                  {originName || destinationName
                    ? `เส้นทางการบิน (${formatDisplayNumber(routeGroupTotal)} สนามบิน)`
                    : `เส้นทางการบิน (${formatDisplayNumber(filteredRoutes.length + filteredRoutesCompare.length)} เที่ยวบิน)`}
                </h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <RouteColumnHeader
                    title="มาจาก"
                    subtitle="สนามบินต้นทางที่บินเข้ามา"
                    flights={incomingFlightCounts}
                    airports={incomingGroupCounts.all}
                    activeScope={incomingRouteScope}
                    onScopeChange={setIncomingRouteScope}
                    tone="incoming"
                  />
                  <RouteColumnHeader
                    title="ไปยัง"
                    subtitle="สนามบินปลายทางที่บินออกไป"
                    flights={outgoingFlightCounts}
                    airports={outgoingGroupCounts.all}
                    activeScope={outgoingRouteScope}
                    onScopeChange={setOutgoingRouteScope}
                    tone="outgoing"
                  />
                </div>
              </div>
              <ScrollArea
                ref={routeListRef}
                onScrollCapture={handleRouteListScroll}
                className="h-[500px] sm:h-[600px] w-full rounded-md border bg-muted/20"
              >
                <div className="p-2 sm:p-3">
                  {(filteredIncomingGroups.length > 0 || filteredOutgoingGroups.length > 0) ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 sm:gap-6 items-start">
                      <div className="space-y-3">
                        {visibleIncomingGroups.length > 0 ? (
                          visibleIncomingGroups.map((group) => renderAirportRouteCard(group, 'incoming'))
                        ) : (
                          <div className="rounded-xl border bg-background px-5 py-10 text-center text-sm text-muted-foreground">
                            {incomingRouteScope === 'all'
                              ? 'ไม่มีเส้นทางขาเข้าในช่วงวันที่เลือก'
                              : incomingRouteScope === 'domestic'
                                ? 'ไม่มีเส้นทางขาเข้าในประเทศ'
                                : 'ไม่มีเส้นทางขาเข้าต่างประเทศ'}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        {visibleOutgoingGroups.length > 0 ? (
                          visibleOutgoingGroups.map((group) => renderAirportRouteCard(group, 'outgoing'))
                        ) : (
                          <div className="rounded-xl border bg-background px-5 py-10 text-center text-sm text-muted-foreground">
                            {outgoingRouteScope === 'all'
                              ? 'ไม่มีเส้นทางขาออกในช่วงวันที่เลือก'
                              : outgoingRouteScope === 'domestic'
                                ? 'ไม่มีเส้นทางขาออกในประเทศ'
                                : 'ไม่มีเส้นทางขาออกต่างประเทศ'}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                        <Send className="w-6 h-6 text-muted-foreground opacity-50" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        ไม่พบข้อมูลเส้นทางการบินสำหรับวันที่เลือก
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ลองเปลี่ยนวันที่หรือสนามบินอื่น
                      </p>
                    </div>
                  )}
                  {visibleRouteGroupsCount < routeGroupTotal && (
                    <div className="px-4 pt-4 pb-2 text-center text-xs text-muted-foreground">
                      แสดงแล้ว {visibleRouteGroupTotal.toLocaleString('th-TH')} / {routeGroupTotal.toLocaleString('th-TH')} สนามบิน
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* Right: Summary - responsive */}
          <Card className="p-3 sm:p-6 border min-w-0">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                สรุปข้อมูลเส้นทาง
              </h2>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <div key={i} className="p-3 sm:p-4 rounded-lg bg-muted/40 border">
                    <div className="h-3 w-1/2 bg-muted-foreground/20 rounded animate-pulse mb-2" />
                    <div className="h-6 w-3/4 bg-muted-foreground/20 rounded animate-pulse mb-2" />
                    <div className="h-2 w-1/3 bg-muted-foreground/20 rounded animate-pulse" />
                  </div>
                ))
              ) : (
                <>
              <div className={sidebarKpiUi.card}>
                <p className={sidebarKpiUi.title}>
                  จำนวนเที่ยวบินเฉลี่ย/วัน
                </p>
                <p className={sidebarKpiUi.hero}>
                  {formatDisplayNumber(calculatedAvgFlights)} เที่ยว
                </p>
                <p className={sidebarKpiUi.meta}>อ้างอิงข้อมูลช่วงที่เลือก</p>
              </div>
              <div className={sidebarKpiUi.card}>
                <p className={sidebarKpiUi.title}>
                  ช่วงเวลาที่คนนิยมที่สุด
                </p>
                <p className={sidebarKpiUi.hero}>
                  {calculatedPeakHourRange}
                </p>
              </div>
              <div className={sidebarKpiUi.card}>
                <p className={sidebarKpiUi.title}>
                  สายการบินที่มีเที่ยวบินสูงสุด
                </p>
                <p className={sidebarKpiUi.hero}>
                  {calculatedMostActiveCarrier}
                </p>
                <p className={sidebarKpiUi.meta}>
                  ให้บริการทั้งหมด <span className={sidebarKpiUi.emphasis}>{formatDisplayNumber(connectedCarrierCount)} สายการบิน</span>
                </p>
              </div>
              <div className={sidebarKpiUi.card}>
                <p className={sidebarKpiUi.title}>
                  รวมจำนวนเที่ยวบินทั้งหมด
                </p>
                <p className={sidebarKpiUi.hero}>
                  {formatDisplayNumber(calculatedTotalFlights)} เที่ยว
                </p>
                <p className={sidebarKpiUi.meta}>ตามช่วงเวลาที่เลือก</p>
              </div>
              {mostConnectedCountry && (
                <div className={sidebarKpiUi.card}>
                  <p className={sidebarKpiUi.title}>
                    ประเทศที่เชื่อมต่อมากที่สุด
                  </p>
                  <p className={sidebarKpiUi.entity}>
                    {mostConnectedCountry.countryLabel}
                  </p>
                  <p className={sidebarKpiUi.meta}>
                    เชื่อมต่อ {formatDisplayNumber(mostConnectedCountry.airportCount)} สนามบิน
                  </p>
                </div>
              )}
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Flight Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-none sm:max-w-none w-[35vw] max-h-[80vh] overflow-x-auto">
          <DialogHeader>
            <DialogTitle>รายละเอียดเที่ยวบิน</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-1 flight-routes-accent">
            {Object.entries(
              selectedRouteFlights.reduce((acc: any, flight: any) => {
                // Determine grouping key based on date range
                let key = 'ตารางเที่ยวบิน (Flight Schedule)'
                
                // If we have a date range and it's small enough (e.g. <= 60 days), group by date
                // We can infer this if we have multiple different dates in the flights list
                // Or simply check if we have a valid date object
                if (dateRange?.from && dateRange?.to) {
                   const daysDiff = differenceInCalendarDays(dateRange.to, dateRange.from)
                   if (daysDiff <= 60 && flight.depDateObj) {
                       key = format(flight.depDateObj, 'yyyy-MM-dd')
                   }
                }

                if (!acc[key]) acc[key] = []
                acc[key].push(flight)
                return acc
              }, {})
            ).sort((a: any, b: any) => a[0].localeCompare(b[0])).map(([key, flights]: any) => {
              // Format header date if it's a date key
              const isDateKey = /^\d{4}-\d{2}-\d{2}$/.test(key)
              const headerTitle = isDateKey ? format(new Date(key), 'EEEE, d MMMM yyyy', { locale: th }) : key

              return (
              <div key={key} className="space-y-3">
                <div className="flex items-center gap-4 pt-2">
                  <h3 className="font-medium text-sm text-muted-foreground/70 shrink-0">
                    {headerTitle}
                  </h3>
                  <div className="h-px bg-border/60 flex-1" />
                </div>
                <div className="grid gap-3">
                  {flights.map((flight: any, index: number) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/30 rounded-lg border gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 overflow-hidden border relative">
                          <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
                            <Plane className="w-5 h-5 text-primary" />
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-lg">
                            {(() => {
                              const airlineCode = flight.airlineCode || flight.airline || '';
                              const flightNum = flight.flightNumber || '';
                              // Check if flight number already starts with airline code (case insensitive)
                              const showCode = !flightNum.toLowerCase().startsWith(airlineCode.toLowerCase());
                              return `${showCode ? airlineCode + ' ' : ''}${flightNum}`;
                            })()}
                          </div>
                          <div className="text-sm text-muted-foreground">{flight.airlineName || flight.airline_name}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 flex-1 justify-center sm:justify-end min-w-0">
                        <div className="text-right min-w-[80px] sm:min-w-[140px]">
                          <div className="font-bold text-lg">{flight.departureTime}</div>
                          <div className="text-xs text-muted-foreground truncate" title={flight.departureName}>
                            {renderAirportLabel(flight.departureName, flight.departureCode, {
                              className: 'text-xs text-muted-foreground',
                              codeClassName: 'text-xs text-muted-foreground'
                            })}
                          </div>
                        </div>
                        <div className="flex flex-col items-center px-2 min-w-[100px]">
                          <span className="text-xs text-muted-foreground mb-1">{flight.durationStr}</span>
                          <div className="w-full flex items-center">
                            <div className="h-px bg-border flex-1" />
                            <Plane className="w-3 h-3 text-muted-foreground ml-1 rotate-90" />
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-1">{flight.direct ? 'Direct' : 'Connecting'}</span>
                        </div>
                        <div className="text-left min-w-[80px] sm:min-w-[140px]">
                          <div className="font-bold text-lg">{flight.arrivalTime}</div>
                          <div className="text-xs text-muted-foreground truncate" title={flight.arrivalCity || flight.arrivalCode}>
                            {renderAirportLabel(flight.arrivalCity, flight.arrivalCode, {
                              align: 'right',
                              className: 'text-xs text-muted-foreground',
                              codeClassName: 'text-xs text-muted-foreground'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
