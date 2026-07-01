import { motion } from "framer-motion";

export default function StatCard({ icon: Icon, label, value, unit, subtitle, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border p-5 hover:shadow-lg transition-shadow duration-300"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-3xl font-bold tracking-tight">{value}</span>
            {unit && <span className="text-sm text-muted-foreground font-medium">{unit}</span>}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>
          )}
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color || "bg-primary/10"}`}>
          <Icon className={`h-5 w-5 ${color ? "text-white" : "text-primary"}`} />
        </div>
      </div>
    </motion.div>
  );
}