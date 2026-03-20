import type { BaseEntity } from "@/types/domain";
import type { TENDER_STATUSES } from "./catalogs";

export type TenderStatus = (typeof TENDER_STATUSES)[number];

export interface Tender extends BaseEntity {
  title: string;
  client: string;
  amount: number;
  closeDate: string;
  probability: number;
  responsible: string;
  status: TenderStatus;
}
