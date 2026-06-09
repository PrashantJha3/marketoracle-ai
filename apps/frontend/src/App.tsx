import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import './App.css'

type Quote = {
  symbol: string
  shortName: string | null
  currency: string | null
  marketState: string | null
  regularMarketPrice: number | null
  regularMarketChange: number | null
  regularMarketChangePercent: number | null
  regularMarketPreviousClose: number | null
  regularMarketOpen: number | null
  regularMarketDayHigh: number | null
  regularMarketDayLow: number | null
  regularMarketVolume: number | null
  marketCap: number | null
  fullExchangeName: string | null
  exchangeTimezoneName: string | null
  regularMarketTime: number | null
}

type ChartPoint = {
  time: string
  close: number
  open: number | null
  high: number | null
  low: number | null
  volume: number | null
}

const popularSymbols = ['AAPL', 'MSFT', 'GOOG', 'TSLA', 'AMZN', 'NVDA', 'NFLX']
const defaultSymbol = 'AAPL'

const rangeOptions = [
  { value: '1d', label: '1 Day' },
  { value: '5d', label: '5 Days' },
  { value: '1mo', label: '1 Month' },
  { value: '3mo', label: '3 Months' },
]

const intervalOptions = [
  { value: '5m', label: '5 min' },
  { value: '15m', label: '15 min' },
  { value: '1h', label: '1 hour' },
  { value: '1d', label: '1 day' },
]

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase()
}

function isValidSymbol(value: string) {
  return /^[A-Z0-9.\-]{1,12}$/.test(value.trim().toUpperCase())
}

function formatCurrency(value: number | null, currency = 'USD') {
  if (value == null || Number.isNaN(value)) {
    return '—'
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return value.toFixed(2)
  }
}

