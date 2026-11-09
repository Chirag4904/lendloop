"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { DrillArtwork } from "./drill";
import { SceneArt } from "./scene-art";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const chapters = [
  {
    id: "forgotten",
    label: "01 / A DIFFERENT WAY TO OWN",
    title: "You don’t need to own everything you need.",
    body: "Some things are bought for a single afternoon. Then spend years waiting to be useful again.",
  },
  {
    id: "nearby",
    label: "02 / A LITTLE CLOSER",
    title: "What you need might already be next door.",
    body: "One neighbor has a drill gathering dust. Another has a shelf waiting to go up. Start with your society. See what’s already around you.",
  },
  {
    id: "request",
    label: "03 / THE CONNECTION",
    title: "One simple request. Two people benefit.",
    body: "Discover an item. Choose your dates. Request to borrow. When the owner approves, your agreement is confirmed.",
  },
  {
    id: "handover",
    label: "04 / THE GOOD PART",
    title: "From one home to another.",
    body: "Agree on the terms, borrow what you need, and return it when you’re done.",
  },
  {
    id: "return",
    label: "05 / FULL CIRCLE",
    title: "The item comes back. The value stays.",
    body: "A finished project. A useful object, useful again. And a neighborhood with a little more to share.",
  },
];

export function ScrollStory() {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add(
        {
          desktop: "(min-width: 761px)",
          mobile: "(max-width: 760px)",
          reduce: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          if (context.conditions?.reduce) return;
          const mobile = context.conditions?.mobile;
          const panels = gsap.utils.toArray<HTMLElement>(".story-chapter");
          const layers = gsap.utils.toArray<HTMLElement>(".scene-layer");
          gsap.set(layers.slice(1), { opacity: 0 });
          const timeline = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: "bottom bottom",
              scrub: true,
              invalidateOnRefresh: true,
            },
          });
          const positions = [
            { xPercent: 0, yPercent: 0, rotation: 0, scale: 1 },
            { xPercent: -20, yPercent: 0, rotation: 8, scale: 0.72 },
            {
              xPercent: 0,
              yPercent: mobile ? 18 : -3,
              rotation: 0,
              scale: mobile ? 0.55 : 0.65,
            },
            { xPercent: 22, yPercent: 0, rotation: -12, scale: 0.65 },
            { xPercent: 0, yPercent: 0, rotation: 0, scale: 0.85 },
          ];
          positions.slice(1).forEach((position, index) => {
            const time = index + 0.3;
            timeline
              .to(
                ".traveling-drill",
                index === 3
                  ? {
                      keyframes: [
                        {
                          xPercent: 0,
                          yPercent: 22,
                          rotation: 6,
                          scale: 0.65,
                          duration: 0.2,
                        },
                        {
                          xPercent: -22,
                          yPercent: 0,
                          rotation: 12,
                          scale: 0.65,
                          duration: 0.25,
                        },
                        { ...position, duration: 0.25 },
                      ],
                      duration: 0.7,
                    }
                  : { ...position, duration: 0.7 },
                time,
              )
              .to(layers[index], { opacity: 0, duration: 0.25 }, time)
              .to(
                layers[index + 1],
                { opacity: 1, duration: 0.3 },
                time + 0.25,
              );
          });
          timeline.to(".story-progress-fill", { scaleX: 1, duration: 4 }, 0);
          if (!mobile)
            panels.forEach((panel) =>
              gsap.from(panel.querySelector(".chapter-copy"), {
                y: 25,
                duration: 0.6,
                ease: "power3.out",
                scrollTrigger: {
                  trigger: panel,
                  start: "top 85%",
                  toggleActions: "play none none reverse",
                },
              }),
            );
        },
      );
      return () => media.revert();
    },
    { scope: root },
  );

  return (
    <div className="scroll-story" ref={root} id="how-it-works">
      <div
        className="story-stage"
        aria-label="Illustrated journey of one drill between two homes"
      >
        <div className="stage-inner">
          <SceneArt />
          <div className="traveling-drill">
            <DrillArtwork />
          </div>
          <span className="art-note">ONE DRILL. MORE POSSIBILITIES.</span>
        </div>
        <div className="story-progress" aria-hidden="true">
          <span className="story-progress-fill" />
        </div>
      </div>
      <div className="story-chapters">
        {chapters.map((chapter, index) => (
          <section className="story-chapter" id={chapter.id} key={chapter.id}>
            <div className="chapter-copy">
              <span className="chapter-label">{chapter.label}</span>
              {index === 0 ? (
                <h1>
                  You don’t need
                  <br />
                  to own <em>everything</em>
                  <br />
                  you need.
                </h1>
              ) : (
                <h2>{chapter.title}</h2>
              )}
              <p>{chapter.body}</p>
              {index === 0 && (
                <>
                  <a href="#tools" className="button-primary lime-button">
                    Explore LendLoop <ArrowUpRight size={18} />
                  </a>
                  <a className="scroll-cue" href="#nearby">
                    Scroll to discover <ArrowDown size={16} />
                  </a>
                </>
              )}
              {index === 2 && (
                <ol className="request-steps">
                  <li>Discover</li>
                  <li>Select dates</li>
                  <li>Request</li>
                  <li>Owner approves</li>
                  <li>Agreement confirmed</li>
                </ol>
              )}
              {index === 3 && (
                <span className="chapter-footnote">
                  Private handover details. Only for the two of you.
                </span>
              )}
              {index === 4 && (
                <a className="story-text-link" href="#our-story">
                  Good things deserve to go around ↘
                </a>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
