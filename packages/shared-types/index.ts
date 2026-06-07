export interface Prediction {
  symbol: string;
  signal: "BUY" | "SELL" | "HOLD";
  confidence: number;
}