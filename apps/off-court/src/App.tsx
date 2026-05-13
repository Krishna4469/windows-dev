import { Route, Switch, Link, useLocation } from "wouter";

function Home() {
  return <div className="p-4 text-white">Home</div>;
}

function Book() {
  return <div className="p-4 text-white">Book a Court</div>;
}

function Twin() {
  return <div className="p-4 text-white">Twin</div>;
}

function Events() {
  return <div className="p-4 text-white">Events</div>;
}

function Profile() {
  return <div className="p-4 text-white">Profile</div>;
}

const tabs = [
  { path: "/", label: "Home", icon: "🏠" },
  { path: "/book", label: "Book", icon: "📅" },
  { path: "/twin", label: "Twin", icon: "⚡" },
  { path: "/events", label: "Events", icon: "🏆" },
  { path: "/profile", label: "Profile", icon: "👤" },
] as const;

function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex border-t border-neutral-800 bg-[#1a1a1a]">
      {tabs.map(({ path, label, icon }) => {
        const active = location === path;
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
          <Route path="/" component={Home} />
          <Route path="/book" component={Book} />
          <Route path="/twin" component={Twin} />
          <Route path="/events" component={Events} />
          <Route path="/profile" component={Profile} />
        </Switch>
      </main>
      <BottomNav />
    </div>
  );
}
