"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { DrillArtwork } from "./drill";
import { SceneArt, HAND_POSES } from "./scene-art";
import "./scroll-story.css";

gsap.registerPlugin(useGSAP, ScrollTrigger, CustomEase);
const HAND_EASE = CustomEase.create("handover", "0.77,0,0.175,1");

// Keep in sync with the stacked story media query in globals.css.
const STACKED_QUERY = "(max-width: 760px), (max-aspect-ratio: 1249/1000)";
const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
const CANVAS_W = 1440;
const CANVAS_H = 900;
// Section heights in svh, mirrored from CSS so the scrub lines up with the copy.
const DESKTOP_CHAPTER = 150;
const STACKED_CHAPTER = 75;
const STACKED_STAGE = 46;
// Extra scroll room for reach → shared hold → release; mirrored in globals.css.
const HANDOVER_EXTRA = 100;
const INK = "#152d3b";
const PAPER = "#f6f2e9";

/** Drill box in canvas units: top-left corner, width and rotation. */
type Pose = { x: number; y: number; w: number; r: number };

const poses: Pose[] = [
  { x: 840, y: 322, w: 420, r: 0 },
  { x: 322, y: 566, w: 54, r: 0 },
  { x: 877, y: 129, w: 250, r: 4 },
  { x: 500, y: 430, w: 440, r: 0 },
  { x: 930, y: 493, w: 240, r: 0 },
  { x: 625, y: 87, w: 170, r: 0 },
];
const receivedPose = { ...poses[3], x: poses[3].x + 90, y: poses[3].y - 25 };
// The final chapter carries the drill along the loop back to flat 4B.
const homeward: Pose[] = [
  { x: 471, y: 114, w: 170, r: -6 },
  { x: 307, y: 182, w: 170, r: -14 },
  { x: 205, y: 277, w: 170, r: -22 },
  { x: 175, y: 322, w: 170, r: -28 },
];
// Mid-flight poses keyed by the scene being entered.
const waypoints: Record<number, Pose> = {
  1: { x: 560, y: 60, w: 160, r: -10 },
};
// Stacked layouts show a narrow slice of the canvas, so each scene has a focal point.
const cameras = [
  { fx: 1060, fy: 470, s: 1.15 },
  { fx: 734, fy: 470, s: 0.95 },
  { fx: 1030, fy: 450, s: 1.15 },
  { fx: 720, fy: 600, s: 1.05 },
  { fx: 1050, fy: 520, s: 1 },
  { fx: 720, fy: 470, s: 0.9 },
];
const backgrounds = [INK, INK, INK, INK, PAPER, INK];
// "in" moves the camera closer on the way into a scene, "out" pulls back.
const zooms = ["out", "in", "in", "out", "out"] as const;
const statuses = [
  "Waiting",
  "Found nearby",
  "Approved",
  "Handed over",
  "In use",
  "Returned · ready again",
];

type Chapter = {
  id: string;
  label: string;
  title: ReactNode;
  body: string;
  layout: "side" | "top" | "middle";
  size?: "sm" | "xl";
  paper?: boolean;
  extra?: ReactNode;
};

const chapters: Chapter[] = [
  {
    id: "waiting",
    label: "01 / The waiting room",
    title: (
      <>
        Most things spend their life <em>waiting.</em>
      </>
    ),
    body: "Bought for one shelf, one weekend, one project. Then back in the cupboard for years. LendLoop gives everyday things a next pair of hands, right next door.",
    layout: "side",
    extra: (
      <div className="chapter-actions">
        <a href="#tools" className="button-primary lime-button">
          Find what’s next door <ArrowUpRight size={18} />
        </a>
        <a className="scroll-cue" href="#nearby">
          Follow the drill <ArrowDown size={16} />
        </a>
      </div>
    ),
  },
  {
    id: "nearby",
    label: "02 / Next door",
    title: (
      <>
        Closer than <em>the store.</em>
      </>
    ),
    body: "One neighbor has a drill that’s mostly resting. Another is putting up a shelf on Saturday. Start with your society and see what’s already around you.",
    layout: "top",
    size: "sm",
  },
  {
    id: "request",
    label: "03 / The ask",
    title: (
      <>
        One request. <em>A yes</em> from next door.
      </>
    ),
    body: "Pick your dates and send a request. The owner decides whether the dates and terms work, and nothing is reserved until they approve.",
    layout: "side",
    extra: (
      <ol className="request-steps">
        <li>Discover</li>
        <li>Choose dates</li>
        <li>Request</li>
        <li>Owner approves</li>
        <li>Agreement confirmed</li>
      </ol>
    ),
  },
  {
    id: "handover",
    label: "04 / The handover",
    title: (
      <>
        From one hand to <em>another.</em>
      </>
    ),
    body: "Agree on the terms and meet to hand it over.",
    layout: "top",
    size: "xl",
    extra: (
      <span className="chapter-footnote">
        Handover details are shared only between the two of you, after the
        agreement is confirmed.
      </span>
    ),
  },
  {
    id: "in-use",
    label: "05 / Put to use",
    title: (
      <>
        Saturday, <em>sorted.</em>
      </>
    ),
    body: "The shelf goes up in an afternoon. The drill does what it was made for, and nobody had to buy a second one.",
    layout: "side",
    size: "xl",
    paper: true,
  },
  {
    id: "return",
    label: "06 / Full circle",
    title: (
      <>
        It comes back. <em>The good keeps going.</em>
      </>
    ),
    body: "Report the return, the owner confirms, and the loop closes. The drill is home again, ready for the next pair of hands.",
    layout: "middle",
    extra: (
      <div className="chapter-actions">
        <Link
          href="/dashboard/listings/new"
          className="button-primary lime-button"
        >
          List something you own <ArrowUpRight size={18} />
        </Link>
        <a className="story-text-link" href="#our-story">
          Good things deserve to go around ↘
        </a>
      </div>
    ),
  },
];

