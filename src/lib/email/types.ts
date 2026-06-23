export type EmailType =
  | "verify_email"
  | "welcome"
  | "incomplete_prediction_3day"
  | "incomplete_prediction_24hour"
  | "incomplete_prediction_2hour"
  | "new_round_open"
  | "ranking_update"
  | "winner";

export type EmailTemplate = {
  type: EmailType | string;
  subject: string;
  preview_text: string | null;
  body: string;
  cta_text: string | null;
  cta_url: string | null;
  enabled: boolean;
  subject_en?: string | null;
  preview_text_en?: string | null;
  body_en?: string | null;
  cta_text_en?: string | null;
};

export type EmailSettings = {
  sender_name: string;
  sender_email: string;
  reply_to_email: string;
  test_recipient_email: string | null;
  automation_enabled: boolean;
  send_only_verified: boolean;
  send_only_incomplete: boolean;
  do_not_send_after_deadline: boolean;
  do_not_duplicate_timing: boolean;
  do_not_send_unsubscribed: boolean;
};

export type EmailVariables = Record<string, string | number | null | undefined>;
