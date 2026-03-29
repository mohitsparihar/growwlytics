import { Suspense } from "react";
import LoginForm from "./login-form";

function LoginFormFallback() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden>
      <div className="h-7 bg-gray-100 rounded w-2/5" />
      <div className="h-4 bg-gray-100 rounded w-3/5" />
      <div className="h-10 bg-gray-100 rounded-lg" />
      <div className="h-10 bg-gray-100 rounded-lg" />
      <div className="h-10 rounded-lg bg-indigo-200/60" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
