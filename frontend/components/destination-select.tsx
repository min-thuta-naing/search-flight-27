'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Search, MapPin, Plane, Globe, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Airport, AirportCountrySummary, airportApi } from '@/lib/api/airport-api'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useDebouncedCallback } from '@/lib/hooks/use-debounce'
import { cn } from '@/lib/utils'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

const BANGKOK_AIRPORT_CODES = ['BKK', 'DMK']

interface CountryAirportGroup {
    country: string
    countryCode: string | null
    airportCount: number
    airports: Airport[]
    isLoaded: boolean
    isLoading: boolean
}

function codesToExclude(code: string | undefined): string[] {
    if (!code) return []
    if (BANGKOK_AIRPORT_CODES.includes(code)) return BANGKOK_AIRPORT_CODES
    return [code]
}

function getAirportDisplayName(airport: Airport) {
    const isBangkokAirport = BANGKOK_AIRPORT_CODES.includes(airport.code)
    return isBangkokAirport ? airport.name : (airport.city || airport.name)
}

function getAirportDisplayDetail(airport: Airport) {
    const isBangkokAirport = BANGKOK_AIRPORT_CODES.includes(airport.code)
    return isBangkokAirport
        ? `${airport.city}, ${airport.country_name}`
        : `${airport.name}, ${airport.country_name}`
}

function buildDisplayValue(airport: Airport) {
    const isBangkokAirport = BANGKOK_AIRPORT_CODES.includes(airport.code)
    return isBangkokAirport
        ? `${airport.name} (${airport.code})`
        : `${airport.city || airport.name} (${airport.code})`
}

interface DestinationSelectProps {
    value: string
    displayValue?: string
    onChange: (value: string, name: string) => void
    placeholder?: string
    className?: string
    error?: string
    excludeCode?: string
    disabled?: boolean
    enableCountrySelection?: boolean
}

