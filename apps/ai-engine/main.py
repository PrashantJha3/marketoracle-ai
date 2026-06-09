from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="MarketOracle AI Engine",
    description="Stock intelligence and prediction engine",
    version="0.1.0",
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "ai-engine"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "MarketOracle AI Engine",
        "version": "0.1.0",
        "endpoints": {
            "health": "/health",
            "indicators": "/api/v1/indicators",
            "predict": "/api/v1/predict",
        },
    }


@app.get("/api/v1/indicators")
async def get_indicators(symbol: str):
    """Get technical indicators for a stock symbol (Milestone 4)"""
    return {"symbol": symbol, "message": "Indicators endpoint - Milestone 4"}


@app.post("/api/v1/predict")
async def predict_stock(symbol: str, days: int = 5):
    """Predict stock price movement (Milestone 6)"""
    return {
        "symbol": symbol,
        "days": days,
        "message": "Prediction endpoint - Milestone 6",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
