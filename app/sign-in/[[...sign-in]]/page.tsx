import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="auth-page">
      <Link href="/" className="brand">
        LendLoop<span className="brand-dot">.</span>
      </Link>
      <div className="auth-panel">
        <span className="kicker">WELCOME BACK</span>
        <h1>
          Good to see you
          <br />
          <em>again.</em>
        </h1>
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
          <SignIn
            routing="path"
            path="/sign-in"
            fallbackRedirectUrl="/dashboard"
          />
        ) : (
          <p>
            Sign-in will be available after Clerk keys are configured. See the
            README for setup.
          </p>
        )}
      </div>
    </main>
  );
}
