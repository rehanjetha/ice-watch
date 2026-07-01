import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Map, Cpu, Bell, Snowflake, Navigation, Thermometer, ToggleLeft, ToggleRight } from "lucide-react";
import { useSensorData } from "@/lib/SensorDataContext";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/map", label: "Campus Map", icon: Map },
  { path: "/navigate", label: "Navigate", icon: Navigation },
  { path: "/sensors", label: "Sensors", icon: Cpu },
  { path: "/alerts", label: "Alerts", icon: Bell },
];

function DataModeToggle({ compact = false }) {
  const { mockMode, setMockMode, serverOnline } = useSensorData();

  if (compact) {
    return (
      <button
        onClick={() => setMockMode(!mockMode)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold transition-colors ${
          mockMode
            ? "bg-violet-500/15 text-violet-600"
            : serverOnline
            ? "bg-green-500/15 text-green-700"
            : "bg-red-500/15 text-red-600"
        }`}
      >
        {mockMode ? (
          <ToggleRight className="h-3 w-3" />
        ) : (
          <ToggleLeft className="h-3 w-3" />
        )}
        {mockMode ? "Mock" : "Live"}
      </button>
    );
  }

  return (
    <div className="p-3 m-3 rounded-xl bg-sidebar-accent/50 border border-sidebar-border space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-sidebar-foreground/40 font-medium">Data Source</p>
        <button
          onClick={() => setMockMode(!mockMode)}
          className={`relative w-9 h-5 rounded-full transition-colors ${
            mockMode ? "bg-violet-500" : "bg-muted-foreground/30"
          }`}
        >
          <div
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              mockMode ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {mockMode ? (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
          <span className="text-xs text-violet-500 font-medium">Mock Data (Simulated)</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${serverOnline ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          <span className="text-xs text-sidebar-foreground/70 font-medium">
            {serverOnline ? "Live Data Stream" : "Server Offline"}
          </span>
        </div>
      )}
    </div>
  );
}

function FreezingReferenceToggle({ compact = false }) {
  const {
    useDemoFreezingReference,
    setUseDemoFreezingReference,
    freezingReferenceTemperature,
  } = useSensorData();

  if (compact) {
    return (
      <button
        onClick={() => setUseDemoFreezingReference((current) => !current)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold transition-colors ${
          useDemoFreezingReference
            ? "bg-amber-500/15 text-amber-700"
            : "bg-slate-500/15 text-slate-600"
        }`}
      >
        <Thermometer className="h-3 w-3" />
        {freezingReferenceTemperature}C Freeze
      </button>
    );
  }

  return (
    <div className="p-3 mx-3 mb-3 rounded-xl bg-sidebar-accent/50 border border-sidebar-border space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] text-sidebar-foreground/40 font-medium">Freeze Reference</p>
          <p className="text-xs text-sidebar-foreground/70 mt-1">
            {useDemoFreezingReference ? "Demo mode: treat 20C as freezing" : "Normal mode: treat 0C as freezing"}
          </p>
        </div>
        <button
          onClick={() => setUseDemoFreezingReference((current) => !current)}
          className={`relative w-9 h-5 rounded-full transition-colors ${
            useDemoFreezingReference ? "bg-amber-500" : "bg-muted-foreground/30"
          }`}
        >
          <div
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              useDemoFreezingReference ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div
          className={`h-2 w-2 rounded-full ${
            useDemoFreezingReference ? "bg-amber-500 animate-pulse" : "bg-slate-400"
          }`}
        />
        <span className="text-xs text-sidebar-foreground/70 font-medium">
          {useDemoFreezingReference ? "Using 20C freezing reference" : "Using normal 0C freezing reference"}
        </span>
      </div>
    </div>
  );
}

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="p-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <Snowflake className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-sidebar-foreground tracking-tight">IceWatch</h1>
            <p className="text-[11px] text-sidebar-foreground/50 font-medium">York U · Keele Campus</p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <DataModeToggle />
          <FreezingReferenceToggle />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Snowflake className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">IceWatch</span>
          </div>
          <div className="flex items-center gap-2">
            <FreezingReferenceToggle compact />
            <DataModeToggle compact />
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden flex items-center justify-around border-t border-border bg-card py-2 px-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
