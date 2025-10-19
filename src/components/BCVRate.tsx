import { useEffect, useState } from "react";

export const BCVRate = () => {
  const [bcvRate, setBcvRate] = useState<number | null>(null);

  useEffect(() => {
    fetchBCVRate();
  }, []);

  const fetchBCVRate = async () => {
    try {
      const response = await fetch("https://api.dolarvzla.com/public/exchange-rate");
      const data = await response.json();
      if (data && data.usd) {
        setBcvRate(data.usd);
      }
    } catch (error) {
      console.error("Error fetching BCV rate:", error);
    }
  };

  if (!bcvRate) return null;

  return (
    <div className="text-sm bg-muted px-3 py-1 rounded-md">
      <span className="font-semibold">BCV:</span> Bs. {bcvRate.toFixed(2)}
    </div>
  );
};
