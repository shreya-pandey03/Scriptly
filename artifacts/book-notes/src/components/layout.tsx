import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuthStore } from "@/store/use-auth";
import { useCollabStore } from "@/store/use-collab";
import { useThemeStore } from "@/store/use-theme";
import { BookOpen, Search, LogOut, Library, Moon, Sun } from "lucide-react";
import { PageTransition } from "./ui";

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout, isAuthenticated } = useAuthStore();
  const { connect, disconnect } = useCollabStore();
  const { theme, toggle } = useThemeStore();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }
    return () => {};
  }, [isAuthenticated, connect, disconnect]);

  const handleLogout = () => {
    disconnect();
    logout();
    setLocation("/login");
  };

  if (!isAuthenticated) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity">
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <Library className="w-5 h-5" />
            </div>
            <span className="font-serif font-bold text-xl tracking-tight hidden sm:inline-block">BookNotes</span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3">
            <Link href="/search" className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors">
              <Search className="w-5 h-5" />
            </Link>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggle}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="h-6 w-px bg-border mx-1"></div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold leading-none text-foreground">{user?.username}</span>
                <span className="text-xs text-muted-foreground mt-1">{user?.email}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold font-serif text-sm border border-primary/30">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors ml-1"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </div>
  );
}
