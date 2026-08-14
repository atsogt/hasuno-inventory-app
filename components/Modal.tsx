"use client";

import { createPortal } from "react-dom";

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
  return createPortal(
    <div
      className="modal-scrim fixed inset-0 flex items-center justify-center z-20 px-5"
      onClick={onCancel}
    >
      <div
        className="modal-sheet w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="m-0 mb-2 text-[17px] font-bold">{title}</h3>
        <div className="mb-5">{children}</div>
        <div className="flex gap-2.5">
          <button className="btn btn-ghost flex-1" onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            className={`btn flex-1 ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            type="button"
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
