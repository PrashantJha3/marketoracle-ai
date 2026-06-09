const express = require('express')
const cors = require('cors')
const { PrismaClient } = require('@prisma/client')

const PORT = Number(process.env.PORT) || 5000
const CACHE_MS = Number(process.env.CACHE_MS || 60_000)
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'

const cache = new Map()
const prisma = new PrismaClient()

// Handle Prisma disconnection gracefully
process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

function buildCacheKey(prefix, symbol, extra = '') {
  return `${prefix}:${symbol}:${extra}`
}

function getCached(key) {
  const entry = cache.get(key)
  if (entry && entry.expires > Date.now()) {
    return entry.data
  }
  cache.delete(key)
  return null
}

function setCached(key, data) {
  cache.set(key, { data, expires: Date.now() + CACHE_MS })
}

function normalizeSymbol(raw) {
  return raw?.toString().trim().toUpperCase() || ''
}

function validateSymbol(raw) {
  const symbol = normalizeSymbol(raw)
  return symbol.length > 0 && /^[A-Z0-9.-]{1,12}$/.test(symbol)
}

async function safeFetchJson(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'MarketOracle/1.0',
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Upstream HTTP ${response.status}: ${text}`)
  }

  return response.json()
}

function makeQuotePayload(symbolData) {
  return {
    symbol: symbolData.symbol,
    shortName: symbolData.shortName || symbolData.longName || null,
    currency: symbolData.currency || null,
    marketState: symbolData.marketState || null,
    regularMarketPrice: symbolData.regularMarketPrice ?? null,
    regularMarketChange: symbolData.regularMarketChange ?? null,
    regularMarketChangePercent: symbolData.regularMarketChangePercent ?? null,
    regularMarketPreviousClose: symbolData.regularMarketPreviousClose ?? null,
    regularMarketOpen: symbolData.regularMarketOpen ?? null,
    regularMarketDayHigh: symbolData.regularMarketDayHigh ?? null,
    regularMarketDayLow: symbolData.regularMarketDayLow ?? null,
    regularMarketVolume: symbolData.regularMarketVolume ?? null,
    marketCap: symbolData.marketCap ?? null,
    fullExchangeName: symbolData.fullExchangeName ?? null,
    exchangeTimezoneName: symbolData.exchangeTimezoneName ?? null,
    regularMarketTime: symbolData.regularMarketTime ?? null,
  }
}

const app = express()
app.use(cors({ origin: ALLOWED_ORIGIN }))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

app.get('/api/search', async (req, res) => {
  const query = req.query.q?.toString().trim()
  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter q' })
  }

  const cacheKey = buildCacheKey('search', query)
  const cached = getCached(cacheKey)
  if (cached) {
    return res.json(cached)
  }

  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=en-US&region=US&quotesCount=10&newsCount=0`
    const data = await safeFetchJson(url)
    const results = (data.quotes || [])
      .filter(Boolean)
      .map((item) => ({
        symbol: item.symbol,
        name: item.shortname || item.longname || null,
        exchange: item.exchDisp || item.exchange || null,
      }))
      .slice(0, 10)

    if (!results.length) {
      return res.status(404).json({ error: 'No matching symbols found' })
    }

    const payload = { query, results }
    setCached(cacheKey, payload)
    res.json(payload)
  } catch (error) {
    res.status(502).json({ error: 'Unable to fetch search results', detail: error?.message || 'unknown' })
  }
})