function formatPercent(value: number | null) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value.toFixed(2)}%`
}

function formatNumber(value: number | null) {
  if (value == null || Number.isNaN(value)) return '—'

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(value)
}

function formatTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function getChartPath(points: ChartPoint[], width: number, height: number, padding: number) {
  if (!points.length) return ''

  const values = points.map((point) => point.close)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const count = points.length
  const xStep = count > 1 ? (width - padding * 2) / (count - 1) : 0

  return points
    .map((point, index) => {
      const x = padding + index * xStep
      const y = padding + ((max - point.close) / range) * (height - padding * 2)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function App() {
  const [symbol, setSymbol] = useState(defaultSymbol)
  const [inputSymbol, setInputSymbol] = useState(defaultSymbol)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([])
  const [range, setRange] = useState('1d')
  const [interval, setInterval] = useState('5m')
  const [status, setStatus] = useState('Ready')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const refreshRef = useRef<number | null>(null)

  const symbolLabel = quote?.shortName || symbol
  const lastChange = quote?.regularMarketChange ?? 0
  const isPositive = lastChange >= 0

  const pathData = useMemo(
    () => getChartPath(chartPoints, 760, 260, 20),
    [chartPoints],
  )

  useEffect(() => {
    async function loadData() {
      setError(null)
      setStatus(`Loading ${symbol}…`)
      setLoading(true)

      try {
        const [quoteResponse, chartResponse] = await Promise.all([
          fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`),
          fetch(
            `/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=${interval}`,
          ),
        ])

        if (!quoteResponse.ok) {
          const data = await quoteResponse.json()
          throw new Error(data?.error || 'Quote lookup failed')
        }

        if (!chartResponse.ok) {
          const data = await chartResponse.json()
          throw new Error(data?.error || 'Chart lookup failed')
        }

        const quoteData = (await quoteResponse.json()) as Quote
        const chartData = await chartResponse.json()

        setQuote(quoteData)
        setChartPoints(chartData.points || [])
        setStatus(`Live quote updated for ${symbol}`)
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : 'Unexpected error'
        setError(message)
        setQuote(null)
        setChartPoints([])
        setStatus('Unable to load market data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [symbol, range, interval])

  useEffect(() => {
    refreshRef.current = window.setInterval(() => {
      fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`)
        .then(async (response) => {
          if (!response.ok) return null
          const quoteData = (await response.json()) as Quote
          setQuote(quoteData)
          setStatus(`Live quote refreshed for ${symbol}`)
        })
        .catch(() => {
          setStatus('Unable to refresh live quote')
        })
    }, 30000)

    return () => {
      if (refreshRef.current) {
        window.clearInterval(refreshRef.current)
      }
    }
  }, [symbol])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const candidate = normalizeSymbol(inputSymbol)
    if (!candidate) {
      setError('Please enter a ticker symbol.')
      return
    }
    if (!isValidSymbol(candidate)) {
      setError('Ticker symbols may only contain letters, numbers, dots, and dashes.')
      return
    }
    setSymbol(candidate)
  }

  function chooseSymbol(ticket: string) {
    setInputSymbol(ticket)
    setSymbol(ticket)
  }

  return (
    <main className="marketoracle">
      <header className="marketoracle__header">
        <div>
          <p className="brand">MarketOracle</p>
          <h1>Live Stock Intelligence</h1>
          <p className="tagline">
            View free live stock quotes, intraday charts, and market details using Yahoo Finance.
          </p>
        </div>
      </header>

      <section className="marketoracle__controls">
        <form className="search-form" onSubmit={handleSearch}>
          <label htmlFor="symbol">Enter ticker symbol</label>
          <div className="search-form__row">
            <input
              id="symbol"
              value={inputSymbol}
              onChange={(event) => setInputSymbol(event.target.value)}
              placeholder="AAPL, MSFT, TSLA, AMZN"
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Loading…' : 'Lookup'}
            </button>
          </div>
        </form>

        <div className="quick-list">
          <span>Popular symbols:</span>
          {popularSymbols.map((item) => (
            <button
              key={item}
              type="button"
              className="symbol-button"
              onClick={() => chooseSymbol(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="marketoracle__config">
        <div>
          <label htmlFor="range">Chart range</label>
          <select
            id="range"
            value={range}
            onChange={(event) => setRange(event.target.value)}
          >
            {rangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="interval">Chart interval</label>
          <select
            id="interval"
            value={interval}
            onChange={(event) => setInterval(event.target.value)}
          >
            {intervalOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {error ? <div className="marketoracle__alert">{error}</div> : null}

      <section className="marketoracle__overview">
        <div className="quote-card">
          <div className="quote-card__title">
            <div>
              <span className="quote-symbol">{symbol}</span>
              <span className="quote-name">{symbolLabel}</span>
            </div>
            <span className={`quote-badge ${isPositive ? 'positive' : 'negative'}`}>
              {quote?.marketState || 'MARKET'}
            </span>
          </div>

          <div className="quote-card__values">
            <div>
              <span className="quote-value">
                {formatCurrency(quote?.regularMarketPrice ?? null, quote?.currency || 'USD')}
              </span>
              <span className={`quote-change ${isPositive ? 'positive' : 'negative'}`}>
                {quote ? `${formatCurrency(quote.regularMarketChange ?? 0, quote.currency || 'USD')} (${formatPercent(quote.regularMarketChangePercent ?? 0)})` : '—'}
              </span>
            </div>
            <div className="quote-stats">
              <div>
                <span>Open</span>
                <strong>{formatCurrency(quote?.regularMarketOpen ?? null, quote?.currency || 'USD')}</strong>
              </div>
              <div>
                <span>High</span>
                <strong>{formatCurrency(quote?.regularMarketDayHigh ?? null, quote?.currency || 'USD')}</strong>
              </div>
              <div>
                <span>Low</span>
                <strong>{formatCurrency(quote?.regularMarketDayLow ?? null, quote?.currency || 'USD')}</strong>
              </div>
            </div>
          </div>

          <div className="quote-card__footer">
            <div>
              <span>Previous close</span>
              <strong>{formatCurrency(quote?.regularMarketPreviousClose ?? null, quote?.currency || 'USD')}</strong>
            </div>
            <div>
              <span>Volume</span>
              <strong>{formatNumber(quote?.regularMarketVolume ?? null)}</strong>
            </div>
            <div>
              <span>Updated</span>
              <strong>{formatTime(quote?.regularMarketTime ? new Date(quote.regularMarketTime * 1000).toISOString() : null)}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="marketoracle__chart">
        <div className="chart-header">
          <h2>Intraday price history</h2>
          <span>Auto-refresh every 30 seconds</span>
        </div>
        <div className="chart-frame">
          {chartPoints.length > 1 ? (
            <svg viewBox="0 0 760 260" role="img" aria-label={`Stock chart for ${symbol}`}>
              <path d={pathData} className="chart-line" fill="none" stroke="var(--accent)" strokeWidth="3" />
              <rect x="20" y="20" width="720" height="220" fill="none" stroke="var(--border)" />
            </svg>
          ) : (
            <div className="chart-empty">No chart data available for this symbol and selected range.</div>
          )}
        </div>
      </section>

      <footer className="marketoracle__status">
        <span>{status}</span>
      </footer>
    </main>
  )
}

export default App
