"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { MapPin, Wrench } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { Button } from "@/components/ui/button";
import styles from "./onboarding.module.css";

export function Onboarding() {
  const router = useRouter();
  const { profile, loading, error: profileError } = useCurrentProfile();
  const [term, setTerm] = useState("");
  const [name, setName] = useState("");
  const [locality, setLocality] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const societies = useQuery(api.societies.search, { term });
  const suggestions = useQuery(api.suggestions.mine, profile ? {} : "skip");
  const select = useMutation(api.users.selectSociety);
  const suggest = useMutation(api.suggestions.create);

  useEffect(() => {
    if (profile?.societyId) router.replace("/dashboard");
  }, [profile, router]);

  async function choose(societyId: Id<"societies">) {
    setBusy(true);
    setMessage("");
    try {
      await select({ societyId });
      router.replace("/dashboard");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save society.",
      );
      setBusy(false);
    }
  }

  async function submitSuggestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await suggest({
        name,
        locality: locality || undefined,
        city: city || undefined,
      });
      setMessage("Thanks! Your suggestion was sent for review.");
      setName("");
      setLocality("");
      setCity("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not send suggestion.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--cream)] px-6 pt-[30px] pb-[70px]">
      <header className={styles.header}>
        <Link className="brand" href="/">
          <span className={styles.brandMark}>
            <Wrench size={20} />
          </span>
          LendLoop<span className="brand-dot">.</span>
        </Link>
        <UserButton />
      </header>
      <div className={styles.layout}>
        <div className={styles.intro}>
          <span className="kicker">ONE SMALL STEP TO BEGIN</span>
          <h1>
            Where do you
            <br />
            <em>belong?</em>
          </h1>
          <p>
            Choose your society to make LendLoop feel closer to home. This
            selection is self-declared and doesn’t verify residency.
          </p>
        </div>
        <div className={styles.card}>
          <h2>Find your society</h2>
          <p>
            Search LendLoop’s neighborhood directory by society, locality, or
            city.
          </p>
          <label className="field-label" htmlFor="society-search">
            Society, locality, or city
          </label>
          <input
            id="society-search"
            className="text-input"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Start typing a name…"
            autoComplete="off"
          />
          <div className={styles.results} aria-live="polite">
            {societies === undefined || loading ? (
              <p className="form-message">Finding nearby places…</p>
            ) : societies.length ? (
              societies.map((s) => (
                <Button
                  className={styles.result}
                  variant="outline"
                  key={s._id}
                  onClick={() => void choose(s._id)}
                  disabled={busy || !profile}
                  type="button"
                >
                  <MapPin size={20} />
                  <span>
                    <strong>{s.name}</strong>
                    <small>
                      {s.locality}, {s.city}
                    </small>
                  </span>
                </Button>
              ))
            ) : (
              <p className="form-message">
                No matching societies yet. Try another search or suggest yours
                below.
              </p>
            )}
          </div>
          {profileError && (
            <p className="form-message error" role="alert">
              {profileError}
            </p>
          )}
          {message && (
            <p
              className={`form-message ${message.startsWith("Thanks") ? styles.success : "error"}`}
              role="status"
            >
              {message}
            </p>
          )}
          <details className={styles.suggestions}>
            <summary>Can’t find your society? Suggest it</summary>
            <form onSubmit={submitSuggestion}>
              <label className="field-label" htmlFor="suggest-name">
                Society name *
              </label>
              <input
                className="text-input"
                id="suggest-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={100}
              />
              <label className="field-label" htmlFor="suggest-locality">
                Locality (optional)
              </label>
              <input
                className="text-input"
                id="suggest-locality"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                maxLength={100}
              />
              <label className="field-label" htmlFor="suggest-city">
                City (optional)
              </label>
              <input
                className="text-input"
                id="suggest-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={100}
              />
              <Button type="submit" disabled={busy || !profile}>
                Send suggestion
              </Button>
              <p>
                Suggestions are reviewed before a society can appear in the
                directory.
              </p>
            </form>
          </details>
          {suggestions && suggestions.length > 0 && (
            <section
              className={styles.suggestions}
              aria-label="Your society suggestions"
            >
              <h3>Your suggestions</h3>
              {suggestions.map((item, index) => (
                <p key={`${item.name}-${index}`}>
                  {item.name}: <strong>{item.status}</strong>
                  {item.societyName
                    ? ` — ${item.societyName} is now available to choose`
                    : ""}
                </p>
              ))}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
