import { z } from "zod";
import { TENDER_STATUSES } from "./catalogs";

export const tenderCreateSchema = z.object({
  title: z.string().min(2),
  client: z.string().min(2),
  amount: z.number().nonnegative(),
  closeDate: z.string().min(8),
  probability: z.number().min(0).max(100),
  responsible: z.string().min(2),
  status: z.enum(TENDER_STATUSES)
});

export const tenderPatchSchema = tenderCreateSchema.partial().extend({
  id: z.string().min(3)
});
