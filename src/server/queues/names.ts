export const queueNames = {
  reminders: "reminders",
  followups: "followups",
  recovery: "recovery",
  webhooks: "webhooks",
  engagementAnalysis: "engagement-analysis",
  realtimeEvents: "realtime-events"
} as const;

export type QueueName = (typeof queueNames)[keyof typeof queueNames];

