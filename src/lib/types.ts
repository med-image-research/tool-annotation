export type BoundingBox = [number, number, number, number];

export type VerificationStatus = 'pending' | 'verified';

export interface ReferenceFinding {
  id: string;
  imageId: string;
  rfLabel: string;
  rfIndex: number;
  imageUrl: string;
  findingText: string;
  csvStatus: string;
  boxes: BoundingBox[];
  originalBoxes: BoundingBox[];
  verificationStatus: VerificationStatus;
  doctorNote: string;
  impressionRelevancePrior: 'yes' | 'no';
  updatedAt: string;
}

export interface XrayCase {
  imageId: string;
  imageUrl: string;
  findings: ReferenceFinding[];
}

export interface DatasetPayload {
  cases: XrayCase[];
  totalFindings: number;
  verifiedFindings: number;
}
