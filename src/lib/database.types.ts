export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          created_at: string | null
          id: string
          marked_at: string | null
          marked_by: string | null
          notes: string | null
          session_id: string
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          notes?: string | null
          session_id: string
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          notes?: string | null
          session_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_balances"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      availabilities: {
        Row: {
          created_at: string | null
          day_of_week: number
          effective_from: string | null
          effective_until: string | null
          end_time_of_day: string
          id: string
          organization_id: string
          owner_type: string
          start_time_of_day: string
          student_id: string | null
          tutor_id: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          effective_from?: string | null
          effective_until?: string | null
          end_time_of_day: string
          id?: string
          organization_id: string
          owner_type: string
          start_time_of_day: string
          student_id?: string | null
          tutor_id?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          effective_from?: string | null
          effective_until?: string | null
          end_time_of_day?: string
          id?: string
          organization_id?: string
          owner_type?: string
          start_time_of_day?: string
          student_id?: string | null
          tutor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availabilities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availabilities_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_balances"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "availabilities_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availabilities_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
        ]
      }
      email_drafts: {
        Row: {
          body: string
          context_id: string | null
          context_type: string
          created_at: string | null
          created_by: string | null
          error: string | null
          id: string
          organization_id: string
          sent_at: string | null
          status: string
          student_id: string | null
          subject: string
          to_email: string
          updated_at: string | null
        }
        Insert: {
          body: string
          context_id?: string | null
          context_type: string
          created_at?: string | null
          created_by?: string | null
          error?: string | null
          id?: string
          organization_id: string
          sent_at?: string | null
          status?: string
          student_id?: string | null
          subject: string
          to_email: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          context_id?: string | null
          context_type?: string
          created_at?: string | null
          created_by?: string | null
          error?: string | null
          id?: string
          organization_id?: string
          sent_at?: string | null
          status?: string
          student_id?: string | null
          subject?: string
          to_email?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_drafts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_drafts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_balances"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "email_drafts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          description: string
          expense_date: string
          id: string
          organization_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string | null
          description: string
          expense_date?: string
          id?: string
          organization_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          description?: string
          expense_date?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          business_name: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          organization_id: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          business_name: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          organization_id?: string | null
          token: string
          used_at?: string | null
        }
        Update: {
          business_name?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          organization_id?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          invoice_id: string
          payment_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          invoice_id: string
          payment_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          invoice_id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_sequences: {
        Row: {
          last_value: number
          organization_id: string
        }
        Insert: {
          last_value?: number
          organization_id: string
        }
        Update: {
          last_value?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          organization_id: string
          paid_at: string | null
          pdf_url: string | null
          sent_at: string | null
          status: string
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          status?: string
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_balances"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          context_id: string | null
          created_at: string | null
          id: string
          link: string | null
          organization_id: string
          read_at: string | null
          recipient_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          context_id?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          organization_id: string
          read_at?: string | null
          recipient_id: string
          title: string
          type: string
        }
        Update: {
          body?: string | null
          context_id?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          organization_id?: string
          read_at?: string | null
          recipient_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          method: string
          organization_id: string
          payment_date: string
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          method?: string
          organization_id: string
          payment_date?: string
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          method?: string
          organization_id?: string
          payment_date?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_balances"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll: {
        Row: {
          amount_paid: number
          created_at: string | null
          id: string
          organization_id: string
          payment_date: string | null
          payment_status: string
          session_id: string
          tutor_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string | null
          id?: string
          organization_id: string
          payment_date?: string | null
          payment_status?: string
          session_id: string
          tutor_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string | null
          id?: string
          organization_id?: string
          payment_date?: string | null
          payment_status?: string
          session_id?: string
          tutor_id?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          created_at: string | null
          grade_level: number | null
          id: string
          notes: string | null
          organization_id: string
          subject: string
          title: string
          url: string
        }
        Insert: {
          created_at?: string | null
          grade_level?: number | null
          id?: string
          notes?: string | null
          organization_id: string
          subject: string
          title: string
          url: string
        }
        Update: {
          created_at?: string | null
          grade_level?: number | null
          id?: string
          notes?: string | null
          organization_id?: string
          subject?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      session_resources: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          resource_id: string
          session_id: string
          student_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          resource_id: string
          session_id: string
          student_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          resource_id?: string
          session_id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_resources_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_balances"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "session_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      session_series: {
        Row: {
          created_at: string | null
          day_of_week: number | null
          end_date: string | null
          end_time_of_day: string | null
          frequency: string
          id: string
          notes: string | null
          organization_id: string
          start_date: string
          start_time_of_day: string | null
          topic: string
          tutor_id: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week?: number | null
          end_date?: string | null
          end_time_of_day?: string | null
          frequency?: string
          id?: string
          notes?: string | null
          organization_id: string
          start_date: string
          start_time_of_day?: string | null
          topic: string
          tutor_id?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number | null
          end_date?: string | null
          end_time_of_day?: string | null
          frequency?: string
          id?: string
          notes?: string | null
          organization_id?: string
          start_date?: string
          start_time_of_day?: string | null
          topic?: string
          tutor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_series_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_series_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
        ]
      }
      session_students: {
        Row: {
          created_at: string | null
          id: string
          rate: number
          session_id: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          rate: number
          session_id: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          rate?: number
          session_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_students_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_balances"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "session_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          cancellation_reason: string | null
          created_at: string | null
          end_time: string
          id: string
          notes: string | null
          organization_id: string
          session_series_id: string | null
          start_time: string
          status: string
          topic: string
          tutor_id: string | null
          tutor_pay_rate: number | null
          updated_at: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          created_at?: string | null
          end_time: string
          id?: string
          notes?: string | null
          organization_id: string
          session_series_id?: string | null
          start_time: string
          status?: string
          topic: string
          tutor_id?: string | null
          tutor_pay_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          created_at?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          organization_id?: string
          session_series_id?: string | null
          start_time?: string
          status?: string
          topic?: string
          tutor_id?: string | null
          tutor_pay_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_session_series_id_fkey"
            columns: ["session_series_id"]
            isOneToOne: false
            referencedRelation: "session_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          alt_parent_email: string | null
          alt_parent_name: string | null
          alt_parent_phone: string | null
          archived_at: string | null
          created_at: string | null
          default_rate: number
          email: string | null
          full_name: string
          grade_level: number | null
          id: string
          notes: string | null
          organization_id: string
          parent_email: string
          parent_name: string
          parent_phone: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          alt_parent_email?: string | null
          alt_parent_name?: string | null
          alt_parent_phone?: string | null
          archived_at?: string | null
          created_at?: string | null
          default_rate?: number
          email?: string | null
          full_name: string
          grade_level?: number | null
          id?: string
          notes?: string | null
          organization_id: string
          parent_email: string
          parent_name: string
          parent_phone: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          alt_parent_email?: string | null
          alt_parent_name?: string | null
          alt_parent_phone?: string | null
          archived_at?: string | null
          created_at?: string | null
          default_rate?: number
          email?: string | null
          full_name?: string
          grade_level?: number | null
          id?: string
          notes?: string | null
          organization_id?: string
          parent_email?: string
          parent_name?: string
          parent_phone?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tutors: {
        Row: {
          address: string
          alt_emergency_name: string | null
          alt_emergency_phone: string | null
          archived_at: string | null
          bank_account: string | null
          bank_bsb: string | null
          created_at: string | null
          email: string
          emergency_name: string
          emergency_phone: string
          full_name: string
          id: string
          organization_id: string
          pay_rate: number
          phone: string
          subjects_taught: string[]
          tfn: string | null
          year_levels_taught: number[]
        }
        Insert: {
          address: string
          alt_emergency_name?: string | null
          alt_emergency_phone?: string | null
          archived_at?: string | null
          bank_account?: string | null
          bank_bsb?: string | null
          created_at?: string | null
          email: string
          emergency_name: string
          emergency_phone: string
          full_name: string
          id?: string
          organization_id: string
          pay_rate?: number
          phone: string
          subjects_taught?: string[]
          tfn?: string | null
          year_levels_taught?: number[]
        }
        Update: {
          address?: string
          alt_emergency_name?: string | null
          alt_emergency_phone?: string | null
          archived_at?: string | null
          bank_account?: string | null
          bank_bsb?: string | null
          created_at?: string | null
          email?: string
          emergency_name?: string
          emergency_phone?: string
          full_name?: string
          id?: string
          organization_id?: string
          pay_rate?: number
          phone?: string
          subjects_taught?: string[]
          tfn?: string | null
          year_levels_taught?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "tutors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      student_balances: {
        Row: {
          balance: number | null
          full_name: string | null
          organization_id: string | null
          prepaid_sessions_remaining: number | null
          student_id: string | null
          total_billed: number | null
          total_paid: number | null
        }
        Relationships: [
          {
            foreignKeyName: "students_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_recurring_sessions: {
        Args: {
          p_cancellation_reason: string
          p_end_time: string
          p_frequency: string
          p_notes: string
          p_occurrences: number
          p_organization_id: string
          p_start_time: string
          p_status: string
          p_students: Json
          p_topic: string
          p_tutor_id: string
          p_tutor_pay_rate: number
        }
        Returns: string
      }
      create_session_with_students: {
        Args: {
          p_cancellation_reason: string
          p_end_time: string
          p_notes: string
          p_organization_id: string
          p_start_time: string
          p_status: string
          p_students: Json
          p_topic: string
          p_tutor_id: string
          p_tutor_pay_rate: number
        }
        Returns: string
      }
      next_invoice_number: { Args: { p_org: string }; Returns: string }
      update_session_with_students: {
        Args: {
          p_cancellation_reason: string
          p_end_time: string
          p_notes: string
          p_session_id: string
          p_start_time: string
          p_status: string
          p_students: Json
          p_topic: string
          p_tutor_id: string
          p_tutor_pay_rate: number
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
