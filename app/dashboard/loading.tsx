import styles from "@/components/dashboard/dashboard-shell.module.css";

export default function Loading() {
  return (
    <div className={styles.routeLoading} role="status">
      Loading your page…
    </div>
  );
}
