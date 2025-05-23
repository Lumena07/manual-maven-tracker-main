export type UserRole = 'general' | 'quality' | 'authority' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string | null;
  created_at: string;
  updated_at: string;
}

export type AmendmentStatus = 'pending' | 'quality' | 'approved' | 'rejected';

export interface Amendment {
  id: string;
  manualId: string;
  sectionId: string;
  title: string;
  content: string;
  originalContent: string;
  status: AmendmentStatus;
  createdBy: string;
  createdAt: Date;
  approvedByQualityAt?: Date;
  approvedByQualityBy?: string;
  approvedByAuthorityAt?: Date;
  approvedByAuthorityBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  reason: string;
}

export interface TempRevision {
  id: string;
  revisionNumber: string;
  manualId: string;
  sectionId: string;
  affectedSection: string;
  description: string;
  dateIssued: Date;
  effectiveDate: Date;
  expiryDate?: Date;
  issuedBy: string;
}

export interface FinalRevision {
  id: string;
  issueNo: string;
  revisionNo: string;
  revisionDate: Date;
  affectedPages: string;
  reason: string;
  dateInserted: Date;
  insertedBy: string;
  manualId: string;
}

export interface ManualSection {
  id: string;
  manualId: string;
  title: string;
  content: string;
  order: number;
  level: number;
  parentId?: string;
  amendment?: {
    content: string;
    originalContent: string;
    status: string;
  };
  temporaryRevisions?: {
    revision_number: string;
    section_title: string;
    description: string;
    date_issued: string;
    effective_date: string;
    expiry_date: string;
    issued_by: string;
  }[];
}

export interface Manual {
  id: string;
  title: string;
  description?: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isObsolete: boolean;
  sections: ManualSection[];
}
