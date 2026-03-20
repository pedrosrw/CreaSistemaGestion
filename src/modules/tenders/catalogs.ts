export const TENDER_STATUSES = ["draft", "submitted", "won", "lost"] as const;

export const TENDER_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  submitted: "Presentada",
  won: "Ganada",
  lost: "Perdida"
};
