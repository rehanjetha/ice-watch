import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import moment from "moment";

export default function ReadingsChart({ readings = [], dataKey = "temperature", label = "Temperature", color = "hsl(213, 94%, 52%)" }) {
  const chartData = readings
    .slice()
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
    .slice(-24)
    .map((r) => ({
      time: moment(r.created_date).format("HH:mm"),
      [dataKey]: r[dataKey],
    }));

  if (chartData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
        No data available yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 18%, 90%)" />
        <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="hsl(215, 10%, 48%)" />
        <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 10%, 48%)" />
        <Tooltip
          contentStyle={{
            background: "hsl(0, 0%, 100%)",
            border: "1px solid hsl(214, 18%, 90%)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          fill={`url(#gradient-${dataKey})`}
          strokeWidth={2}
          name={label}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}