app.get('/api/quote', async (req, res) => {
  const rawSymbol = req.query.symbol
  if (!validateSymbol(rawSymbol)) {
    return res.status(400).json({ error: 'Invalid or missing stock symbol' })
  }

  const symbol = normalizeSymbol(rawSymbol)
  const cacheKey = buildCacheKey('quote', symbol)
  const cached = getCached(cacheKey)
  if (cached) {
    return res.json(cached)
  }

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`
    const data = await safeFetchJson(url)
    const quoteData = data?.quoteResponse?.result?.[0]

    if (!quoteData) {
      return res.status(404).json({ error: 'Stock symbol not found' })
    }

    const payload = makeQuotePayload(quoteData)
    setCached(cacheKey, payload)
    res.json(payload)
  } catch (error) {
    res.status(502).json({ error: 'Unable to fetch stock quote', detail: error?.message || 'unknown' })
  }
})

const allowedRanges = ['1d', '5d', '1mo', '3mo', '6mo', '1y']
const allowedIntervals = ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1d', '1wk', '1mo']

app.get('/api/chart', async (req, res) => {
  const rawSymbol = req.query.symbol
  const range = req.query.range?.toString() || '1d'
  const interval = req.query.interval?.toString() || '5m'

  if (!validateSymbol(rawSymbol)) {
    return res.status(400).json({ error: 'Invalid or missing stock symbol' })
  }

  if (!allowedRanges.includes(range)) {
    return res.status(400).json({ error: `Invalid range. Allowed values: ${allowedRanges.join(', ')}` })
  }

  if (!allowedIntervals.includes(interval)) {
    return res.status(400).json({ error: `Invalid interval. Allowed values: ${allowedIntervals.join(', ')}` })
  }

  const symbol = normalizeSymbol(rawSymbol)
  const cacheKey = buildCacheKey('chart', symbol, `${range}:${interval}`)
  const cached = getCached(cacheKey)
  if (cached) {
    return res.json(cached)
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?region=US&lang=en-US&interval=${interval}&range=${range}`
    const data = await safeFetchJson(url)
    const result = data?.chart?.result?.[0]

    if (!result) {
      return res.status(404).json({ error: 'Chart data not available for this symbol' })
    }

    const timestamps = result.timestamp || []
    const quoteSeries = result.indicators?.quote?.[0] || {}
    const closes = quoteSeries.close || []
    const opens = quoteSeries.open || []
    const highs = quoteSeries.high || []
    const lows = quoteSeries.low || []
    const volumes = quoteSeries.volume || []

    const points = timestamps
      .map((timestamp, index) => ({
        time: new Date(timestamp * 1000).toISOString(),
        close: closes[index] ?? null,
        open: opens[index] ?? null,
        high: highs[index] ?? null,
        low: lows[index] ?? null,
        volume: volumes[index] ?? null,
      }))
      .filter((item) => item.close !== null)

    if (!points.length) {
      return res.status(404).json({ error: 'No valid chart points were returned' })
    }

    const payload = {
      symbol,
      range,
      interval,
      currency: result.meta?.currency || null,
      points,
    }

    setCached(cacheKey, payload)
    res.json(payload)
  } catch (error) {
    res.status(502).json({ error: 'Unable to fetch chart data', detail: error?.message || 'unknown' })
  }
})

// Database endpoints for storing and retrieving quotes
app.post('/api/db/save-quote', async (req, res) => {
  try {
    const { symbol, price, change, changePercent, open, high, low, volume, marketCap } = req.body

    if (!symbol || typeof price !== 'number') {
      return res.status(400).json({ error: 'Missing or invalid symbol/price' })
    }

    // Upsert Stock
    const stock = await prisma.stock.upsert({
      where: { symbol },
      update: { updatedAt: new Date() },
      create: {
        symbol,
        name: symbol, // Placeholder, will be updated later
      },
    })

    // Create Quote
    const quote = await prisma.quote.create({
      data: {
        symbol,
        price,
        change: change ?? 0,
        changePercent: changePercent ?? 0,
        open: open ?? null,
        high: high ?? null,
        low: low ?? null,
        volume: volume ?? null,
        marketCap: marketCap ?? null,
      },
    })

    res.json({ success: true, quote })
  } catch (error) {
    console.error('Database error:', error)
    res.status(500).json({ error: 'Unable to save quote', detail: error?.message || 'unknown' })
  }
})

app.get('/api/db/quotes/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params
    if (!validateSymbol(symbol)) {
      return res.status(400).json({ error: 'Invalid symbol' })
    }

    const quotes = await prisma.quote.findMany({
      where: { symbol: symbol.toUpperCase() },
      orderBy: { timestamp: 'desc' },
      take: 100,
    })

    res.json({ symbol: symbol.toUpperCase(), count: quotes.length, quotes })
  } catch (error) {
    console.error('Database error:', error)
    res.status(500).json({ error: 'Unable to fetch quotes', detail: error?.message || 'unknown' })
  }
})

app.get('/api/db/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', database: 'connected' })
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected', detail: error?.message })
  }
})

app.listen(PORT, () => {
  console.log(`MarketOracle backend proxy listening on http://localhost:${PORT}`)
})
