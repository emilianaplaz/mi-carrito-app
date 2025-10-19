export const BCVRate = () => {
  // Using hardcoded value for now
  const bcvRate = 230;

  return (
    <div className="text-sm bg-muted px-3 py-1 rounded-md font-medium">
      <span className="font-semibold">BCV:</span> Bs. {bcvRate.toFixed(2)}
    </div>
  );
};
