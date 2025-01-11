export interface SumsubWebhookPayload {
  applicantId: string;
  inspectionId: string;
  correlationId: string;
  levelName: string;
  type:
    | 'applicantCreated'
    | 'applicantPending'
    | 'applicantReviewed'
    | 'applicantOnHold'
    | 'applicantPersonalInfoChanged'
    | 'applicantWorkflowCompleted';
  externalUserId: string;
  reviewStatus: 'init' | 'pending' | 'completed' | 'onHold';
  sandboxMode?: boolean;
  createdAt?: string;
  createdAtMs: string;
  clientId?: string;
  reviewResult?: {
    reviewAnswer: 'GREEN' | 'RED';
    rejectLabels?: string[];
    reviewRejectType?: 'RETRY' | 'FINAL';
    moderationComment?: string;
    clientComment?: string;
    buttonIds?: string[];
  };
}
