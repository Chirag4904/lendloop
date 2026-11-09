"use client";
import { useEffect, useRef, useState } from "react";

export function CameraCapture({
  onUse,
  onClose,
}: {
  onUse: (file: File) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [shot, setShot] = useState<string>();
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          "Camera preview is unavailable here. Use Upload Photos instead.",
        );
        return;
      }
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.current = media;
        if (video.current) {
          video.current.srcObject = media;
          await video.current.play();
        }
      } catch {
        stream.current?.getTracks().forEach((track) => track.stop());
        stream.current = null;
        if (!cancelled)
          setError(
            "Camera access was denied or no camera is available. Use Upload Photos instead.",
          );
      }
    }
    void start();
    return () => {
      cancelled = true;
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
    };
  }, []);
  useEffect(() => {
    if (shot || !video.current || !stream.current) return;
    video.current.srcObject = stream.current;
    void video.current
      .play()
      .catch(() =>
        setError(
          "Camera preview is unavailable here. Use Upload Photos instead.",
        ),
      );
  }, [shot]);
  function capture() {
    const camera = video.current;
    if (!camera?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;
    canvas.getContext("2d")?.drawImage(camera, 0, 0);
    setShot(canvas.toDataURL("image/jpeg", 0.86));
  }
  async function confirmPhoto() {
    if (!shot) return;
    const blob = await (await fetch(shot)).blob();
    onUse(new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
    onClose();
  }
  return (
    <div
      className="camera-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="camera-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Take photo"
      >
        <div className="camera-head">
          <h2>Take a photo</h2>
          <button type="button" onClick={onClose} aria-label="Close camera">
            ×
          </button>
        </div>
        {error ? (
          <p role="alert">{error}</p>
        ) : shot ? (
          <img src={shot} alt="Captured photo preview" />
        ) : (
          <video
            ref={video}
            muted
            playsInline
            autoPlay
            aria-label="Camera preview"
          />
        )}
        <div className="camera-actions">
          {error && (
            <label className="upload-button">
              Use device camera
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onUse(file);
                    onClose();
                  }
                }}
              />
            </label>
          )}
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          {!error &&
            (shot ? (
              <>
                <button type="button" onClick={() => setShot(undefined)}>
                  Retake
                </button>
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => void confirmPhoto()}
                >
                  Use photo
                </button>
              </>
            ) : (
              <button
                type="button"
                className="button-primary"
                onClick={capture}
              >
                Capture
              </button>
            ))}
        </div>
      </section>
    </div>
  );
}