const percent = (value: number, of: number) => `${(value / of) * 100}%`;

export function ScrollStory() {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      // matchMedia only calls back while a condition matches, hence "all".
      const conditions = {
        all: "all",
        stacked: STACKED_QUERY,
        reduce: REDUCE_QUERY,
      };
      media.add(conditions, (context) => {
        const el = root.current;
        if (!el) return;
        const stacked = Boolean(context.conditions?.stacked);
        const reduce = Boolean(context.conditions?.reduce);
        const stage = el.querySelector<HTMLElement>(".story-stage")!;
        const camera = el.querySelector<HTMLElement>(".stage-camera")!;
        const canvas = el.querySelector<HTMLElement>(".stage-canvas")!;
        const drill = el.querySelector<HTMLElement>(".traveling-drill")!;
        const tag = el.querySelector<HTMLElement>(".journey-tag")!;
        const handoverStatus =
          tag.querySelector<HTMLElement>(".handover-status")!;
        // A scene can span several layers (scene 4 draws a grip above the drill).
        const layers = poses.map((_, index) =>
          gsap.utils.toArray<HTMLElement>(
            `.scene-layer.scene-${index + 1}`,
            el,
          ),
        );
        const sections = gsap.utils.toArray<HTMLElement>(".story-chapter", el);
        // offsetWidth ignores the camera transform, unlike getBoundingClientRect.
        const unit = () => canvas.offsetWidth / CANVAS_W;
        const cameraAt = (index: number) => {
          const { fx, fy, s } = cameras[index];
          return stacked
            ? {
                // Reset GSAP's percentage inference from the CSS fallback offset.
                xPercent: 0,
                yPercent: 0,
                x: () => -(fx - CANVAS_W / 2) * unit() * s,
                y: () => -(fy - CANVAS_H / 2) * unit() * s,
                scale: s,
              }
            : { x: 0, y: 0, scale: 1 };
        };
        const setStep = (step: number) => {
          if (stage.dataset.step === String(step)) return false;
          stage.dataset.step = String(step);
          return true;
        };
        el.classList.add("is-enhanced");
        const cleanup = () => {
          el.classList.remove("is-enhanced");
          stage.dataset.step = "1";
          handoverStatus.textContent = "Handed over";
        };

        if (reduce) {
          gsap.set(".handover-receiver", { x: 5, y: -15 });
          gsap.set(".handover-lender", { x: -130, y: 65 });
          gsap.set([".handover-receiver-open", ".handover-lender-grip"], {
            opacity: 0,
          });
          gsap.set([".handover-receiver-grip", ".handover-lender-open"], {
            opacity: 1,
          });
          // Still scenes: cut between chapters without moving anything.
          let current = 0;
          const show = (index: number) => {
            current = index;
            const pose =
              index === 5
                ? homeward[homeward.length - 1]
                : index === 3
                  ? receivedPose
                  : poses[index];
            layers.forEach((layer, n) =>
              gsap.set(layer, { opacity: n === index ? 1 : 0 }),
            );
            gsap.set(stage, { backgroundColor: backgrounds[index] });
            gsap.set(drill, {
              left: percent(pose.x, CANVAS_W),
              top: percent(pose.y, CANVAS_H),
              width: percent(pose.w, CANVAS_W),
            });
            if (stacked) gsap.set(camera, cameraAt(index));
            setStep(index + 1);
          };
          show(0);
          sections.forEach((section, index) =>
            ScrollTrigger.create({
              trigger: section,
              start: "top 55%",
              end: "bottom 55%",
              onToggle: (self) => self.isActive && show(index),
            }),
          );
          const onRefresh = () => show(current);
          ScrollTrigger.addEventListener("refresh", onRefresh);
          return () => {
            ScrollTrigger.removeEventListener("refresh", onRefresh);
            cleanup();
          };
        }

        const chapter = stacked ? STACKED_CHAPTER : DESKTOP_CHAPTER;
        // Scroll distance over which the next chapter slides into place.
        const slide = stacked ? 100 - STACKED_STAGE : 100;
        const total =
          (stacked ? STACKED_STAGE : 0) +
          sections.length * chapter -
          100 +
          HANDOVER_EXTRA;
        const handoverStart = 3 * chapter;
        const handoverDuration = chapter - slide + HANDOVER_EXTRA;
        gsap.set(".handover-receiver-open", { opacity: 0 });
        gsap.set(".handover-receiver-grip", {
          attr: { d: HAND_POSES.receiverOpen },
          opacity: 1,
        });
        const base = poses[0];
        const drillAt = (pose: Pose) => ({
          x: () => (pose.x - base.x) * unit(),
          y: () => (pose.y - base.y) * unit(),
          scale: pose.w / base.w,
          rotation: pose.r,
        });

        gsap.set(drill, { transformOrigin: "0 0", ...drillAt(base) });
        layers.forEach((layer, n) =>
          gsap.set(layer, {
            opacity: n === 0 ? 1 : 0,
            transformOrigin: "50% 50%",
          }),
        );
        gsap.set([".thread-reveal", ".loop-path"], { strokeDashoffset: 1 });
        if (stacked)
          gsap.set(camera, { transformOrigin: "50% 50%", ...cameraAt(0) });
        const swing = gsap.fromTo(
          tag,
          { rotation: -11 },
          {
            rotation: -3,
            duration: 1.2,
            ease: "elastic.out(1, 0.35)",
            paused: true,
            immediateRender: false,
          },
        );

        const midpoints: number[] = [];
        const timeline = gsap.timeline({
          defaults: { ease: "none", immediateRender: false },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            invalidateOnRefresh: true,
          },
          onUpdate: () => {
            const time = timeline.time();
            const step = 1 + midpoints.filter((m) => time >= m).length;
            if (setStep(step)) swing.restart();
            const status =
              time >= handoverStart + handoverDuration * 0.64
                ? "Handed over"
                : "Handing over";
            if (handoverStatus.textContent !== status)
              handoverStatus.textContent = status;
          },
        });
        timeline.set({}, {}, total);
        timeline.fromTo(
          ".story-progress-fill",
          { scaleX: 0 },
          { scaleX: 1, duration: total },
          0,
        );

        for (let index = 1; index < sections.length; index++) {
          const start =
            index * chapter - slide + (index > 3 ? HANDOVER_EXTRA : 0);
          const closer = zooms[index - 1] === "in";
          midpoints.push(start + slide * 0.5);
          // Some flights arc over the incoming copy instead of crossing it.
          const via = waypoints[index];
          if (via)
            timeline
              .fromTo(
                drill,
                drillAt(poses[index - 1]),
                { ...drillAt(via), duration: slide * 0.4, ease: "sine.out" },
                start + slide * 0.1,
              )
              .fromTo(
                drill,
                drillAt(via),
                {
                  ...drillAt(poses[index]),
                  duration: slide * 0.4,
                  ease: "sine.in",
                },
                start + slide * 0.5,
              );
          else
            timeline.fromTo(
              drill,
              drillAt(index === 4 ? receivedPose : poses[index - 1]),
              {
                ...drillAt(poses[index]),
                duration: slide * (index === 4 ? 0.65 : 0.8),
              },
              start + slide * (index === 4 ? 0.25 : 0.1),
            );
          timeline
            .fromTo(
              layers[index - 1],
              { opacity: 1, scale: 1 },
              {
                opacity: 0,
                scale: index === 4 ? 1 : closer ? 1.08 : 0.94,
                duration: slide * (index === 4 ? 0.15 : 0.4),
              },
              start + slide * (index === 4 ? 0.05 : 0.15),
            )
            .fromTo(
              layers[index],
              { opacity: 0, scale: closer ? 0.94 : 1.08 },
              { opacity: 1, scale: 1, duration: slide * 0.45 },
              start + slide * 0.35,
            );
          // Shift the canvas color with the crossfade so no ghost panel lingers.
          if (backgrounds[index] !== backgrounds[index - 1])
            timeline.fromTo(
              stage,
              { backgroundColor: backgrounds[index - 1] },
              {
                backgroundColor: backgrounds[index],
                duration: slide * 0.5,
              },
              start + slide * 0.15,
            );
          if (stacked)
            timeline.fromTo(
              camera,
              cameraAt(index - 1),
              { ...cameraAt(index), duration: slide * 0.8 },
              start + slide * 0.1,
            );
        }

        // One opaque silhouette per hand; both grips overlap before release.
        timeline
          .fromTo(
            ".handover-receiver",
            { x: 0, y: 0 },
            {
              x: -85,
              y: 10,
              duration: handoverDuration * 0.32,
              ease: HAND_EASE,
            },
            handoverStart,
          )
          .to(
            ".handover-receiver-grip",
            {
              attr: { d: HAND_POSES.receiverClosed },
              duration: handoverDuration * 0.26,
              ease: HAND_EASE,
            },
            handoverStart + handoverDuration * 0.14,
          )
          .to(
            ".handover-lender-grip",
            {
              attr: { d: HAND_POSES.lenderOpen },
              duration: handoverDuration * 0.15,
              ease: HAND_EASE,
            },
            handoverStart + handoverDuration * 0.49,
          )
          .fromTo(
            ".handover-lender",
            { x: 0, y: 0 },
            {
              x: -130,
              y: 65,
              duration: handoverDuration * 0.26,
              ease: HAND_EASE,
            },
            handoverStart + handoverDuration * 0.64,
          )
          .fromTo(
            ".handover-receiver",
            { x: -85, y: 10 },
            {
              x: 5,
              y: -15,
              duration: handoverDuration * 0.27,
              ease: HAND_EASE,
            },
            handoverStart + handoverDuration * 0.68,
          )
          .fromTo(
            drill,
            drillAt(poses[3]),
            {
              ...drillAt(receivedPose),
              duration: handoverDuration * 0.27,
              ease: HAND_EASE,
            },
            handoverStart + handoverDuration * 0.68,
          );

        // The thread finds the neighbor while chapter 2 settles.
        timeline.fromTo(
          ".thread-reveal",
          { strokeDashoffset: 1 },
          {
            strokeDashoffset: 0,
            duration: slide * 0.5 + (chapter - slide) * 0.6,
          },
          chapter - slide * 0.5,
        );
        const finale = (sections.length - 1) * chapter + HANDOVER_EXTRA;
        timeline.fromTo(
          ".loop-path",
          { strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: slide * 0.6 },
          finale - slide * 0.6,
        );
        const leg = (total - finale) / homeward.length;
        homeward.forEach((pose, index) =>
          timeline.fromTo(
            drill,
            drillAt(
              index === 0 ? poses[poses.length - 1] : homeward[index - 1],
            ),
            { ...drillAt(pose), duration: leg },
            finale + index * leg,
          ),
        );
        return cleanup;
      });
      return () => media.revert();
    },
    { scope: root },
  );

  return (
    <div className="scroll-story" ref={root} id="how-it-works">
      <div className="story-stage" data-step="1">
        <div className="stage-camera">
          <div className="stage-canvas">
            <SceneArt />
            <div className="traveling-drill">
              <DrillArtwork />
            </div>
          </div>
        </div>
        <div className="journey-tag" aria-hidden="true">
          <div className="tag-card">
            <span className="tag-eyebrow">LENDLOOP · ITEM 001</span>
            <strong>Cordless drill</strong>
            <span className="tag-stamps">
              {statuses.map((status, index) => (
                <i key={status}>{index + 1}</i>
              ))}
            </span>
            <span className="tag-status">
              Status
              {statuses.map((status) => (
                <b
                  key={status}
                  className={
                    status === "Handed over" ? "handover-status" : undefined
                  }
                >
                  {status}
                </b>
              ))}
            </span>
          </div>
        </div>
        <div className="story-progress" aria-hidden="true">
          <span className="story-count" />
          <span className="story-progress-track">
            <span className="story-progress-fill" />
          </span>
        </div>
      </div>
      <div className="story-chapters">
        {chapters.map((chapter, index) => (
          <section
            className={[
              "story-chapter",
              `is-${chapter.layout}`,
              chapter.size && `is-${chapter.size}`,
              chapter.paper && "is-paper",
            ]
              .filter(Boolean)
              .join(" ")}
            id={chapter.id}
            key={chapter.id}
          >
            <div className="chapter-pin">
              <div className="chapter-copy">
                <span className="chapter-label">{chapter.label}</span>
                {index === 0 ? (
                  <h1>{chapter.title}</h1>
                ) : (
                  <h2>{chapter.title}</h2>
                )}
                <p>{chapter.body}</p>
                {chapter.extra}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
