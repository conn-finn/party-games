"use client";

import Link from "next/link";
import styles from "./RoomEnded.module.css";

export default function RoomEnded({ code }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.emoji} aria-hidden="true">
        🎊
      </div>
      <h1>That&apos;s a wrap!</h1>
      <p>
        The admin ended room <strong>{code}</strong>. Thanks for playing — final scores are no longer editable.
      </p>
      <Link href="/" className="btn btn-primary">
        Start a new game night
      </Link>
    </div>
  );
}
