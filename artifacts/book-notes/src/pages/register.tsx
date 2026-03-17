import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister } from "@workspace/api-client-react";
import { useAuthStore } from "@/store/use-auth";
import { Button, Input, Label, PageTransition } from "@/components/ui";
import { Library, AlertCircle } from "lucide-react";

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const setAuth = useAuthStore(s => s.setAuth);
  const [errorMsg, setErrorMsg] = useState("");
  
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema)
  });

  const registerMutation = useRegister();

  const onSubmit = (data: RegisterForm) => {
    setErrorMsg("");
    registerMutation.mutate({ data }, {
      onSuccess: (res) => {
        setAuth(res.user, res.token);
        setLocation("/");
      },
      onError: (err: any) => {
        setErrorMsg(err?.data?.error || "Registration failed. Please try again.");
      }
    });
  };

  return (
    <PageTransition className="min-h-screen grid lg:grid-cols-2">
      {/* Visual Side */}
      <div className="hidden lg:block relative bg-muted overflow-hidden order-last">
        <div className="absolute inset-0 bg-gradient-to-tr from-accent/20 to-primary/10 z-10 mix-blend-overlay"></div>
        <img 
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`} 
          alt="Warm library interior" 
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-black/20 z-10"></div>
        <div className="absolute bottom-12 right-12 z-20 text-white max-w-md text-right">
          <h2 className="font-serif text-4xl font-bold mb-4 drop-shadow-md">Start your journey.</h2>
          <p className="text-lg opacity-90 drop-shadow-md">Every great book deserves to be remembered. Join us and organize your reading life.</p>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
              <Library className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Create account</h1>
            <p className="mt-2 text-muted-foreground">Sign up to start organizing your books</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {errorMsg && (
              <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                placeholder="bookworm99" 
                {...register("username")}
                className={errors.username ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.username && <p className="text-sm text-destructive mt-1">{errors.username.message}</p>}
            </div>

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
              isLoading={registerMutation.isPending}
            >
              Sign up
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline transition-all">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
