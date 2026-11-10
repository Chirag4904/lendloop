import styles from "./loader.module.css";

export function LoadingMark({ large = false }: { large?: boolean }) {
  return (
    <span
      className={`${styles.emblem} ${large ? styles.large : ""}`}
      aria-hidden="true"
    >
      <span className={styles.orbit} />
      <span className={styles.mark}>↔</span>
    </span>
  );
}

export function Loader({
  label = "Loading…",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`${styles.loader} ${compact ? styles.compact : ""}`}
      role="status"
    >
      <LoadingMark />
      <span>{label}</span>
    </div>
  );
}
