"use client";

export default function Modal({
  title,
  children,
  onCancel,
  onConfirm,
  confirmLabel = "Confirm",
  danger,
  confirmDisabled,
}: {
  title: string;
  children?: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  danger?: boolean;
  confirmDisabled?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end justify-center z-20"
      onClick={onCancel}
    >
      <div
        className="bg-paper w-full max-w-[480px] rounded-t-2xl p-5.5 shadow-2xl"
        style={{ paddingBottom: "calc(22px + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="m-0 mb-2 text-[17px] font-bold">{title}</h3>
        <div className="mb-5">{children}</div>
        <div className="flex gap-2.5">
          <button className="btn btn-ghost flex-1" onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            className={`btn flex-1 ${danger ? "btn-accent" : "btn-primary"}`}
            onClick={onConfirm}
            type="button"
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
