import yfinance as yf
from tenacity import retry

@retry(stop=3)
def fetch_stock(symbol: str):

    ticker = yf.Ticker(symbol)

    data = ticker.history(
        period="1y",
        auto_adjust=True
    )

    return data