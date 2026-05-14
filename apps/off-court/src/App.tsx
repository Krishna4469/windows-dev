import { Suspense, Component } from "react";
import type { ReactNode } from "react";
import { Route, Switch, Link, useLocation } from "wouter";
import { EventsPage } from "./components/EventsPage";
import { EventDetail } from "./components/EventDetail";
import { VenueTwin } from "./components/VenueTwin";
import FinancialDashboard from "./components/FinancialDashboard";
import GSTDashboard from "./components/GSTDashboard";
import HomeScreen from "./components/HomeScreen";
import BookingFlow from "./components/BookingFlow";
import Profile from "./components/Profile";

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: '60vh',
      background: '#0d0d0d',
      gap: '1.5rem',
    }}>
      <style>{`
        @keyframes oc-spin { to { transform: rotate(360deg); } }
        @keyframes oc-pulse { 0%,100% { opacity:0.35; } 50% { opacity:1; } }
      `}</style>
      <div style={{
        width: '3rem', height: '3rem', borderRadius: '50%',
        border: '3px solid #2a1520', borderTopColor: '#6B2737',
        animation: 'oc-spin 0.85s linear infinite',
      }} />
      <div style={{
        fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.28em',
        color: '#f5f5f5', fontFamily: 'system-ui, sans-serif',
        animation: 'oc-pulse 2.2s ease-in-out infinite',
      }}>
        OFF COURT
      </div>
    </div>
  );
}

interface EBState { error: Error | null }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', minHeight: '60vh',
          background: '#0d0d0d', gap: '0.875rem', padding: '2rem',
          textAlign: 'center', fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ fontSize: '2.25rem' }}>⚠️</div>
          <div style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '1rem' }}>
            Something went wrong
          </div>
          <div style={{ color: '#737373', fontSize: '0.78rem', maxWidth: '16rem', lineHeight: 1.55 }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: '0.375rem', background: '#6B2737', color: '#fff',
              border: 'none', borderRadius: '999px', padding: '0.625rem 1.75rem',
              fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Guarded({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

const tabs = [
  { path: "/",        label: "Home",    icon: "🏠" },
  { path: "/book",    label: "Book",    icon: "📅" },
  { path: "/twin",    label: "Twin",    icon: "⚡" },
  { path: "/events",  label: "Events",  icon: "🏆" },
  { path: "/finance", label: "Finance", icon: "💰" },
] as const;

function BottomNav() {
  const [location] = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex border-t border-neutral-800 bg-[#1a1a1a]">
      {tabs.map(({ path, label, icon }) => {
        const active =
          path === "/"
            ? location === "/"
            : location === path || location.startsWith(path + "/");
        return (
          <Link
            key={path}
            href={path}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
              active ? "text-white" : "text-neutral-500"
            }`}
          >
            <span className="text-xl leading-none">{icon}</span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function App() {
  return (
    <div className="flex h-dvh max-w-md mx-auto flex-col bg-[#1a1a1a]">
      <main className="flex-1 overflow-y-auto pb-16">
        <Switch>
          <Route path="/">{() => <Guarded><HomeScreen /></Guarded>}</Route>
          <Route path="/book">{() => <Guarded><BookingFlow /></Guarded>}</Route>
          <Route path="/twin">{() => <Guarded><VenueTwin /></Guarded>}</Route>
          <Route path="/events/:id">{() => <Guarded><EventDetail /></Guarded>}</Route>
          <Route path="/events">{() => <Guarded><EventsPage /></Guarded>}</Route>
          <Route path="/profile">{() => <Guarded><Profile /></Guarded>}</Route>
          <Route path="/finance">{() => <Guarded><FinancialDashboard /></Guarded>}</Route>
          <Route path="/gst">{() => <Guarded><GSTDashboard venueId="demo-venue" /></Guarded>}</Route>
        </Switch>
      </main>
      <BottomNav />
    </div>
  );
}
