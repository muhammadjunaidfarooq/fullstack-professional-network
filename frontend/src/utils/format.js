const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now", "5m", "3h", "2d", then a short date like "Oct 7" (or "Oct 7, 2025"). */
export const timeAgo = (date, now = Date.now()) => {
  if (!date) return "";
  const time = new Date(date).getTime();
  if (Number.isNaN(time)) return "";
  const diff = Math.max(0, now - time);

  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d`;

  const sameYear = new Date(time).getFullYear() === new Date(now).getFullYear();
  return new Date(time).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
};

export const fullDate = (date) =>
  date
    ? new Date(date).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

export const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";

export const pluralize = (count, word, plural = `${word}s`) =>
  `${count} ${count === 1 ? word : plural}`;

/** Sentence-friendly version of timeAgo: "just now", "5m ago", "on Oct 7". */
export const timeAgoLong = (date) => {
  const short = timeAgo(date);
  if (!short || short === "just now") return short;
  return /^\d/.test(short) ? `${short} ago` : `on ${short}`;
};
