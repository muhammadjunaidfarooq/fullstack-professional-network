import { useState } from "react";
import { useDispatch } from "react-redux";
import ConfirmDialog from "@/Components/ConfirmDialog";
import { CheckIcon, ClockIcon, UserPlusIcon } from "@/Components/Icons";
import { useToast } from "@/Components/Toast";
import {
  cancelConnectionRequest,
  removeConnection,
  respondToConnectionRequest,
  sendConnectionRequest,
} from "@/config/redux/action/connectionAction";
import styles from "./styles.module.css";

/**
 * Shows the right action for the relationship with another user and keeps it
 * in sync after each click. `connection` = { status, requestId } from the API.
 */
const ConnectionButton = ({ userId, name, connection, onChange, size = "sm", fullWidth = false }) => {
  const dispatch = useDispatch();
  const toast = useToast();
  const [state, setState] = useState(connection || { status: "none", requestId: null });
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null); // "withdraw" | "remove" | null

  const sizeClass = size === "sm" ? "btn-sm" : "";
  const widthClass = fullWidth ? "btn-block" : "";

  const run = async (thunk, successMessage) => {
    setBusy(true);
    try {
      const result = await dispatch(thunk).unwrap();
      setState(result.connection);
      onChange?.(result.connection);
      if (successMessage) toast.success(successMessage);
    } catch (error) {
      toast.error(error?.message || "Something went wrong");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  if (state.status === "self") return null;

  let content;
  if (state.status === "connected") {
    content = (
      <button
        type="button"
        className={`btn btn-secondary ${sizeClass} ${widthClass}`}
        onClick={() => setConfirm("remove")}
        disabled={busy}
        title="Remove connection"
      >
        <CheckIcon size={16} /> Connected
      </button>
    );
  } else if (state.status === "pending_sent") {
    content = (
      <button
        type="button"
        className={`btn btn-secondary ${sizeClass} ${widthClass}`}
        onClick={() => setConfirm("withdraw")}
        disabled={busy}
        title="Withdraw invitation"
      >
        <ClockIcon size={16} /> Pending
      </button>
    );
  } else if (state.status === "pending_received") {
    content = (
      <div className={`${styles.group} ${fullWidth ? styles.groupFull : ""}`}>
        <button
          type="button"
          className={`btn btn-primary ${sizeClass}`}
          disabled={busy}
          onClick={() =>
            run(
              respondToConnectionRequest({ requestId: state.requestId, action: "accept" }),
              `You are now connected with ${name || "this user"}`
            )
          }
        >
          Accept
        </button>
        <button
          type="button"
          className={`btn btn-ghost ${sizeClass}`}
          disabled={busy}
          onClick={() =>
            run(
              respondToConnectionRequest({ requestId: state.requestId, action: "reject" }),
              "Invitation ignored"
            )
          }
        >
          Ignore
        </button>
      </div>
    );
  } else {
    content = (
      <button
        type="button"
        className={`btn btn-outline ${sizeClass} ${widthClass}`}
        disabled={busy}
        onClick={() => run(sendConnectionRequest({ userId }), "Invitation sent")}
      >
        <UserPlusIcon size={16} /> {busy ? "Sending…" : "Connect"}
      </button>
    );
  }

  return (
    <>
      {content}
      <ConfirmDialog
        open={confirm === "withdraw"}
        title="Withdraw invitation?"
        message={`${name || "This user"} will no longer see your connection request.`}
        confirmLabel="Withdraw"
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          run(cancelConnectionRequest({ requestId: state.requestId }), "Invitation withdrawn")
        }
      />
      <ConfirmDialog
        open={confirm === "remove"}
        title="Remove connection?"
        message={`You and ${name || "this user"} will no longer be connected.`}
        confirmLabel="Remove"
        danger
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => run(removeConnection({ userId }), "Connection removed")}
      />
    </>
  );
};

export default ConnectionButton;
