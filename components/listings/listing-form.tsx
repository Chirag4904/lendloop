"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader } from "@/components/ui/loader";
import type { Id } from "@/convex/_generated/dataModel";
import { Camera, ImagePlus, PackageOpen, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categories, conditions } from "./listing-options";
import { CameraCapture } from "./camera-capture";
import { prepareImage, uploadWithProgress } from "./image-processing";
import styles from "./listing-form.module.css";

type Photo = {
  key: string;
  id?: Id<"listingPhotos">;
  url: string;
  file?: File;
  progress?: number;
};
type InitialTool = {
  name: string;
  category: (typeof categories)[number];
  condition: keyof typeof conditions;
  description: string;
  dailyAmount: number | null;
  photos: { id: Id<"listingPhotos">; url: string | null }[];
};

export function ListingForm({ toolId }: { toolId?: Id<"tools"> }) {
  const tool = useQuery(api.tools.detail, toolId ? { toolId } : "skip") as
    InitialTool | null | undefined;
  if (toolId && tool === undefined) return <Loader label="Loading listing…" />;
  if (toolId && !tool) return <p role="alert">Listing unavailable.</p>;
  return <ListingEditor toolId={toolId} initial={tool ?? undefined} />;
}

function ListingEditor({
  toolId,
  initial,
}: {
  toolId?: Id<"tools">;
  initial?: InitialTool;
}) {
  const router = useRouter();
  const create = useMutation(api.tools.create),
    update = useMutation(api.tools.update),
    setStatus = useMutation(api.tools.setStatus);
  const uploadUrl = useMutation(api.photos.uploadUrl),
    register = useMutation(api.photos.register),
    setPhotos = useMutation(api.photos.setForTool);
  const [name, setName] = useState(initial?.name ?? ""),
    [category, setCategory] = useState<(typeof categories)[number]>(
      initial?.category ?? "Power Tools",
    ),
    [condition, setCondition] = useState<
      "likeNew" | "good" | "fair" | "wellUsed"
    >(
      initial?.condition === "new" ? "likeNew" : (initial?.condition ?? "good"),
    ),
    [description, setDescription] = useState(initial?.description ?? "");
  const [paid, setPaid] = useState(
      initial?.dailyAmount !== null && initial?.dailyAmount !== undefined,
    ),
    [rate, setRate] = useState(
      initial?.dailyAmount === null || initial?.dailyAmount === undefined
        ? ""
        : String(initial.dailyAmount / 100),
    );
  const [photos, setPhotoState] = useState<Photo[]>(
    () =>
      initial?.photos
        .filter((p) => p.url)
        .map((p) => ({ key: p.id, id: p.id, url: p.url! })) ?? [],
  );
  const photosRef = useRef<Photo[]>(photos);
  const [camera, setCamera] = useState(false),
    [preparingPhotos, setPreparingPhotos] = useState(0),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [createdId, setCreatedId] = useState<Id<"tools">>();
  function setPhotosState(next: Photo[] | ((items: Photo[]) => Photo[])) {
    const value = typeof next === "function" ? next(photosRef.current) : next;
    photosRef.current = value;
    setPhotoState(value);
  }
  useEffect(
    () => () => {
      photosRef.current.forEach((p) => {
        if (p.file) URL.revokeObjectURL(p.url);
      });
    },
    [],
  );
  async function add(files: FileList | File[]) {
    if (saving) return;
    setError("");
    const incoming = Array.from(files);
    if (photosRef.current.length + incoming.length > 5) {
      setError("Choose up to five photos in total.");
      return;
    }
    setPreparingPhotos((count) => count + 1);
    try {
      for (const file of incoming) {
        try {
          const prepared = await prepareImage(file);
          if (photosRef.current.length >= 5) {
            setError("Choose up to five photos in total.");
            break;
          }
          setPhotosState((items) => [
            ...items,
            {
              key: crypto.randomUUID(),
              file: prepared,
              url: URL.createObjectURL(prepared),
            },
          ]);
        } catch (e) {
          setError((e as Error).message);
        }
      }
    } finally {
      setPreparingPhotos((count) => count - 1);
    }
  }
  function remove(key: string) {
    const photo = photosRef.current.find((p) => p.key === key);
    if (photo?.file) URL.revokeObjectURL(photo.url);
    setPhotosState((items) => items.filter((p) => p.key !== key));
  }
  function move(index: number, offset: number) {
    const next = [...photosRef.current],
      target = index + offset;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPhotosState(next);
  }
  function makeCover(index: number) {
    const next = [...photosRef.current];
    next.unshift(next.splice(index, 1)[0]);
    setPhotosState(next);
  }
  function amount() {
    if (!paid) return undefined;
    if (!/^\d+(?:\.\d{1,2})?$/.test(rate))
      throw new Error("Enter a daily rate in rupees, up to two decimals.");
    const paise = Math.round(Number(rate) * 100);
    if (paise < 100 || paise > 1_000_000)
      throw new Error("Daily rate must be ₹1–₹10,000.");
    return paise;
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || preparingPhotos > 0) return;
    let dailyAmount: number | undefined;
    try {
      dailyAmount = amount();
      if (
        !name.trim() ||
        name.trim().length > 80 ||
        !description.trim() ||
        description.trim().length > 1000
      )
        throw new Error(
          "Add a name (up to 80 characters) and description (up to 1000 characters).",
        );
    } catch (e) {
      setError((e as Error).message);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const input = {
        name,
        category,
        condition,
        description,
        dailyAmount,
      };
      let id = toolId ?? createdId;
      if (id) await update({ toolId: id, ...input });
      else {
        id = await create(input);
        setCreatedId(id);
      }
      for (const photo of photosRef.current) {
        if (!photo.file || photo.id) continue;
        const hash = await crypto.subtle.digest(
          "SHA-256",
          await photo.file.arrayBuffer(),
        );
        const sha256 = btoa(String.fromCharCode(...new Uint8Array(hash)));
        const { url, ticketId } = await uploadUrl({ sha256 });
        const storageId = await uploadWithProgress(url, photo.file, (percent) =>
          setPhotosState((items) =>
            items.map((p) =>
              p.key === photo.key ? { ...p, progress: percent } : p,
            ),
          ),
        );
        const photoId = await register({
          ticketId,
          storageId: storageId as Id<"_storage">,
        });
        setPhotosState((items) =>
          items.map((p) =>
            p.key === photo.key ? { ...p, id: photoId, progress: 100 } : p,
          ),
        );
      }
      await setPhotos({
        toolId: id,
        photoIds: photosRef.current.map((p) => p.id!),
      });
      if (!toolId) await setStatus({ toolId: id, status: "active" });
      router.push("/dashboard/listings");
    } catch (e) {
      setError(
        `${(e as Error).message} Your changes are still here; retry when ready.`,
      );
    } finally {
      setSaving(false);
    }
  }
  const cover = photos[0];
  return (
    <section className={styles.studio}>
      <div className={`app-heading ${styles.heading}`}>
        <span className="kicker">THE LISTING STUDIO</span>
        <h1>
          {toolId
            ? "Make your listing feel like you."
            : "Give something useful a new adventure."}
        </h1>
        <p>
          {toolId
            ? "Update the details your neighbors see. You can unlist it anytime."
            : "Share something useful with neighbors. You can change or unlist it later."}
        </p>
      </div>
      <div className={styles.layout}>
        <form
          className={styles.editor}
          noValidate
          onSubmit={(event) => void save(event)}
        >
          <fieldset className="min-w-0" disabled={saving}>
            <h2 className={styles.sectionTitle}>
              <span>01</span> The essentials
            </h2>
            <p className={styles.hint}>
              Tell neighbors what makes your item useful.
            </p>
            <div className={styles.fields}>
              <div>
                <label className="field-label" htmlFor="item-name">
                  Item name
                </label>
                <input
                  id="item-name"
                  className="text-input"
                  maxLength={80}
                  required
                  placeholder="Bosch Cordless Drill"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="item-category">
                  Category
                </label>
                <select
                  id="item-category"
                  className="text-input"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as typeof category)
                  }
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="item-condition">
                  Condition
                </label>
                <select
                  id="item-condition"
                  className="text-input"
                  value={condition}
                  onChange={(e) =>
                    setCondition(e.target.value as typeof condition)
                  }
                >
                  {Object.entries(conditions)
                    .filter(([key]) => key !== "new")
                    .map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <label className="field-label" htmlFor="item-description">
              Description
            </label>
            <textarea
              id="item-description"
              className="text-input"
              rows={5}
              maxLength={1000}
              required
              placeholder="What is included? Anything a neighbor should know?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className={styles.subsection}>
              <h2 className={styles.sectionTitle}>
                <span>02</span> Photos <small>Optional · up to 5</small>
              </h2>
              <div className={styles.photoActions}>
                <label className={styles.upload}>
                  <Upload size={17} aria-hidden="true" /> Upload Photos
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) void add(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  className={styles.secondary}
                  onClick={() => setCamera(true)}
                >
                  <Camera size={17} aria-hidden="true" /> Take Photo
                </Button>
              </div>
              <div
                className={styles.dropZone}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void add(e.dataTransfer.files);
                }}
              >
                <ImagePlus size={21} aria-hidden="true" />{" "}
                <span>
                  Drop photos here{" "}
                  <small>JPEG, PNG or WebP · 5 MB max each</small>
                </span>
              </div>
              {photos.length > 0 && (
                <div className={styles.photoGrid}>
                  {photos.map((photo, index) => (
                    <div className={styles.photoTile} key={photo.key}>
                      <img
                        className="size-full object-cover"
                        src={photo.url}
                        alt={`Listing photo ${index + 1}`}
                      />
                      {index === 0 && (
                        <span className={styles.coverTag}>Cover</span>
                      )}
                      <div className={styles.photoControls}>
                        {index > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => makeCover(index)}
                            aria-label={`Set photo ${index + 1} as cover`}
                            title="Set as cover"
                          >
                            ★
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                          aria-label={`Move photo ${index + 1} earlier`}
                        >
                          ←
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={index === photos.length - 1}
                          onClick={() => move(index, 1)}
                          aria-label={`Move photo ${index + 1} later`}
                        >
                          →
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => remove(photo.key)}
                          aria-label={`Remove photo ${index + 1}`}
                        >
                          ×
                        </Button>
                      </div>
                      {photo.progress !== undefined && (
                        <small>Upload {photo.progress}%</small>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.subsection}>
              <h2 className={styles.sectionTitle}>
                <span>03</span> Your terms
              </h2>
              <p className={styles.hint}>
                Choose whether to lend for free or set a daily price.
              </p>
              <label className={styles.radio}>
                <input
                  type="radio"
                  name="price-kind"
                  checked={!paid}
                  onChange={() => setPaid(false)}
                />{" "}
                Free to borrow
              </label>
              <label className={styles.radio}>
                <input
                  type="radio"
                  name="price-kind"
                  checked={paid}
                  onChange={() => setPaid(true)}
                />{" "}
                Paid rental
              </label>
              {paid && (
                <div className="max-w-[260px]">
                  <label className="field-label" htmlFor="daily-rate">
                    Daily rate in INR
                  </label>
                  <input
                    id="daily-rate"
                    className="text-input"
                    inputMode="decimal"
                    placeholder="150"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                  />
                </div>
              )}
            </div>
            {error && (
              <p className="form-message error" role="alert">
                {error}
              </p>
            )}
            <div className={styles.actions}>
              <Button
                type="submit"
                className={`button-primary ${styles.primary}`}
                disabled={preparingPhotos > 0}
              >
                {saving
                  ? "Saving…"
                  : preparingPhotos > 0
                    ? "Preparing photos…"
                    : toolId
                      ? "Save changes"
                      : "Publish listing"}
              </Button>
            </div>
          </fieldset>
        </form>
        <aside className={styles.preview} aria-label="Live listing preview">
          <div className={styles.previewTop}>
            <span className="kicker">A LITTLE LOOK AHEAD</span>
            <h2>Listing preview</h2>
            <p>Your preview updates as you add details.</p>
          </div>
          <div className={styles.previewCard}>
            <div className={styles.previewImage}>
              {cover ? (
                <img
                  className="size-full object-cover"
                  src={cover.url}
                  alt="Listing cover preview"
                />
              ) : (
                <div>
                  <PackageOpen size={36} strokeWidth={1.2} aria-hidden="true" />
                  <span>Your item’s photo goes here</span>
                  <small>Photos are optional</small>
                </div>
              )}
            </div>
            <div className={styles.previewContent}>
              <span className="catalog-category">
                {category} · {conditions[condition]}
              </span>
              <h3>{name.trim() || "Your item’s name"}</h3>
              <p>
                {description.trim() ||
                  "A little about your item will appear here."}
              </p>
              <div className={styles.previewPrice}>
                <span>{paid ? "Daily rate" : "Sharing terms"}</span>
                <strong>
                  {paid
                    ? rate
                      ? `₹${rate} / day`
                      : "Set a daily rate"
                    : "Free to borrow"}
                </strong>
              </div>
            </div>
          </div>
          <p className={styles.previewNote}>
            {toolId
              ? "Your saved listing remains visible according to its current status."
              : "Your listing is visible after you publish it."}
          </p>
        </aside>
      </div>
      {camera && (
        <CameraCapture
          onUse={(file) => void add([file])}
          onClose={() => setCamera(false)}
        />
      )}
    </section>
  );
}
