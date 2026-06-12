from collectors.yahoo_collector import fetch_stock

def sync_stock(symbol):

    data = fetch_stock(symbol)

    for date, row in data.iterrows():

        save_to_db(
            symbol=symbol,
            date=date,
            open=row["Open"],
            high=row["High"],
            low=row["Low"],
            close=row["Close"],
            volume=row["Volume"]
        )