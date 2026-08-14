export type Role = "owner" | "manager" | "worker";

export type Profile = {
  id: string;
  name: string;
  role: Role;
  locked: boolean;
  phone: string | null;
  email: string | null;
  created_at: string;
};

export type Station = "Sushi" | "Kitchen";

export type Item = {
  id: string;
  name: string;
  amount: number;
  station: Station;
  category: string;
  is_prep: boolean;
  created_at: string;
};

export type Request = {
  id: string;
  item_name: string;
  amount: number | null;
  requested_by_id: string;
  requested_by_name: string;
  sent_at: string;
  reminder_at: string | null;
  reminder_notified: boolean;
  urgent: boolean;
  created_at: string;
};

export type StaffReminder = {
  id: string;
  message: string;
  scheduled_at: string;
  created_by_name: string;
  target_ids: string[];
  dismissed_by: string[];
  created_at: string;
};
