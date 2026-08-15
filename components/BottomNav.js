"use client";

import styles from "./BottomNav.module.css";

const TABS = [
  { id: "vote", label: "Vote", icon: "🗳️" },
  { id: "leaderboard", label: "Leaderboard", icon: "🏆" },
  { id: "admin", label: "Admin", icon: "🛠️", adminOnly: true },
];

export default function BottomNav({ activeTab, onChange, isAdmin }) {
  const tabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ""}`}
          onClick={() => onChange(tab.id)}
          aria-current={activeTab === tab.id ? "page" : undefined}
        >
          <span className={styles.icon} aria-hidden="true">
            {tab.icon}
          </span>
          <span className={styles.label}>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
