import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { useAuthStore } from "@/store/use-auth";
import { getGetMeQueryOptions } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/utils";

import { Layout } from "@/components/layout";
import Home from "@/pages/home";
import BookDetail from "@/pages/book-detail";
import Search from "@/pages/search";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status === 401) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuthStore();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;
  return <Component />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        
        <Route path="/">
          {() => <ProtectedRoute component={Home} />}
        </Route>
        
        <Route path="/books/:bookId">
          {() => <ProtectedRoute component={BookDetail} />}
        </Route>
        
        <Route path="/search">
          {() => <ProtectedRoute component={Search} />}
        </Route>
        
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { token, logout, updateUser, isAuthenticated } = useAuthStore();
  
  useEffect(() => {
    if (token && isAuthenticated) {
      // Validate token silently on mount
      queryClient.fetchQuery(getGetMeQueryOptions({ request: { headers: getAuthHeaders() } }))
        .then(user => updateUser(user))
        .catch(() => logout());
    }
  }, [token, isAuthenticated, logout, updateUser]);

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthInitializer>
    </QueryClientProvider>
  );
}

export default App;
