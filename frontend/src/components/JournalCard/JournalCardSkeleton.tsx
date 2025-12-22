/**
 * JournalCard Loading Skeleton
 *
 * Displays a loading placeholder that matches the JournalCard layout
 * with shimmer animation for perceived performance.
 */

import styles from './JournalCardSkeleton.module.css'

export function JournalCardSkeleton() {
  return (
    <div className={styles.card} aria-label="Loading journal card">
      <div className={styles.header}>
        <div className={styles.sentimentSkeleton} />
        <div className={styles.dateSkeleton} />
      </div>
      <div className={styles.titleSkeleton} />
      <div className={styles.synopsisLine1} />
      <div className={styles.synopsisLine2} />
      <div className={styles.themes}>
        <div className={styles.themeSkeleton} />
        <div className={styles.themeSkeleton} />
        <div className={styles.themeSkeleton} />
      </div>
      <div className={styles.footer}>
        <div className={styles.footerSkeleton} />
      </div>
    </div>
  )
}

export default JournalCardSkeleton
