export const formatCurrency = (
  value: number
) =>
  Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(value);