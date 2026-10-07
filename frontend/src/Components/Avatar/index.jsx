/* eslint-disable @next/next/no-img-element -- images come from our API and are already resized to WebP */
import { useState } from "react";
import { assetUrl } from "@/config";
import { initials } from "@/utils/format";
import styles from "./styles.module.css";

const COLORS = ["#0a66c2", "#057642", "#915907", "#7a3e9d", "#b24020", "#0e7490"];

const colorFor = (name = "") => {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
};

const AvatarImage = ({ url, name, size }) => {
  const [failed, setFailed] = useState(false);
  const fontSize = Math.max(11, Math.round(size * 0.38));

  if (!url || failed) {
    return (
      <span
        className={styles.fallback}
        style={{ width: size, height: size, fontSize, background: colorFor(name) }}
        aria-hidden="true"
      >
        {initials(name)}
      </span>
    );
  }

  return (
    <img
      className={styles.image}
      src={url}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
    />
  );
};

/** Round profile picture with an initials fallback. */
const Avatar = ({ src, name, size = 48, className = "" }) => {
  const url = assetUrl(src);
  return (
    <span
      className={`${styles.avatar} ${className}`}
      style={{ width: size, height: size }}
      title={name}
    >
      <AvatarImage key={url || "none"} url={url} name={name} size={size} />
    </span>
  );
};

export default Avatar;
