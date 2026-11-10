"use client";

import { useEffect, useRef } from "react";

export function ProductDemoVideo() {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = video.current;
    if (
      !element ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        void element.play().catch(() => {});
        observer.disconnect();
      },
      { threshold: 0.25 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={video}
      className="product-demo-video"
      width="1920"
      height="1080"
      muted
      controls
      playsInline
      preload="none"
      poster="/videos/lendloop-demo-poster.jpg"
      aria-label="LendLoop product demo"
    >
      <source src="/videos/lendloop-demo.mp4" type="video/mp4" />
      Your browser does not support HTML video.
    </video>
  );
}
