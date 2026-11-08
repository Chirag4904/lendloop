import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <Link href="/" className="brand">
        LendLoop<span className="brand-dot">.</span>
      </Link>
      <div className="auth-panel">
        <span className="kicker">COME ON IN</span>
        <h1>
          Meet your new
          <br />
          <em>neighborhood.</em>
        </h1>
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
          <SignUp
            routing="path"
            path="/sign-up"
            fallbackRedirectUrl="/onboarding"
          />
        ) : (
          <p>
            Sign-up will be available after Clerk keys are configured. See the
            README for setup.
          </p>
        )}
      </div>
    </main>
  );
}
