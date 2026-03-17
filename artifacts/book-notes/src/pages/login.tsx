import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuthStore } from "@/store/use-auth";
import { Button, Input, Label, PageTransition } from "@/components/ui";
import { BookOpen, AlertCircle } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const setAuth = useAuthStore(s => s.setAuth);
  const [errorMsg, setErrorMsg] = useState("");
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const loginMutation = useLogin();

  const onSubmit = (data: LoginForm) => {
    setErrorMsg("");
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        setAuth(res.user, res.token);
        setLocation("/");
      },
      onError: (err: any) => {
        setErrorMsg(err?.data?.error || "Failed to log in. Please check your credentials.");
      }
    });
  };

  return (
    <PageTransition className="min-h-screen grid lg:grid-cols-2">
      {/* Visual Side */}
      <div className="hidden lg:block relative bg-muted overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-background/50 z-10 mix-blend-overlay"></div>
        <img 
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`} 
          alt="Warm library interior" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20 z-10"></div>
        <div className="absolute bottom-12 left-12 z-20 text-white max-w-md">
          <h2 className="font-serif text-4xl font-bold mb-4 drop-shadow-md">Your digital commonplace book.</h2>
          <p className="text-lg opacity-90 drop-shadow-md">Capture thoughts, highlight quotes, and build your personal library of knowledge.</p>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
              <BookOpen className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Welcome back</h1>
            <p className="mt-2 text-muted-foreground">Sign in to access your notes and books</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {errorMsg && (
              <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="reader@example.com" 
                {...register("email")}
                className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                {...register("password")}
                className={errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base shadow-lg shadow-primary/25"
              isLoading={loginMutation.isPending}
            >
              Sign in
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline transition-all">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
