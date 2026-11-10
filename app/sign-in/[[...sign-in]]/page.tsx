import { SignIn } from "@clerk/nextjs";
import { AuthPage } from "@/components/auth/auth-page";

export default function SignInPage() {
  return (
    <AuthPage
      kicker="WELCOME BACK"
      title={
        <>
          Good to see you
          <br />
          <em>again.</em>
        </>
      }
    >
      {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
        <SignIn
          routing="path"
          path="/sign-in"
          fallbackRedirectUrl="/dashboard"
        />
      ) : (
        <p>Sign-in is temporarily unavailable. Please try again later.</p>
      )}
    </AuthPage>
  );
}
