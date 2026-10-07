import styles from "./styles.module.css";

export const Spinner = ({ size = 28, label = "Loading" }) => (
  <span className={styles.spinnerWrap} role="status">
    <span className={styles.spinner} style={{ width: size, height: size }} />
    <span className="visually-hidden">{label}</span>
  </span>
);

export const PageLoader = ({ label = "Loading" }) => (
  <div className={styles.pageLoader}>
    <Spinner size={36} label={label} />
  </div>
);

/** Friendly message for empty lists and errors, with an optional action button. */
export const StateMessage = ({ icon, title, description, action, tone = "neutral" }) => (
  <div className={`${styles.state} ${tone === "error" ? styles.stateError : ""}`}>
    {icon && <div className={styles.stateIcon}>{icon}</div>}
    {title && <p className={styles.stateTitle}>{title}</p>}
    {description && <p className={styles.stateDescription}>{description}</p>}
    {action && <div className={styles.stateAction}>{action}</div>}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <StateMessage
    tone="error"
    title="Something went wrong"
    description={message}
    action={
      onRetry && (
        <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>
          Try again
        </button>
      )
    }
  />
);
