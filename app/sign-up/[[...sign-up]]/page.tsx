import { SignUp } from "@clerk/nextjs";
import { AuthPage } from "@/components/auth/auth-page";

export default function SignUpPage() {
  return (
    <AuthPage
      kicker="COME ON IN"
      title={
        <>
          Meet your new
          <br />
          <em>neighborhood.</em>
        </>
      }
    >
      {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
        <SignUp
          routing="path"
          path="/sign-up"
          fallbackRedirectUrl="/onboarding"
        />
      ) : (
        <p>Sign-up is temporarily unavailable. Please try again later.</p>
      )}
    </AuthPage>
  );
}
