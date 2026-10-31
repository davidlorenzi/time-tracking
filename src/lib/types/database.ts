export type ProjectStatus = "Active" | "Completed" | "On Hold";

export type BillingType = "hourly" | "fixed_budget" | "fixed_monthly";

export type SettingsColors = {
  workday: string;
  weekend: string;
  holiday: string;
  below_threshold: string;
  reached_threshold: string;
  over_threshold: string;
};

export type AppSettingsRow = {
  id: number;
  billable_threshold_hours: number;
  colors: Partial<SettingsColors>;
  extra_holidays: string[];
  work_days: number[];
  updated_at: string;
};

export type ClientRow = {
  id: string;
  name: string;
  daily_rate: number;
  notes: string | null;
  created_at: string;
};

export type ProjectRow = {
  id: string;
  name: string;
  status: ProjectStatus;
  client_id: string;
  description: string | null;
  default_billable: boolean;
  billing_type: BillingType;
  flat_amount: number | null;
  budget_hours: number | null;
  created_at: string;
};

export type TimeEntryRow = {
  id: string;
  date: string;
  duration_hours: number;
  description: string;
  project_id: string;
  tracked_external: boolean;
  billable: boolean;
  invoiced: boolean;
  created_at: string;
};

/** Supabase-generated shape (minimal) for typed client. */
export type Database = {
  public: {
    Tables: {
      clients: {
        Row: ClientRow;
        Insert: {
          id?: string;
          name: string;
          daily_rate: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          daily_rate?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: ProjectRow;
        Insert: {
          id?: string;
          name: string;
          status?: ProjectStatus;
          client_id: string;
          description?: string | null;
          default_billable?: boolean;
          billing_type?: BillingType;
          flat_amount?: number | null;
          budget_hours?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          status?: ProjectStatus;
          client_id?: string;
          description?: string | null;
          default_billable?: boolean;
          billing_type?: BillingType;
          flat_amount?: number | null;
          budget_hours?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      app_settings: {
        Row: AppSettingsRow;
        Insert: Partial<AppSettingsRow>;
        Update: Partial<AppSettingsRow>;
        Relationships: [];
      };
      time_entries: {
        Row: TimeEntryRow;
        Insert: {
          id?: string;
          date: string;
          duration_hours: number;
          description?: string;
          project_id: string;
          tracked_external?: boolean;
          billable?: boolean;
          invoiced?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          duration_hours?: number;
          description?: string;
          project_id?: string;
          tracked_external?: boolean;
          billable?: boolean;
          invoiced?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      project_status: ProjectStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
