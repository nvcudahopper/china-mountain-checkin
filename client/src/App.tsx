import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { MountainList } from "./pages/MountainList";
import { MountainDetail } from "./pages/MountainDetail";
import { Dashboard } from "./pages/Dashboard";
import { CheckinForm } from "./pages/CheckinForm";
import { AdminAdd } from "./pages/AdminAdd";
import { PerplexityAttribution } from "./components/PerplexityAttribution";
import { Mountain, BarChart3, PlusCircle, Settings } from "lucide-react";

function AppContent() {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <MountainLogo />
              <span className="text-lg font-bold text-gold-gradient">山行记</span>
            </div>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            <NavLink href="/" active={location === "/"} icon={<Mountain className="w-4 h-4" />} label="名山" />
            <NavLink href="/dashboard" active={location === "/dashboard"} icon={<BarChart3 className="w-4 h-4" />} label="看板" />
            <NavLink href="/checkin/new" active={location.startsWith("/checkin")} icon={<PlusCircle className="w-4 h-4" />} label="打卡" />
            <NavLink href="/admin/add" active={location.startsWith("/admin")} icon={<Settings className="w-4 h-4" />} label="管理" />
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Switch>
          <Route path="/" component={MountainList} />
          <Route path="/mountain/:id" component={MountainDetail} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/checkin/new" component={CheckinForm} />
          <Route path="/checkin/new/:mountainId" component={CheckinForm} />
          <Route path="/admin/add" component={AdminAdd} />
          <Route>
            <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
              <p>页面不存在</p>
            </div>
          </Route>
        </Switch>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border z-50">
        <div className="flex items-center justify-around h-14">
          <MobileNavLink href="/" active={location === "/"} icon={<Mountain className="w-5 h-5" />} label="名山" />
          <MobileNavLink href="/dashboard" active={location === "/dashboard"} icon={<BarChart3 className="w-5 h-5" />} label="看板" />
          <MobileNavLink href="/checkin/new" active={location.startsWith("/checkin")} icon={<PlusCircle className="w-5 h-5" />} label="打卡" />
          <MobileNavLink href="/admin/add" active={location.startsWith("/admin")} icon={<Settings className="w-5 h-5" />} label="管理" />
        </div>
      </nav>

      <footer className="hidden sm:block border-t border-border py-4 text-center">
        <PerplexityAttribution />
      </footer>
      <Toaster />
    </div>
  );
}

function NavLink({ href, active, icon, label }: { href: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href}>
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
        {icon}
        {label}
      </div>
    </Link>
  );
}

function MobileNavLink({ href, active, icon, label }: { href: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href}>
      <div className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
    </Link>
  );
}

function MountainLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="山行记" className="shrink-0">
      <path d="M4 22L10 8L14 16L18 10L24 22H4Z" stroke="hsl(42, 80%, 55%)" strokeWidth="2" strokeLinejoin="round" fill="none" />
      <path d="M10 8L12 12" stroke="hsl(42, 90%, 65%)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="20" cy="6" r="2" stroke="hsl(42, 80%, 55%)" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <AppContent />
      </Router>
    </QueryClientProvider>
  );
}