export function DestinationSelect({
    value,
    displayValue,
    onChange,
    placeholder = 'Search city or airport',
    className,
    error,
    excludeCode,
    disabled = false,
    enableCountrySelection = false,
}: DestinationSelectProps) {
    const [search, setSearch] = useState('')
    const [results, setResults] = useState<Airport[]>([])
    const [searchTotal, setSearchTotal] = useState(0)
    const [totalAirportsInSystem, setTotalAirportsInSystem] = useState<number | null>(null)
    const [countryGroups, setCountryGroups] = useState<CountryAirportGroup[]>([])
    const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({})
    const [isLoading, setIsLoading] = useState(false)
    const [selectedName, setSelectedName] = useState('')
    const [isPopoverOpen, setIsPopoverOpen] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const applyExcludedCodes = (airports: Airport[]) => {
        const excludeCodes = codesToExclude(excludeCode)
        return excludeCodes.length > 0
            ? airports.filter((airport) => !excludeCodes.includes(airport.code))
            : airports
    }

    const normalizeAirports = (airports: Airport[]) => {
        const unique = new Map<string, Airport>()

        for (const airport of applyExcludedCodes(airports)) {
            if (!unique.has(airport.code)) {
                unique.set(airport.code, airport)
            }
        }

        return Array.from(unique.values()).sort((a, b) =>
            getAirportDisplayName(a).localeCompare(getAirportDisplayName(b))
        )
    }

    useEffect(() => {
        const loadCountries = async () => {
            setIsLoading(true)

            try {
                const response = await airportApi.getAirportCountries()
                const nextGroups = response.airportCountries.map((country: AirportCountrySummary) => ({
                    country: country.country,
                    countryCode: country.country_code,
                    airportCount: country.airport_count,
                    airports: [],
                    isLoaded: false,
                    isLoading: false,
                }))

                console.log('[DestinationSelect] countries summary', {
                    totalCountries: response.totalCountries,
                    totalAirports: response.totalAirports,
                })

                setCountryGroups(nextGroups)
                setTotalAirportsInSystem(response.totalAirports)
                setExpandedCountries({})
            } catch (err) {
                console.error('[DestinationSelect] failed to load country summary', err)
                setCountryGroups([])
                setTotalAirportsInSystem(null)
            } finally {
                setIsLoading(false)
            }
        }

        loadCountries()
    }, [])

    useEffect(() => {
        setCountryGroups((prev) =>
            prev.map((group) => ({
                ...group,
                airports: group.isLoaded ? normalizeAirports(group.airports) : group.airports,
            }))
        )
    }, [excludeCode])

    useEffect(() => {
        if (!value) {
            setSelectedName('')
            setSearch('')
            return
        }

        if (displayValue) {
            setSelectedName(displayValue)
            return
        }

        const fetchName = async () => {
            try {
                const details = await airportApi.getAirportDetails(value)
                setSelectedName(buildDisplayValue(details))
            } catch {
                setSelectedName((prev) => prev || value)
            }
        }

        if (value && !selectedName.includes(value)) {
            fetchName()
        }
    }, [value, displayValue, selectedName])

    const debouncedSearch = useDebouncedCallback(async (query: string) => {
        if (!query || query.length < 2) {
            setResults([])
            setSearchTotal(0)
            setIsLoading(false)
            return
        }

        setIsLoading(true)

        try {
            const apiQuery = query.trim()
            const { data, total } = await airportApi.searchAirports(apiQuery)
            const normalized = normalizeAirports(data)

            console.log('[DestinationSelect] search results', {
                query,
                apiQuery,
                apiCount: data.length,
                total,
                normalizedCount: normalized.length,
            })

            setResults(normalized)
            setSearchTotal(total)
        } catch (err) {
            console.error('Search failed', err)
            setResults([])
            setSearchTotal(0)
        } finally {
            setIsLoading(false)
        }
    }, 300)

    const loadCountryAirports = async (group: CountryAirportGroup) => {
        if (group.isLoaded || group.isLoading) return

        setCountryGroups((prev) =>
            prev.map((item) =>
                item.country === group.country
                    ? { ...item, isLoading: true }
                    : item
            )
        )

        try {
            const response = await airportApi.getAirportsByCountry(group.countryCode || group.country)
            const normalized = normalizeAirports(
                response.airports.filter((airport) => airport.has_flight !== false)
            )

            console.log('[DestinationSelect] country airports loaded', {
                country: group.country,
                total: response.total,
                normalizedCount: normalized.length,
            })

            setCountryGroups((prev) =>
                prev.map((item) =>
                    item.country === group.country
                        ? {
                            ...item,
                            airports: normalized,
                            airportCount: response.total,
                            isLoaded: true,
                            isLoading: false,
                        }
                        : item
                )
            )
        } catch (err) {
            console.error(`[DestinationSelect] failed to load airports for ${group.country}`, err)
            setCountryGroups((prev) =>
                prev.map((item) =>
                    item.country === group.country
                        ? { ...item, isLoading: false }
                        : item
                )
            )
        }
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setSearch(val)
        debouncedSearch(val)

        if (!isPopoverOpen) {
            setIsPopoverOpen(true)
        }
    }

    const handleSelect = (airport: Airport) => {
        const displayName = buildDisplayValue(airport)
        setSelectedName(displayName)
        setSearch('')
        setResults([])
        setIsPopoverOpen(false)
        onChange(airport.code, displayName)
    }

    const handleSelectCountry = (group: CountryAirportGroup) => {
        const valueToSend = group.countryCode || group.country
        const displayName = `${group.country} (All airports)`

        setSelectedName(displayName)
        setSearch('')
        setResults([])
        setIsPopoverOpen(false)
        onChange(valueToSend, displayName)
    }

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        setSelectedName('')
        setSearch('')
        setResults([])
        onChange('', '')

        if (inputRef.current) {
            inputRef.current.focus()
            setIsPopoverOpen(true)
        }
    }

    const handleOpenChange = (open: boolean) => {
        if (disabled && open) return

        setIsPopoverOpen(open)

        if (!open && !value) {
            setSearch('')
            setResults([])
        }
    }

    const toggleCountry = async (group: CountryAirportGroup) => {
        const willExpand = !(expandedCountries[group.country] ?? false)

        setExpandedCountries((prev) => ({
            ...prev,
            [group.country]: willExpand,
        }))

        if (willExpand) {
            await loadCountryAirports(group)
        }
    }

    const groupAirportsByCountry = (airports: Airport[]) => {
        const grouped = airports.reduce((acc, airport) => {
            const country = airport.country_name || 'ประเทศอื่นๆ'
            if (!acc[country]) acc[country] = []
            acc[country].push(airport)
            return acc
        }, {} as Record<string, Airport[]>)

        return Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([country, items]) => ({
                country,
                countryCode: items[0]?.country_code || items[0]?.country || null,
                airportCount: items.length,
                airports: items.sort((a, b) => getAirportDisplayName(a).localeCompare(getAirportDisplayName(b))),
                isLoaded: true,
                isLoading: false,
            }))
    }

    const resultGroups = groupAirportsByCountry(results)
    const showingSearchResults = search.length >= 2

    const renderAirportItem = (airport: Airport, compact = false) => (
        <button
            key={airport.code}
            className={cn(
                'w-full text-left hover:bg-blue-50 flex items-center gap-4 transition-colors rounded-md group border-b border-gray-50 last:border-0',
                compact ? 'px-4 py-3.5' : 'px-4 py-4'
            )}
            onClick={() => handleSelect(airport)}
            type="button"
        >
            <div className="bg-gray-100 group-hover:bg-blue-100 p-2.5 rounded-full transition-colors shrink-0">
                <Plane className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                    <span className="font-bold text-sm sm:text-base text-gray-800 break-words group-hover:text-blue-700 transition-colors flex-1 min-w-0">
                        {getAirportDisplayName(airport)}
                    </span>
                    <span className={cn(
                        'font-bold text-xs sm:text-sm shrink-0 uppercase tracking-tighter px-2 py-0.5 rounded',
                        compact
                            ? 'text-blue-600 bg-blue-50 border border-blue-100'
                            : 'text-gray-400 bg-gray-50 border border-gray-100'
                    )}>
                        {airport.code}
                    </span>
                </div>
                <div className="text-xs text-gray-500 truncate mt-0.5 group-hover:text-gray-600 transition-colors">
                    {getAirportDisplayDetail(airport)}
                </div>
            </div>
        </button>
    )

    const renderCountryGroup = (group: CountryAirportGroup, compact = false, collapsible = false) => {
        const isExpanded = expandedCountries[group.country] ?? false

        return (
            <div key={group.country} className="mb-4 last:mb-0">
                <div className="px-4 py-2.5 text-[12px] font-extrabold text-blue-700 uppercase tracking-[0.15em] bg-blue-50 flex items-center justify-between mb-2 rounded-md shadow-sm border border-blue-100">
                    <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5" /> {group.country}
                        {!compact && (
                            <span className="text-[10px] text-blue-500 normal-case tracking-normal">
                                {group.airportCount.toLocaleString('th-TH')}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {enableCountrySelection && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleSelectCountry(group)
                                }}
                                className="text-[10px] bg-white border border-blue-200 hover:bg-blue-100 text-blue-600 px-2 py-0.5 rounded transition-colors normal-case tracking-normal font-medium"
                            >
                                All
                            </button>
                        )}
                        {collapsible && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    void toggleCountry(group)
                                }}
                                className="text-blue-600"
                                aria-label={isExpanded ? `Collapse ${group.country}` : `Expand ${group.country}`}
                            >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                        )}
                    </div>
                </div>

                {collapsible && isExpanded && group.isLoading && (
                    <div className="px-4 py-4 text-sm text-muted-foreground">
                        Loading airports...
                    </div>
                )}

                {(!collapsible || isExpanded) && group.isLoaded && (
                    <div className="space-y-0.5">
                        {group.airports.map((airport) => renderAirportItem(airport, compact))}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className={cn('relative w-full', className)}>
            <Popover open={isPopoverOpen} onOpenChange={handleOpenChange}>
                <PopoverTrigger asChild>
                    <div
                        className={cn(
                            'relative flex items-center bg-white border rounded-md transition-all h-12 sm:h-14 overflow-hidden',
                            !disabled && 'cursor-pointer',
                            disabled && 'pointer-events-none opacity-50 bg-muted/30',
                            error ? 'border-[#ff6b35] ring-1 ring-[#ff6b35]/20' : 'border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10',
                            isPopoverOpen && 'border-blue-500 ring-2 ring-blue-500/10 shadow-md'
                        )}
                    >
                        <div className="absolute left-3 flex items-center justify-center">
                            <MapPin className={cn('h-5 w-5 transition-colors', isPopoverOpen ? 'text-blue-500' : 'text-gray-400')} />
                        </div>

                        <input
                            ref={inputRef}
                            type="text"
                            className="flex-1 w-full min-w-0 bg-transparent border-none focus:ring-0 pl-11 pr-10 text-sm sm:text-base h-full placeholder:text-gray-400 outline-none font-medium text-left"
                            placeholder={placeholder}
                            value={search || (isPopoverOpen ? search : selectedName)}
                            onChange={handleSearchChange}
                            autoComplete="off"
                            readOnly={false}
                        />

                        {(selectedName || search) && (
                            <button
                                onClick={clearSelection}
                                className="absolute right-2 p-1.5 hover:bg-blue-50 rounded-full transition-colors z-10"
                                type="button"
                            >
                                <X className="h-4 w-4 text-blue-600 font-bold" />
                            </button>
                        )}
                    </div>
                </PopoverTrigger>

                <PopoverContent
                    className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[360px] sm:min-w-[600px] sm:max-w-[min(96vw,640px)] overflow-hidden shadow-2xl border-gray-200 z-[100] bg-white"
                    align="start"
                    sideOffset={4}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    onCloseAutoFocus={(e) => e.preventDefault()}
                >
                    <ScrollArea className="max-h-[450px] [&>[data-slot=scroll-area-viewport]]:max-h-[450px]">
                        {isLoading ? (
                            <div className="p-12 flex flex-col items-center justify-center text-gray-500 italic">
                                <Loader2 className="h-8 w-8 animate-spin mb-3 text-blue-500" />
                                <span className="text-sm">Searching cities and airports...</span>
                            </div>
                        ) : showingSearchResults && results.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="h-8 w-8 text-gray-300" />
                                </div>
                                <p className="font-semibold text-gray-700">No cities or airports found</p>
                                <p className="text-sm italic">Try searching by country name or airport code</p>
                            </div>
                        ) : showingSearchResults ? (
                            <div className="px-1 py-1">
                                {resultGroups.map((group) => renderCountryGroup(group, true, false))}
                            </div>
                        ) : (
                            <div className="py-2">
                                <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-100 mb-1 bg-gray-50/50">
                                    <div className="bg-blue-600 p-1.5 rounded-md">
                                        <Plane className="h-4 w-4 text-white" />
                                    </div>
                                    <span className="text-xl font-bold text-gray-500 uppercase tracking-widest">Cities or Airports</span>
                                </div>
                                <div className="px-1">
                                    {countryGroups.length > 0 ? (
                                        countryGroups.map((group) => renderCountryGroup(group, false, true))
                                    ) : (
                                        <div className="py-8 text-center text-gray-400 text-sm">
                                            No countries available
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </ScrollArea>

                    {!isLoading && (
                        showingSearchResults && results.length > 0 ? (
                            <div className="px-4 py-2.5 border-t border-gray-200 bg-gray-50 text-center text-sm text-gray-600">
                                Showing {results.length} airports from {searchTotal.toLocaleString('en-US')} matched results
                            </div>
                        ) : !showingSearchResults && countryGroups.length > 0 ? (
                            <div className="px-4 py-2.5 border-t border-gray-200 bg-gray-50 text-center text-sm text-gray-600">
                                Showing {countryGroups.length.toLocaleString('en-US')} countries from {totalAirportsInSystem != null ? totalAirportsInSystem.toLocaleString('en-US') : '—'} airports
                            </div>
                        ) : null
                    )}
                </PopoverContent>
            </Popover>

            {error && !isPopoverOpen && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1">
                    <div className="absolute -top-1 left-4 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-[#ff6b35]" />
                    <div className="bg-[#ff6b35] text-white px-4 py-2 rounded text-sm font-medium shadow-md">
                        {error}
                    </div>
                </div>
            )}
        </div>
    )
}
