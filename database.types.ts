export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agents: {
        Row: {
          commission_active: boolean
          commission_end_date: string | null
          commission_rate_percent: number
          commission_start_date: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          rto_id: string
          slug: string
        }
        Insert: {
          commission_active?: boolean
          commission_end_date?: string | null
          commission_rate_percent?: number
          commission_start_date?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          rto_id: string
          slug: string
        }
        Update: {
          commission_active?: boolean
          commission_end_date?: string | null
          commission_rate_percent?: number
          commission_start_date?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          rto_id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_attachments: {
        Row: {
          announcement_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          rto_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          rto_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          rto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_attachments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_attachments_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_read_receipts: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          read_at: string
          recipient_id: string
          recipient_type: string
          rto_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          read_at?: string
          recipient_id: string
          recipient_type: string
          rto_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          read_at?: string
          recipient_id?: string
          recipient_type?: string
          rto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_read_receipts_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_read_receipts_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_recipients: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          recipient_id: string
          recipient_type: string
          rto_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          recipient_id: string
          recipient_type: string
          rto_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          recipient_id?: string
          recipient_type?: string
          rto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_recipients_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_recipients_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string
          expiry_date: string | null
          id: string
          medium_selection: Json
          priority: Database["public"]["Enums"]["announcement_priority"]
          recipient_filter_criteria: Json
          rto_id: string
          scheduled_send_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["announcement_status"]
          subject: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          expiry_date?: string | null
          id?: string
          medium_selection: Json
          priority?: Database["public"]["Enums"]["announcement_priority"]
          recipient_filter_criteria: Json
          rto_id: string
          scheduled_send_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["announcement_status"]
          subject: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          expiry_date?: string | null
          id?: string
          medium_selection?: Json
          priority?: Database["public"]["Enums"]["announcement_priority"]
          recipient_filter_criteria?: Json
          rto_id?: string
          scheduled_send_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["announcement_status"]
          subject?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      application_disabilities: {
        Row: {
          application_id: string
          disability_type_id: string
          id: string
          rto_id: string
        }
        Insert: {
          application_id: string
          disability_type_id: string
          id?: string
          rto_id: string
        }
        Update: {
          application_id?: string
          disability_type_id?: string
          id?: string
          rto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_disabilities_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_disabilities_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      application_learning_classes: {
        Row: {
          application_id: string
          application_learning_subject_id: string
          class_date: string
          class_type: string | null
          classroom_id: string | null
          created_at: string
          end_time: string | null
          id: string
          location_id: string | null
          program_plan_class_id: string
          start_time: string | null
          trainer_id: string | null
        }
        Insert: {
          application_id: string
          application_learning_subject_id: string
          class_date: string
          class_type?: string | null
          classroom_id?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          location_id?: string | null
          program_plan_class_id: string
          start_time?: string | null
          trainer_id?: string | null
        }
        Update: {
          application_id?: string
          application_learning_subject_id?: string
          class_date?: string
          class_type?: string | null
          classroom_id?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          location_id?: string | null
          program_plan_class_id?: string
          start_time?: string | null
          trainer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_learning_classes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_learning_classes_application_learning_subject__fkey"
            columns: ["application_learning_subject_id"]
            isOneToOne: false
            referencedRelation: "application_learning_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_learning_classes_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_learning_classes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "delivery_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_learning_classes_program_plan_class_id_fkey"
            columns: ["program_plan_class_id"]
            isOneToOne: false
            referencedRelation: "program_plan_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_learning_classes_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_learning_subjects: {
        Row: {
          application_id: string
          created_at: string
          id: string
          is_catch_up: boolean
          is_prerequisite: boolean
          planned_end_date: string
          planned_start_date: string
          program_plan_subject_id: string
          sequence_order: number | null
          subject_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          is_catch_up?: boolean
          is_prerequisite?: boolean
          planned_end_date: string
          planned_start_date: string
          program_plan_subject_id: string
          sequence_order?: number | null
          subject_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          is_catch_up?: boolean
          is_prerequisite?: boolean
          planned_end_date?: string
          planned_start_date?: string
          program_plan_subject_id?: string
          sequence_order?: number | null
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_learning_subjects_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_learning_subjects_program_plan_subject_id_fkey"
            columns: ["program_plan_subject_id"]
            isOneToOne: false
            referencedRelation: "program_plan_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_learning_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      application_payment_schedule: {
        Row: {
          amount_cents: number
          anchor_date_used: string
          anchor_type: Database["public"]["Enums"]["payment_plan_anchor_type"]
          application_id: string
          created_at: string
          due_date: string
          id: string
          name: string
          sequence_order: number | null
          template_id: string
          template_installment_id: string
        }
        Insert: {
          amount_cents: number
          anchor_date_used: string
          anchor_type: Database["public"]["Enums"]["payment_plan_anchor_type"]
          application_id: string
          created_at?: string
          due_date: string
          id?: string
          name: string
          sequence_order?: number | null
          template_id: string
          template_installment_id: string
        }
        Update: {
          amount_cents?: number
          anchor_date_used?: string
          anchor_type?: Database["public"]["Enums"]["payment_plan_anchor_type"]
          application_id?: string
          created_at?: string
          due_date?: string
          id?: string
          name?: string
          sequence_order?: number | null
          template_id?: string
          template_installment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_payment_schedule_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_payment_schedule_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "payment_plan_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_payment_schedule_template_installment_id_fkey"
            columns: ["template_installment_id"]
            isOneToOne: false
            referencedRelation: "payment_plan_template_installments"
            referencedColumns: ["id"]
          },
        ]
      }
      application_payment_schedule_lines: {
        Row: {
          amount_cents: number
          application_id: string
          application_payment_schedule_id: string
          created_at: string
          description: string | null
          id: string
          is_commissionable: boolean
          name: string
          sequence_order: number
          template_installment_line_id: string | null
          xero_account_code: string | null
          xero_item_code: string | null
          xero_tax_type: string | null
        }
        Insert: {
          amount_cents: number
          application_id: string
          application_payment_schedule_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_commissionable?: boolean
          name: string
          sequence_order?: number
          template_installment_line_id?: string | null
          xero_account_code?: string | null
          xero_item_code?: string | null
          xero_tax_type?: string | null
        }
        Update: {
          amount_cents?: number
          application_id?: string
          application_payment_schedule_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_commissionable?: boolean
          name?: string
          sequence_order?: number
          template_installment_line_id?: string | null
          xero_account_code?: string | null
          xero_item_code?: string | null
          xero_tax_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_payment_schedule__application_payment_schedule_fkey"
            columns: ["application_payment_schedule_id"]
            isOneToOne: false
            referencedRelation: "application_payment_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_payment_schedule__template_installment_line_id_fkey"
            columns: ["template_installment_line_id"]
            isOneToOne: false
            referencedRelation: "payment_plan_template_installment_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_payment_schedule_lines_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_prior_education: {
        Row: {
          application_id: string
          id: string
          prior_achievement_id: string
          recognition_type: string | null
          rto_id: string
        }
        Insert: {
          application_id: string
          id?: string
          prior_achievement_id: string
          recognition_type?: string | null
          rto_id: string
        }
        Update: {
          application_id?: string
          id?: string
          prior_achievement_id?: string
          recognition_type?: string | null
          rto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_prior_education_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_prior_education_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          address_line_1: string | null
          agent_id: string | null
          alternative_email: string | null
          application_id_display: string
          assigned_to: string | null
          at_school_flag: string | null
          citizenship_status_code: string | null
          coe_number: string | null
          completed_previous_course: boolean | null
          country_of_birth_id: string | null
          country_of_citizenship: string | null
          created_at: string
          date_of_birth: string | null
          disability_flag: string | null
          ec_name: string | null
          ec_phone_number: string | null
          ec_relationship: string | null
          email: string | null
          english_proficiency_code: string | null
          english_test_date: string | null
          english_test_type: string | null
          first_name: string | null
          g_email: string | null
          g_name: string | null
          g_phone_number: string | null
          g_relationship: string | null
          gender: string | null
          group_id: string | null
          has_english_test: boolean | null
          has_previous_study_australia: boolean | null
          has_release_letter: boolean | null
          highest_school_level_id: string | null
          holds_visa: boolean | null
          id: string
          ielts_score: string | null
          indigenous_status_id: string | null
          is_international: boolean | null
          is_under_18: boolean | null
          labour_force_status_id: string | null
          language_code: string | null
          last_name: string | null
          middle_name: string | null
          mobile_phone: string | null
          offer_generated_at: string | null
          oshc_end_date: string | null
          oshc_policy_number: string | null
          oshc_provider_name: string | null
          oshc_start_date: string | null
          passport_expiry_date: string | null
          passport_issue_date: string | null
          passport_number: string | null
          payment_anchor_date: string | null
          payment_plan_template_id: string | null
          phone_number: string | null
          place_of_birth: string | null
          postal_building_name: string | null
          postal_country: string | null
          postal_is_same_as_street: boolean | null
          postal_number_name: string | null
          postal_po_box: string | null
          postal_postcode: string | null
          postal_state: string | null
          postal_suburb: string | null
          postal_unit_details: string | null
          postcode: string | null
          preferred_location_id: string | null
          preferred_name: string | null
          previous_provider_name: string | null
          prior_education_flag: string | null
          privacy_notice_accepted: boolean | null
          program_id: string | null
          proposed_commencement_date: string | null
          provider_accepting_welfare_responsibility: boolean | null
          provider_arranged_oshc: boolean | null
          requested_start_date: string | null
          rto_id: string
          salutation: string | null
          state: string | null
          status: Database["public"]["Enums"]["application_status"]
          street_building_name: string | null
          street_country: string | null
          street_number_name: string | null
          street_po_box: string | null
          street_unit_details: string | null
          student_id_display: string | null
          suburb: string | null
          survey_contact_status: string
          timetable_id: string | null
          updated_at: string | null
          usi: string | null
          usi_exemption_code: string | null
          usi_exemption_evidence_path: string | null
          usi_exemption_flag: boolean | null
          usi_status_verified_at: string | null
          visa_application_office: string | null
          visa_expiry_date: string | null
          visa_grant_date: string | null
          visa_number: string | null
          visa_type: string | null
          vsn: string | null
          welfare_start_date: string | null
          work_phone: string | null
          written_agreement_accepted: boolean | null
          written_agreement_date: string | null
          year_highest_school_level_completed: string | null
        }
        Insert: {
          address_line_1?: string | null
          agent_id?: string | null
          alternative_email?: string | null
          application_id_display: string
          assigned_to?: string | null
          at_school_flag?: string | null
          citizenship_status_code?: string | null
          coe_number?: string | null
          completed_previous_course?: boolean | null
          country_of_birth_id?: string | null
          country_of_citizenship?: string | null
          created_at?: string
          date_of_birth?: string | null
          disability_flag?: string | null
          ec_name?: string | null
          ec_phone_number?: string | null
          ec_relationship?: string | null
          email?: string | null
          english_proficiency_code?: string | null
          english_test_date?: string | null
          english_test_type?: string | null
          first_name?: string | null
          g_email?: string | null
          g_name?: string | null
          g_phone_number?: string | null
          g_relationship?: string | null
          gender?: string | null
          group_id?: string | null
          has_english_test?: boolean | null
          has_previous_study_australia?: boolean | null
          has_release_letter?: boolean | null
          highest_school_level_id?: string | null
          holds_visa?: boolean | null
          id?: string
          ielts_score?: string | null
          indigenous_status_id?: string | null
          is_international?: boolean | null
          is_under_18?: boolean | null
          labour_force_status_id?: string | null
          language_code?: string | null
          last_name?: string | null
          middle_name?: string | null
          mobile_phone?: string | null
          offer_generated_at?: string | null
          oshc_end_date?: string | null
          oshc_policy_number?: string | null
          oshc_provider_name?: string | null
          oshc_start_date?: string | null
          passport_expiry_date?: string | null
          passport_issue_date?: string | null
          passport_number?: string | null
          payment_anchor_date?: string | null
          payment_plan_template_id?: string | null
          phone_number?: string | null
          place_of_birth?: string | null
          postal_building_name?: string | null
          postal_country?: string | null
          postal_is_same_as_street?: boolean | null
          postal_number_name?: string | null
          postal_po_box?: string | null
          postal_postcode?: string | null
          postal_state?: string | null
          postal_suburb?: string | null
          postal_unit_details?: string | null
          postcode?: string | null
          preferred_location_id?: string | null
          preferred_name?: string | null
          previous_provider_name?: string | null
          prior_education_flag?: string | null
          privacy_notice_accepted?: boolean | null
          program_id?: string | null
          proposed_commencement_date?: string | null
          provider_accepting_welfare_responsibility?: boolean | null
          provider_arranged_oshc?: boolean | null
          requested_start_date?: string | null
          rto_id: string
          salutation?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          street_building_name?: string | null
          street_country?: string | null
          street_number_name?: string | null
          street_po_box?: string | null
          street_unit_details?: string | null
          student_id_display?: string | null
          suburb?: string | null
          survey_contact_status?: string
          timetable_id?: string | null
          updated_at?: string | null
          usi?: string | null
          usi_exemption_code?: string | null
          usi_exemption_evidence_path?: string | null
          usi_exemption_flag?: boolean | null
          usi_status_verified_at?: string | null
          visa_application_office?: string | null
          visa_expiry_date?: string | null
          visa_grant_date?: string | null
          visa_number?: string | null
          visa_type?: string | null
          vsn?: string | null
          welfare_start_date?: string | null
          work_phone?: string | null
          written_agreement_accepted?: boolean | null
          written_agreement_date?: string | null
          year_highest_school_level_completed?: string | null
        }
        Update: {
          address_line_1?: string | null
          agent_id?: string | null
          alternative_email?: string | null
          application_id_display?: string
          assigned_to?: string | null
          at_school_flag?: string | null
          citizenship_status_code?: string | null
          coe_number?: string | null
          completed_previous_course?: boolean | null
          country_of_birth_id?: string | null
          country_of_citizenship?: string | null
          created_at?: string
          date_of_birth?: string | null
          disability_flag?: string | null
          ec_name?: string | null
          ec_phone_number?: string | null
          ec_relationship?: string | null
          email?: string | null
          english_proficiency_code?: string | null
          english_test_date?: string | null
          english_test_type?: string | null
          first_name?: string | null
          g_email?: string | null
          g_name?: string | null
          g_phone_number?: string | null
          g_relationship?: string | null
          gender?: string | null
          group_id?: string | null
          has_english_test?: boolean | null
          has_previous_study_australia?: boolean | null
          has_release_letter?: boolean | null
          highest_school_level_id?: string | null
          holds_visa?: boolean | null
          id?: string
          ielts_score?: string | null
          indigenous_status_id?: string | null
          is_international?: boolean | null
          is_under_18?: boolean | null
          labour_force_status_id?: string | null
          language_code?: string | null
          last_name?: string | null
          middle_name?: string | null
          mobile_phone?: string | null
          offer_generated_at?: string | null
          oshc_end_date?: string | null
          oshc_policy_number?: string | null
          oshc_provider_name?: string | null
          oshc_start_date?: string | null
          passport_expiry_date?: string | null
          passport_issue_date?: string | null
          passport_number?: string | null
          payment_anchor_date?: string | null
          payment_plan_template_id?: string | null
          phone_number?: string | null
          place_of_birth?: string | null
          postal_building_name?: string | null
          postal_country?: string | null
          postal_is_same_as_street?: boolean | null
          postal_number_name?: string | null
          postal_po_box?: string | null
          postal_postcode?: string | null
          postal_state?: string | null
          postal_suburb?: string | null
          postal_unit_details?: string | null
          postcode?: string | null
          preferred_location_id?: string | null
          preferred_name?: string | null
          previous_provider_name?: string | null
          prior_education_flag?: string | null
          privacy_notice_accepted?: boolean | null
          program_id?: string | null
          proposed_commencement_date?: string | null
          provider_accepting_welfare_responsibility?: boolean | null
          provider_arranged_oshc?: boolean | null
          requested_start_date?: string | null
          rto_id?: string
          salutation?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          street_building_name?: string | null
          street_country?: string | null
          street_number_name?: string | null
          street_po_box?: string | null
          street_unit_details?: string | null
          student_id_display?: string | null
          suburb?: string | null
          survey_contact_status?: string
          timetable_id?: string | null
          updated_at?: string | null
          usi?: string | null
          usi_exemption_code?: string | null
          usi_exemption_evidence_path?: string | null
          usi_exemption_flag?: boolean | null
          usi_status_verified_at?: string | null
          visa_application_office?: string | null
          visa_expiry_date?: string | null
          visa_grant_date?: string | null
          visa_number?: string | null
          visa_type?: string | null
          vsn?: string | null
          welfare_start_date?: string | null
          work_phone?: string | null
          written_agreement_accepted?: boolean | null
          written_agreement_date?: string | null
          year_highest_school_level_completed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_payment_plan_template_id_fkey"
            columns: ["payment_plan_template_id"]
            isOneToOne: false
            referencedRelation: "payment_plan_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_preferred_location_id_fkey"
            columns: ["preferred_location_id"]
            isOneToOne: false
            referencedRelation: "delivery_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_timetable_id_fkey"
            columns: ["timetable_id"]
            isOneToOne: false
            referencedRelation: "timetables"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          capacity: number
          description: string | null
          id: string
          location_id: string
          name: string
          rto_id: string
          status: Database["public"]["Enums"]["classroom_status"]
          type: Database["public"]["Enums"]["classroom_type"]
        }
        Insert: {
          capacity?: number
          description?: string | null
          id?: string
          location_id: string
          name: string
          rto_id: string
          status?: Database["public"]["Enums"]["classroom_status"]
          type: Database["public"]["Enums"]["classroom_type"]
        }
        Update: {
          capacity?: number
          description?: string | null
          id?: string
          location_id?: string
          name?: string
          rto_id?: string
          status?: Database["public"]["Enums"]["classroom_status"]
          type?: Database["public"]["Enums"]["classroom_type"]
        }
        Relationships: [
          {
            foreignKeyName: "classrooms_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "delivery_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classrooms_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_invoice_sequences: {
        Row: {
          next_val: number
          rto_id: string
          year: number
        }
        Insert: {
          next_val?: number
          rto_id: string
          year: number
        }
        Update: {
          next_val?: number
          rto_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_invoice_sequences_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_invoices: {
        Row: {
          agent_id: string
          amount_paid_cents: number
          base_amount_cents: number
          commission_rate_applied: number
          created_at: string
          due_date: string
          enrollment_id: string
          gst_amount_cents: number
          id: string
          invoice_number: string
          issue_date: string
          paid_date: string | null
          payment_reference: string | null
          rto_id: string
          status: string
          student_id: string
          student_payment_id: string
          total_amount_cents: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          amount_paid_cents?: number
          base_amount_cents: number
          commission_rate_applied: number
          created_at?: string
          due_date: string
          enrollment_id: string
          gst_amount_cents: number
          id?: string
          invoice_number: string
          issue_date: string
          paid_date?: string | null
          payment_reference?: string | null
          rto_id: string
          status?: string
          student_id: string
          student_payment_id: string
          total_amount_cents: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          amount_paid_cents?: number
          base_amount_cents?: number
          commission_rate_applied?: number
          created_at?: string
          due_date?: string
          enrollment_id?: string
          gst_amount_cents?: number
          id?: string
          invoice_number?: string
          issue_date?: string
          paid_date?: string | null
          payment_reference?: string | null
          rto_id?: string
          status?: string
          student_id?: string
          student_payment_id?: string
          total_amount_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_invoices_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_invoices_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_invoices_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_invoices_student_payment_id_fkey"
            columns: ["student_payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payments: {
        Row: {
          amount_cents: number
          commission_invoice_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          reference: string | null
          rto_id: string
        }
        Insert: {
          amount_cents: number
          commission_invoice_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date: string
          payment_method?: string | null
          reference?: string | null
          rto_id: string
        }
        Update: {
          amount_cents?: number
          commission_invoice_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          reference?: string | null
          rto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_payments_commission_invoice_id_fkey"
            columns: ["commission_invoice_id"]
            isOneToOne: false
            referencedRelation: "commission_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_locations: {
        Row: {
          building_property_name: string | null
          flat_unit_details: string | null
          id: string
          location_id_internal: string
          name: string
          postcode: string | null
          rto_id: string
          state: string | null
          street_name: string | null
          street_number: string | null
          suburb: string | null
        }
        Insert: {
          building_property_name?: string | null
          flat_unit_details?: string | null
          id?: string
          location_id_internal: string
          name: string
          postcode?: string | null
          rto_id: string
          state?: string | null
          street_name?: string | null
          street_number?: string | null
          suburb?: string | null
        }
        Update: {
          building_property_name?: string | null
          flat_unit_details?: string | null
          id?: string
          location_id_internal?: string
          name?: string
          postcode?: string | null
          rto_id?: string
          state?: string | null
          street_name?: string | null
          street_number?: string | null
          suburb?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_locations_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      email_message_attachments: {
        Row: {
          content_type: string | null
          email_message_id: string
          file_name: string
          id: string
          resend_attachment_id: string | null
          size_bytes: number | null
          storage_path: string | null
        }
        Insert: {
          content_type?: string | null
          email_message_id: string
          file_name: string
          id?: string
          resend_attachment_id?: string | null
          size_bytes?: number | null
          storage_path?: string | null
        }
        Update: {
          content_type?: string | null
          email_message_id?: string
          file_name?: string
          id?: string
          resend_attachment_id?: string | null
          size_bytes?: number | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_message_attachments_email_message_id_fkey"
            columns: ["email_message_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_message_participants: {
        Row: {
          display_name: string | null
          email: string
          email_message_id: string
          id: string
          type: Database["public"]["Enums"]["email_participant_type"]
        }
        Insert: {
          display_name?: string | null
          email: string
          email_message_id: string
          id?: string
          type: Database["public"]["Enums"]["email_participant_type"]
        }
        Update: {
          display_name?: string | null
          email?: string
          email_message_id?: string
          id?: string
          type?: Database["public"]["Enums"]["email_participant_type"]
        }
        Relationships: [
          {
            foreignKeyName: "email_message_participants_email_message_id_fkey"
            columns: ["email_message_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_message_status_events: {
        Row: {
          email_message_id: string
          event_type: Database["public"]["Enums"]["email_status"]
          id: string
          occurred_at: string
          payload: Json | null
        }
        Insert: {
          email_message_id: string
          event_type: Database["public"]["Enums"]["email_status"]
          id?: string
          occurred_at?: string
          payload?: Json | null
        }
        Update: {
          email_message_id?: string
          event_type?: Database["public"]["Enums"]["email_status"]
          id?: string
          occurred_at?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_message_status_events_email_message_id_fkey"
            columns: ["email_message_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_messages: {
        Row: {
          created_at: string
          created_by: string | null
          delivered_at: string | null
          error_message: string | null
          failed_at: string | null
          from_email: string
          from_name: string | null
          html_body: string
          id: string
          metadata: Json | null
          reply_to: string[] | null
          resend_message_id: string | null
          rto_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["email_status"]
          status_updated_at: string | null
          subject: string
          text_body: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          from_email: string
          from_name?: string | null
          html_body: string
          id?: string
          metadata?: Json | null
          reply_to?: string[] | null
          resend_message_id?: string | null
          rto_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          status_updated_at?: string | null
          subject: string
          text_body?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          from_email?: string
          from_name?: string | null
          html_body?: string
          id?: string
          metadata?: Json | null
          reply_to?: string[] | null
          resend_message_id?: string | null
          rto_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          status_updated_at?: string | null
          subject?: string
          text_body?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_class_attendances: {
        Row: {
          enrollment_class_id: string
          id: string
          marked_at: string
          marked_by: string | null
          note: string | null
          present: boolean | null
        }
        Insert: {
          enrollment_class_id: string
          id?: string
          marked_at?: string
          marked_by?: string | null
          note?: string | null
          present?: boolean | null
        }
        Update: {
          enrollment_class_id?: string
          id?: string
          marked_at?: string
          marked_by?: string | null
          note?: string | null
          present?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_class_attendances_enrollment_class_id_fkey"
            columns: ["enrollment_class_id"]
            isOneToOne: true
            referencedRelation: "enrollment_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_class_attendances_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_classes: {
        Row: {
          class_date: string
          class_type: string | null
          classroom_id: string | null
          end_time: string | null
          enrollment_id: string
          id: string
          location_id: string | null
          notes: string | null
          program_plan_class_id: string
          start_time: string | null
          trainer_id: string | null
        }
        Insert: {
          class_date: string
          class_type?: string | null
          classroom_id?: string | null
          end_time?: string | null
          enrollment_id: string
          id?: string
          location_id?: string | null
          notes?: string | null
          program_plan_class_id: string
          start_time?: string | null
          trainer_id?: string | null
        }
        Update: {
          class_date?: string
          class_type?: string | null
          classroom_id?: string | null
          end_time?: string | null
          enrollment_id?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          program_plan_class_id?: string
          start_time?: string | null
          trainer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_classes_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_classes_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_classes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "delivery_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_classes_program_plan_class_id_fkey"
            columns: ["program_plan_class_id"]
            isOneToOne: false
            referencedRelation: "program_plan_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_classes_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_subjects: {
        Row: {
          delivery_location_id: string | null
          delivery_mode_id: string | null
          end_date: string | null
          enrollment_id: string
          id: string
          is_catch_up: boolean | null
          outcome_code: string | null
          program_plan_subject_id: string
          scheduled_hours: number | null
          start_date: string | null
        }
        Insert: {
          delivery_location_id?: string | null
          delivery_mode_id?: string | null
          end_date?: string | null
          enrollment_id: string
          id?: string
          is_catch_up?: boolean | null
          outcome_code?: string | null
          program_plan_subject_id: string
          scheduled_hours?: number | null
          start_date?: string | null
        }
        Update: {
          delivery_location_id?: string | null
          delivery_mode_id?: string | null
          end_date?: string | null
          enrollment_id?: string
          id?: string
          is_catch_up?: boolean | null
          outcome_code?: string | null
          program_plan_subject_id?: string
          scheduled_hours?: number | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_subjects_delivery_location_id_fkey"
            columns: ["delivery_location_id"]
            isOneToOne: false
            referencedRelation: "delivery_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_subjects_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_subjects_program_plan_subject_id_fkey"
            columns: ["program_plan_subject_id"]
            isOneToOne: false
            referencedRelation: "program_plan_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          certificate_issued_flag: string | null
          commencement_date: string
          commencing_program_identifier: string | null
          date_completed: string | null
          expected_completion_date: string | null
          funding_source_code: string | null
          funding_source_state_id: string | null
          id: string
          parchment_issue_date: string | null
          parchment_number: string | null
          payment_plan_template_id: string | null
          program_id: string
          rto_id: string
          status: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
          vet_in_schools_flag: string | null
        }
        Insert: {
          certificate_issued_flag?: string | null
          commencement_date: string
          commencing_program_identifier?: string | null
          date_completed?: string | null
          expected_completion_date?: string | null
          funding_source_code?: string | null
          funding_source_state_id?: string | null
          id?: string
          parchment_issue_date?: string | null
          parchment_number?: string | null
          payment_plan_template_id?: string | null
          program_id: string
          rto_id: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
          vet_in_schools_flag?: string | null
        }
        Update: {
          certificate_issued_flag?: string | null
          commencement_date?: string
          commencing_program_identifier?: string | null
          date_completed?: string | null
          expected_completion_date?: string | null
          funding_source_code?: string | null
          funding_source_state_id?: string | null
          id?: string
          parchment_issue_date?: string | null
          parchment_number?: string | null
          payment_plan_template_id?: string | null
          program_id?: string
          rto_id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id?: string
          vet_in_schools_flag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_payment_plan_template_id_fkey"
            columns: ["payment_plan_template_id"]
            isOneToOne: false
            referencedRelation: "payment_plan_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          entity_id: string
          entity_type: string
          event_type: string
          field_name: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          rto_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          entity_id: string
          entity_type: string
          event_type: string
          field_name?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          rto_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          entity_id?: string
          entity_type?: string
          event_type?: string
          field_name?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          rto_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      groups: {
        Row: {
          created_at: string
          current_enrollment_count: number
          id: string
          location_id: string
          max_capacity: number
          name: string
          program_id: string
          rto_id: string
        }
        Insert: {
          created_at?: string
          current_enrollment_count?: number
          id?: string
          location_id: string
          max_capacity: number
          name: string
          program_id: string
          rto_id: string
        }
        Update: {
          created_at?: string
          current_enrollment_count?: number
          id?: string
          location_id?: string
          max_capacity?: number
          name?: string
          program_id?: string
          rto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "delivery_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          amount_cents: number
          description: string | null
          id: string
          invoice_id: string
          is_commissionable: boolean
          name: string
          sequence_order: number
          xero_account_code: string | null
          xero_item_code: string | null
          xero_tax_type: string | null
        }
        Insert: {
          amount_cents: number
          description?: string | null
          id?: string
          invoice_id: string
          is_commissionable?: boolean
          name: string
          sequence_order?: number
          xero_account_code?: string | null
          xero_item_code?: string | null
          xero_tax_type?: string | null
        }
        Update: {
          amount_cents?: number
          description?: string | null
          id?: string
          invoice_id?: string
          is_commissionable?: boolean
          name?: string
          sequence_order?: number
          xero_account_code?: string | null
          xero_item_code?: string | null
          xero_tax_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_reminders_sent: {
        Row: {
          id: string
          invoice_id: string
          reminder_id: string
          sent_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          reminder_id: string
          sent_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          reminder_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_reminders_sent_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_reminders_sent_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "payment_plan_reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due_cents: number
          amount_paid_cents: number | null
          due_date: string
          enrollment_id: string
          first_overdue_at: string | null
          id: string
          internal_payment_status: Database["public"]["Enums"]["internal_payment_status"]
          invoice_number: string
          issue_date: string
          last_email_sent_at: string | null
          last_overdue_at: string | null
          last_pdf_error: string | null
          notes: string | null
          pdf_generated_at: string | null
          pdf_generation_attempts: number
          pdf_generation_status: Database["public"]["Enums"]["invoice_pdf_generation_status"]
          pdf_path: string | null
          rto_id: string
          status: Database["public"]["Enums"]["invoice_status"]
          xero_invoice_id: string | null
          xero_sync_error: string | null
          xero_sync_status: string | null
          xero_synced_at: string | null
        }
        Insert: {
          amount_due_cents: number
          amount_paid_cents?: number | null
          due_date: string
          enrollment_id: string
          first_overdue_at?: string | null
          id?: string
          internal_payment_status?: Database["public"]["Enums"]["internal_payment_status"]
          invoice_number: string
          issue_date: string
          last_email_sent_at?: string | null
          last_overdue_at?: string | null
          last_pdf_error?: string | null
          notes?: string | null
          pdf_generated_at?: string | null
          pdf_generation_attempts?: number
          pdf_generation_status?: Database["public"]["Enums"]["invoice_pdf_generation_status"]
          pdf_path?: string | null
          rto_id: string
          status?: Database["public"]["Enums"]["invoice_status"]
          xero_invoice_id?: string | null
          xero_sync_error?: string | null
          xero_sync_status?: string | null
          xero_synced_at?: string | null
        }
        Update: {
          amount_due_cents?: number
          amount_paid_cents?: number | null
          due_date?: string
          enrollment_id?: string
          first_overdue_at?: string | null
          id?: string
          internal_payment_status?: Database["public"]["Enums"]["internal_payment_status"]
          invoice_number?: string
          issue_date?: string
          last_email_sent_at?: string | null
          last_overdue_at?: string | null
          last_pdf_error?: string | null
          notes?: string | null
          pdf_generated_at?: string | null
          pdf_generation_attempts?: number
          pdf_generation_status?: Database["public"]["Enums"]["invoice_pdf_generation_status"]
          pdf_path?: string | null
          rto_id?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          xero_invoice_id?: string | null
          xero_sync_error?: string | null
          xero_sync_status?: string | null
          xero_synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_templates: {
        Row: {
          created_at: string
          created_by: string | null
          html_body: string
          id: string
          name: string
          rto_id: string
          subject: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          html_body: string
          id?: string
          name: string
          rto_id: string
          subject: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          html_body?: string
          id?: string
          name?: string
          rto_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_templates_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_letters: {
        Row: {
          application_id: string
          file_path: string
          generated_at: string
          generated_by: string | null
          id: string
          rto_id: string
          sha256: string | null
          size_bytes: number | null
          student_id: string | null
          template_key: string
          version: string
        }
        Insert: {
          application_id: string
          file_path: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          rto_id: string
          sha256?: string | null
          size_bytes?: number | null
          student_id?: string | null
          template_key?: string
          version?: string
        }
        Update: {
          application_id?: string
          file_path?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          rto_id?: string
          sha256?: string | null
          size_bytes?: number | null
          student_id?: string | null
          template_key?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_letters_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_letters_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_letters_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_letters_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plan_reminders: {
        Row: {
          created_at: string
          id: string
          mail_template_id: string
          name: string
          offset_days: number
          regenerate_invoice: boolean
          rto_id: string
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mail_template_id: string
          name: string
          offset_days: number
          regenerate_invoice?: boolean
          rto_id: string
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mail_template_id?: string
          name?: string
          offset_days?: number
          regenerate_invoice?: boolean
          rto_id?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_plan_reminders_mail_template_id_fkey"
            columns: ["mail_template_id"]
            isOneToOne: false
            referencedRelation: "mail_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plan_reminders_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plan_reminders_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "payment_plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plan_template_installment_lines: {
        Row: {
          amount_cents: number
          description: string | null
          id: string
          installment_id: string
          is_commissionable: boolean
          name: string
          sequence_order: number
          xero_account_code: string | null
          xero_item_code: string | null
          xero_tax_type: string | null
        }
        Insert: {
          amount_cents: number
          description?: string | null
          id?: string
          installment_id: string
          is_commissionable?: boolean
          name: string
          sequence_order?: number
          xero_account_code?: string | null
          xero_item_code?: string | null
          xero_tax_type?: string | null
        }
        Update: {
          amount_cents?: number
          description?: string | null
          id?: string
          installment_id?: string
          is_commissionable?: boolean
          name?: string
          sequence_order?: number
          xero_account_code?: string | null
          xero_item_code?: string | null
          xero_tax_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_plan_template_installment_lines_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "payment_plan_template_installments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plan_template_installments: {
        Row: {
          amount_cents: number
          due_date_rule_days: number
          id: string
          is_commissionable: boolean
          is_deposit: boolean
          name: string
          template_id: string
        }
        Insert: {
          amount_cents: number
          due_date_rule_days: number
          id?: string
          is_commissionable?: boolean
          is_deposit?: boolean
          name: string
          template_id: string
        }
        Update: {
          amount_cents?: number
          due_date_rule_days?: number
          id?: string
          is_commissionable?: boolean
          is_deposit?: boolean
          name?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_plan_template_installments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "payment_plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plan_templates: {
        Row: {
          id: string
          is_default: boolean | null
          issue_date_offset_days: number
          name: string
          program_id: string
          rto_id: string
          xero_account_code: string | null
          xero_item_code: string | null
          xero_tax_type: string | null
        }
        Insert: {
          id?: string
          is_default?: boolean | null
          issue_date_offset_days?: number
          name: string
          program_id: string
          rto_id: string
          xero_account_code?: string | null
          xero_item_code?: string | null
          xero_tax_type?: string | null
        }
        Update: {
          id?: string
          is_default?: boolean | null
          issue_date_offset_days?: number
          name?: string
          program_id?: string
          rto_id?: string
          xero_account_code?: string | null
          xero_item_code?: string | null
          xero_tax_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_plan_templates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plan_templates_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          external_ref: string | null
          id: string
          invoice_id: string
          method: string | null
          payment_date: string
          reconciliation_notes: string | null
          rto_id: string
          xero_payment_id: string | null
          xero_sync_error: string | null
          xero_sync_status: string | null
          xero_synced_at: string | null
        }
        Insert: {
          amount_cents: number
          external_ref?: string | null
          id?: string
          invoice_id: string
          method?: string | null
          payment_date: string
          reconciliation_notes?: string | null
          rto_id: string
          xero_payment_id?: string | null
          xero_sync_error?: string | null
          xero_sync_status?: string | null
          xero_synced_at?: string | null
        }
        Update: {
          amount_cents?: number
          external_ref?: string | null
          id?: string
          invoice_id?: string
          method?: string | null
          payment_date?: string
          reconciliation_notes?: string | null
          rto_id?: string
          xero_payment_id?: string | null
          xero_sync_error?: string | null
          xero_sync_status?: string | null
          xero_synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          first_name: string | null
          id: string
          last_name: string | null
          profile_image_path: string | null
          role: Database["public"]["Enums"]["user_role"]
          rto_id: string
          theme: string | null
        }
        Insert: {
          first_name?: string | null
          id: string
          last_name?: string | null
          profile_image_path?: string | null
          role: Database["public"]["Enums"]["user_role"]
          rto_id: string
          theme?: string | null
        }
        Update: {
          first_name?: string | null
          id?: string
          last_name?: string | null
          profile_image_path?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          rto_id?: string
          theme?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      program_fields: {
        Row: {
          id: string
          label: string
        }
        Insert: {
          id: string
          label: string
        }
        Update: {
          id?: string
          label?: string
        }
        Relationships: []
      }
      program_levels: {
        Row: {
          id: string
          label: string
        }
        Insert: {
          id: string
          label: string
        }
        Update: {
          id?: string
          label?: string
        }
        Relationships: []
      }
      program_plan_classes: {
        Row: {
          class_date: string
          class_type: Database["public"]["Enums"]["class_type"] | null
          classroom_id: string | null
          created_at: string
          end_time: string | null
          group_id: string | null
          id: string
          location_id: string
          notes: string | null
          program_plan_subject_id: string
          start_time: string | null
          trainer_id: string | null
        }
        Insert: {
          class_date: string
          class_type?: Database["public"]["Enums"]["class_type"] | null
          classroom_id?: string | null
          created_at?: string
          end_time?: string | null
          group_id?: string | null
          id?: string
          location_id: string
          notes?: string | null
          program_plan_subject_id: string
          start_time?: string | null
          trainer_id?: string | null
        }
        Update: {
          class_date?: string
          class_type?: Database["public"]["Enums"]["class_type"] | null
          classroom_id?: string | null
          created_at?: string
          end_time?: string | null
          group_id?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          program_plan_subject_id?: string
          start_time?: string | null
          trainer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_plan_classes_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_plan_classes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_plan_classes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "delivery_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_plan_classes_program_plan_subject_id_fkey"
            columns: ["program_plan_subject_id"]
            isOneToOne: false
            referencedRelation: "program_plan_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_plan_classes_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      program_plan_subjects: {
        Row: {
          end_date: string
          id: string
          is_prerequisite: boolean
          median_date: string
          program_plan_id: string
          sequence_order: number | null
          start_date: string
          subject_id: string
        }
        Insert: {
          end_date: string
          id?: string
          is_prerequisite?: boolean
          median_date: string
          program_plan_id: string
          sequence_order?: number | null
          start_date: string
          subject_id: string
        }
        Update: {
          end_date?: string
          id?: string
          is_prerequisite?: boolean
          median_date?: string
          program_plan_id?: string
          sequence_order?: number | null
          start_date?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_plan_subjects_program_plan_id_fkey"
            columns: ["program_plan_id"]
            isOneToOne: false
            referencedRelation: "program_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_plan_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      program_plans: {
        Row: {
          id: string
          name: string
          program_id: string
          rto_id: string
        }
        Insert: {
          id?: string
          name: string
          program_id: string
          rto_id: string
        }
        Update: {
          id?: string
          name?: string
          program_id?: string
          rto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_plans_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_plans_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      program_recognitions: {
        Row: {
          id: string
          label: string
        }
        Insert: {
          id: string
          label: string
        }
        Update: {
          id?: string
          label?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          anzsco_id: string | null
          anzsic_id: string | null
          code: string
          created_at: string
          field_of_education_id: string | null
          id: string
          level_of_education_id: string | null
          name: string
          nominal_hours: number | null
          recognition_id: string | null
          rto_id: string
          vet_flag: string | null
        }
        Insert: {
          anzsco_id?: string | null
          anzsic_id?: string | null
          code: string
          created_at?: string
          field_of_education_id?: string | null
          id?: string
          level_of_education_id?: string | null
          name: string
          nominal_hours?: number | null
          recognition_id?: string | null
          rto_id: string
          vet_flag?: string | null
        }
        Update: {
          anzsco_id?: string | null
          anzsic_id?: string | null
          code?: string
          created_at?: string
          field_of_education_id?: string | null
          id?: string
          level_of_education_id?: string | null
          name?: string
          nominal_hours?: number | null
          recognition_id?: string | null
          rto_id?: string
          vet_flag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_field_fk"
            columns: ["field_of_education_id"]
            isOneToOne: false
            referencedRelation: "program_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_level_fk"
            columns: ["level_of_education_id"]
            isOneToOne: false
            referencedRelation: "program_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_recognition_fk"
            columns: ["recognition_id"]
            isOneToOne: false
            referencedRelation: "program_recognitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualifications_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      rto_blackout_dates: {
        Row: {
          created_at: string
          date: string
          id: string
          reason: string
          rto_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          reason: string
          rto_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          reason?: string
          rto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rto_blackout_dates_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      rtos: {
        Row: {
          address_line_1: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_bsb: string | null
          bank_name: string | null
          contact_name: string | null
          created_at: string
          cricos_code: string | null
          email_address: string | null
          facsimile_number: string | null
          id: string
          name: string
          phone_number: string | null
          postcode: string | null
          profile_image_path: string | null
          rto_code: string
          state: string | null
          statistical_area_1_id: string | null
          statistical_area_2_id: string | null
          suburb: string | null
          type_identifier: string | null
          xero_access_token_encrypted: string | null
          xero_default_payment_account_code: string | null
          xero_refresh_token_encrypted: string | null
          xero_tenant_id: string | null
          xero_token_expires_at: string | null
          xero_webhook_key: string | null
        }
        Insert: {
          address_line_1?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_bsb?: string | null
          bank_name?: string | null
          contact_name?: string | null
          created_at?: string
          cricos_code?: string | null
          email_address?: string | null
          facsimile_number?: string | null
          id?: string
          name: string
          phone_number?: string | null
          postcode?: string | null
          profile_image_path?: string | null
          rto_code: string
          state?: string | null
          statistical_area_1_id?: string | null
          statistical_area_2_id?: string | null
          suburb?: string | null
          type_identifier?: string | null
          xero_access_token_encrypted?: string | null
          xero_default_payment_account_code?: string | null
          xero_refresh_token_encrypted?: string | null
          xero_tenant_id?: string | null
          xero_token_expires_at?: string | null
          xero_webhook_key?: string | null
        }
        Update: {
          address_line_1?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_bsb?: string | null
          bank_name?: string | null
          contact_name?: string | null
          created_at?: string
          cricos_code?: string | null
          email_address?: string | null
          facsimile_number?: string | null
          id?: string
          name?: string
          phone_number?: string | null
          postcode?: string | null
          profile_image_path?: string | null
          rto_code?: string
          state?: string | null
          statistical_area_1_id?: string | null
          statistical_area_2_id?: string | null
          suburb?: string | null
          type_identifier?: string | null
          xero_access_token_encrypted?: string | null
          xero_default_payment_account_code?: string | null
          xero_refresh_token_encrypted?: string | null
          xero_tenant_id?: string | null
          xero_token_expires_at?: string | null
          xero_webhook_key?: string | null
        }
        Relationships: []
      }
      student_addresses: {
        Row: {
          building_name: string | null
          country: string | null
          id: string
          is_primary: boolean
          number_name: string | null
          po_box: string | null
          postcode: string | null
          rto_id: string
          state: string | null
          student_id: string
          suburb: string | null
          type: Database["public"]["Enums"]["student_address_type"]
          unit_details: string | null
        }
        Insert: {
          building_name?: string | null
          country?: string | null
          id?: string
          is_primary?: boolean
          number_name?: string | null
          po_box?: string | null
          postcode?: string | null
          rto_id: string
          state?: string | null
          student_id: string
          suburb?: string | null
          type: Database["public"]["Enums"]["student_address_type"]
          unit_details?: string | null
        }
        Update: {
          building_name?: string | null
          country?: string | null
          id?: string
          is_primary?: boolean
          number_name?: string | null
          po_box?: string | null
          postcode?: string | null
          rto_id?: string
          state?: string | null
          student_id?: string
          suburb?: string | null
          type?: Database["public"]["Enums"]["student_address_type"]
          unit_details?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_addresses_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_addresses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_assignment_submissions: {
        Row: {
          assignment_id: string
          created_at: string
          created_by: string | null
          enrollment_id: string | null
          feedback: string | null
          file_name: string
          file_path: string
          grade: string | null
          id: string
          mime_type: string | null
          notes: string | null
          rto_id: string
          sha256: string | null
          size_bytes: number | null
          student_id: string
          subject_id: string
          submitted_at: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          created_by?: string | null
          enrollment_id?: string | null
          feedback?: string | null
          file_name: string
          file_path: string
          grade?: string | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          rto_id: string
          sha256?: string | null
          size_bytes?: number | null
          student_id: string
          subject_id: string
          submitted_at?: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          created_by?: string | null
          enrollment_id?: string | null
          feedback?: string | null
          file_name?: string
          file_path?: string
          grade?: string | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          rto_id?: string
          sha256?: string | null
          size_bytes?: number | null
          student_id?: string
          subject_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "subject_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignment_submissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignment_submissions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignment_submissions_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignment_submissions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      student_avetmiss: {
        Row: {
          at_school_flag: string | null
          citizenship_status_code: string | null
          country_of_birth_id: string | null
          disability_flag: string | null
          gender: string | null
          highest_school_level_id: string | null
          id: string
          indigenous_status_id: string | null
          labour_force_status_id: string | null
          language_code: string | null
          prior_education_flag: string | null
          rto_id: string
          student_id: string
          survey_contact_status: string
          usi: string | null
          usi_exemption_code: string | null
          usi_exemption_evidence_path: string | null
          usi_exemption_flag: boolean | null
          usi_status_verified_at: string | null
          vsn: string | null
          year_highest_school_level_completed: string | null
        }
        Insert: {
          at_school_flag?: string | null
          citizenship_status_code?: string | null
          country_of_birth_id?: string | null
          disability_flag?: string | null
          gender?: string | null
          highest_school_level_id?: string | null
          id?: string
          indigenous_status_id?: string | null
          labour_force_status_id?: string | null
          language_code?: string | null
          prior_education_flag?: string | null
          rto_id: string
          student_id: string
          survey_contact_status?: string
          usi?: string | null
          usi_exemption_code?: string | null
          usi_exemption_evidence_path?: string | null
          usi_exemption_flag?: boolean | null
          usi_status_verified_at?: string | null
          vsn?: string | null
          year_highest_school_level_completed?: string | null
        }
        Update: {
          at_school_flag?: string | null
          citizenship_status_code?: string | null
          country_of_birth_id?: string | null
          disability_flag?: string | null
          gender?: string | null
          highest_school_level_id?: string | null
          id?: string
          indigenous_status_id?: string | null
          labour_force_status_id?: string | null
          language_code?: string | null
          prior_education_flag?: string | null
          rto_id?: string
          student_id?: string
          survey_contact_status?: string
          usi?: string | null
          usi_exemption_code?: string | null
          usi_exemption_evidence_path?: string | null
          usi_exemption_flag?: boolean | null
          usi_status_verified_at?: string | null
          vsn?: string | null
          year_highest_school_level_completed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_avetmiss_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_avetmiss_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_contacts_emergency: {
        Row: {
          id: string
          name: string
          phone_number: string | null
          relationship: string | null
          rto_id: string
          student_id: string
        }
        Insert: {
          id?: string
          name: string
          phone_number?: string | null
          relationship?: string | null
          rto_id: string
          student_id: string
        }
        Update: {
          id?: string
          name?: string
          phone_number?: string | null
          relationship?: string | null
          rto_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_contacts_emergency_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_contacts_emergency_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_contacts_guardians: {
        Row: {
          email: string | null
          id: string
          name: string
          phone_number: string | null
          relationship: string | null
          rto_id: string
          student_id: string
        }
        Insert: {
          email?: string | null
          id?: string
          name: string
          phone_number?: string | null
          relationship?: string | null
          rto_id: string
          student_id: string
        }
        Update: {
          email?: string | null
          id?: string
          name?: string
          phone_number?: string | null
          relationship?: string | null
          rto_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_contacts_guardians_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_contacts_guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_cricos: {
        Row: {
          coe_number: string | null
          completed_previous_course: boolean | null
          country_of_citizenship: string | null
          english_test_date: string | null
          english_test_type: string | null
          has_english_test: boolean | null
          has_previous_study_australia: boolean | null
          has_release_letter: boolean | null
          holds_visa: boolean | null
          id: string
          ielts_score: string | null
          is_international: boolean
          is_under_18: boolean | null
          oshc_end_date: string | null
          oshc_policy_number: string | null
          oshc_provider_name: string | null
          oshc_start_date: string | null
          passport_expiry_date: string | null
          passport_issue_date: string | null
          passport_number: string | null
          place_of_birth: string | null
          previous_provider_name: string | null
          privacy_notice_accepted: boolean | null
          provider_accepting_welfare_responsibility: boolean | null
          provider_arranged_oshc: boolean | null
          rto_id: string
          student_id: string
          visa_application_office: string | null
          visa_expiry_date: string | null
          visa_grant_date: string | null
          visa_number: string | null
          visa_type: string | null
          welfare_start_date: string | null
          written_agreement_accepted: boolean | null
          written_agreement_date: string | null
        }
        Insert: {
          coe_number?: string | null
          completed_previous_course?: boolean | null
          country_of_citizenship?: string | null
          english_test_date?: string | null
          english_test_type?: string | null
          has_english_test?: boolean | null
          has_previous_study_australia?: boolean | null
          has_release_letter?: boolean | null
          holds_visa?: boolean | null
          id?: string
          ielts_score?: string | null
          is_international?: boolean
          is_under_18?: boolean | null
          oshc_end_date?: string | null
          oshc_policy_number?: string | null
          oshc_provider_name?: string | null
          oshc_start_date?: string | null
          passport_expiry_date?: string | null
          passport_issue_date?: string | null
          passport_number?: string | null
          place_of_birth?: string | null
          previous_provider_name?: string | null
          privacy_notice_accepted?: boolean | null
          provider_accepting_welfare_responsibility?: boolean | null
          provider_arranged_oshc?: boolean | null
          rto_id: string
          student_id: string
          visa_application_office?: string | null
          visa_expiry_date?: string | null
          visa_grant_date?: string | null
          visa_number?: string | null
          visa_type?: string | null
          welfare_start_date?: string | null
          written_agreement_accepted?: boolean | null
          written_agreement_date?: string | null
        }
        Update: {
          coe_number?: string | null
          completed_previous_course?: boolean | null
          country_of_citizenship?: string | null
          english_test_date?: string | null
          english_test_type?: string | null
          has_english_test?: boolean | null
          has_previous_study_australia?: boolean | null
          has_release_letter?: boolean | null
          holds_visa?: boolean | null
          id?: string
          ielts_score?: string | null
          is_international?: boolean
          is_under_18?: boolean | null
          oshc_end_date?: string | null
          oshc_policy_number?: string | null
          oshc_provider_name?: string | null
          oshc_start_date?: string | null
          passport_expiry_date?: string | null
          passport_issue_date?: string | null
          passport_number?: string | null
          place_of_birth?: string | null
          previous_provider_name?: string | null
          privacy_notice_accepted?: boolean | null
          provider_accepting_welfare_responsibility?: boolean | null
          provider_arranged_oshc?: boolean | null
          rto_id?: string
          student_id?: string
          visa_application_office?: string | null
          visa_expiry_date?: string | null
          visa_grant_date?: string | null
          visa_number?: string | null
          visa_type?: string | null
          welfare_start_date?: string | null
          written_agreement_accepted?: boolean | null
          written_agreement_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_cricos_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_cricos_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_disabilities: {
        Row: {
          created_at: string
          disability_type_id: string
          id: string
          rto_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          disability_type_id: string
          id?: string
          rto_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          disability_type_id?: string
          id?: string
          rto_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_disabilities_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_disabilities_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_documents: {
        Row: {
          category: string | null
          file_path: string
          id: string
          rto_id: string
          sha256: string | null
          size_bytes: number | null
          source_application_id: string | null
          student_id: string
        }
        Insert: {
          category?: string | null
          file_path: string
          id?: string
          rto_id: string
          sha256?: string | null
          size_bytes?: number | null
          source_application_id?: string | null
          student_id: string
        }
        Update: {
          category?: string | null
          file_path?: string
          id?: string
          rto_id?: string
          sha256?: string | null
          size_bytes?: number | null
          source_application_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_documents_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_documents_source_application_id_fkey"
            columns: ["source_application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_id_sequences: {
        Row: {
          next_val: number
          rto_id: string
          year: number
        }
        Insert: {
          next_val?: number
          rto_id: string
          year: number
        }
        Update: {
          next_val?: number
          rto_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_id_sequences_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      student_prior_education: {
        Row: {
          created_at: string
          id: string
          prior_achievement_id: string
          recognition_type: string | null
          rto_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prior_achievement_id: string
          recognition_type?: string | null
          rto_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prior_achievement_id?: string
          recognition_type?: string | null
          rto_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_prior_education_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_prior_education_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          alternative_email: string | null
          application_id: string | null
          created_at: string
          date_of_birth: string
          email: string
          first_name: string
          id: string
          last_name: string
          middle_name: string | null
          mobile_phone: string | null
          orientation_completed: boolean
          preferred_name: string | null
          rto_id: string
          salutation: string | null
          status: Database["public"]["Enums"]["student_status"]
          student_id_display: string
          user_id: string | null
          work_phone: string | null
          xero_contact_id: string | null
        }
        Insert: {
          alternative_email?: string | null
          application_id?: string | null
          created_at?: string
          date_of_birth: string
          email: string
          first_name: string
          id?: string
          last_name: string
          middle_name?: string | null
          mobile_phone?: string | null
          orientation_completed?: boolean
          preferred_name?: string | null
          rto_id: string
          salutation?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          student_id_display: string
          user_id?: string | null
          work_phone?: string | null
          xero_contact_id?: string | null
        }
        Update: {
          alternative_email?: string | null
          application_id?: string | null
          created_at?: string
          date_of_birth?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          middle_name?: string | null
          mobile_phone?: string | null
          orientation_completed?: boolean
          preferred_name?: string | null
          rto_id?: string
          salutation?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          student_id_display?: string
          user_id?: string | null
          work_phone?: string | null
          xero_contact_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          rto_id: string
          sha256: string | null
          size_bytes: number | null
          subject_id: string
          title: string
          updated_at: string
          visible_from: string | null
          visible_to: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          rto_id: string
          sha256?: string | null
          size_bytes?: number | null
          subject_id: string
          title: string
          updated_at?: string
          visible_from?: string | null
          visible_to?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          rto_id?: string
          sha256?: string | null
          size_bytes?: number | null
          subject_id?: string
          title?: string
          updated_at?: string
          visible_from?: string | null
          visible_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_assignments_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string
          created_at: string
          field_of_education_id: string | null
          id: string
          name: string
          nominal_hours: number | null
          rto_id: string
          vet_flag: string | null
        }
        Insert: {
          code: string
          created_at?: string
          field_of_education_id?: string | null
          id?: string
          name: string
          nominal_hours?: number | null
          rto_id: string
          vet_flag?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          field_of_education_id?: string | null
          id?: string
          name?: string
          nominal_hours?: number | null
          rto_id?: string
          vet_flag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_of_competency_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_program_plans: {
        Row: {
          created_at: string
          id: string
          program_plan_id: string
          timetable_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          program_plan_id: string
          timetable_id: string
        }
        Update: {
          created_at?: string
          id?: string
          program_plan_id?: string
          timetable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_program_plans_program_plan_id_fkey"
            columns: ["program_plan_id"]
            isOneToOne: false
            referencedRelation: "program_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_program_plans_timetable_id_fkey"
            columns: ["timetable_id"]
            isOneToOne: false
            referencedRelation: "timetables"
            referencedColumns: ["id"]
          },
        ]
      }
      timetables: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          name: string
          program_id: string
          rto_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          name: string
          program_id: string
          rto_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          name?: string
          program_id?: string
          rto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetables_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetables_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      twilio_senders: {
        Row: {
          channel: Database["public"]["Enums"]["twilio_channel"]
          created_at: string
          description: string | null
          friendly_name: string
          id: string
          is_active: boolean
          phone_e164: string
          phone_number_sid: string | null
          rto_id: string
          sender_sid: string | null
          updated_at: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["twilio_channel"]
          created_at?: string
          description?: string | null
          friendly_name: string
          id?: string
          is_active?: boolean
          phone_e164: string
          phone_number_sid?: string | null
          rto_id: string
          sender_sid?: string | null
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["twilio_channel"]
          created_at?: string
          description?: string | null
          friendly_name?: string
          id?: string
          is_active?: boolean
          phone_e164?: string
          phone_number_sid?: string | null
          rto_id?: string
          sender_sid?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "twilio_senders_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      twilio_settings: {
        Row: {
          account_sid: string
          auth_token_cipher: string
          auth_token_masked: string
          created_at: string
          id: string
          messaging_service_sid: string | null
          rto_id: string
          updated_at: string
          validate_webhooks: boolean
        }
        Insert: {
          account_sid: string
          auth_token_cipher: string
          auth_token_masked: string
          created_at?: string
          id?: string
          messaging_service_sid?: string | null
          rto_id: string
          updated_at?: string
          validate_webhooks?: boolean
        }
        Update: {
          account_sid?: string
          auth_token_cipher?: string
          auth_token_masked?: string
          created_at?: string
          id?: string
          messaging_service_sid?: string | null
          rto_id?: string
          updated_at?: string
          validate_webhooks?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "twilio_settings_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_table_preferences: {
        Row: {
          column_widths: Json
          created_at: string
          id: string
          rto_id: string
          table_key: string
          updated_at: string | null
          user_id: string
          visible_columns: string[]
        }
        Insert: {
          column_widths?: Json
          created_at?: string
          id?: string
          rto_id: string
          table_key: string
          updated_at?: string | null
          user_id: string
          visible_columns?: string[]
        }
        Update: {
          column_widths?: Json
          created_at?: string
          id?: string
          rto_id?: string
          table_key?: string
          updated_at?: string | null
          user_id?: string
          visible_columns?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "user_table_preferences_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_table_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_status_events: {
        Row: {
          event: Database["public"]["Enums"]["whatsapp_event"]
          id: string
          message_id: string
          occurred_at: string
          payload: Json | null
          rto_id: string
        }
        Insert: {
          event: Database["public"]["Enums"]["whatsapp_event"]
          id?: string
          message_id: string
          occurred_at?: string
          payload?: Json | null
          rto_id: string
        }
        Update: {
          event?: Database["public"]["Enums"]["whatsapp_event"]
          id?: string
          message_id?: string
          occurred_at?: string
          payload?: Json | null
          rto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_status_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_status_events_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          body: string | null
          created_at: string
          direction: Database["public"]["Enums"]["whatsapp_direction"]
          error: string | null
          id: string
          media_urls: string[] | null
          occurred_at: string
          rto_id: string
          sender_id: string
          status: Database["public"]["Enums"]["whatsapp_status"]
          thread_id: string
          twilio_sid: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          direction: Database["public"]["Enums"]["whatsapp_direction"]
          error?: string | null
          id?: string
          media_urls?: string[] | null
          occurred_at?: string
          rto_id: string
          sender_id: string
          status?: Database["public"]["Enums"]["whatsapp_status"]
          thread_id: string
          twilio_sid?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          direction?: Database["public"]["Enums"]["whatsapp_direction"]
          error?: string | null
          id?: string
          media_urls?: string[] | null
          occurred_at?: string
          rto_id?: string
          sender_id?: string
          status?: Database["public"]["Enums"]["whatsapp_status"]
          thread_id?: string
          twilio_sid?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "twilio_senders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_threads: {
        Row: {
          counterparty_e164: string
          created_at: string
          id: string
          last_dir: Database["public"]["Enums"]["whatsapp_direction"] | null
          last_message_at: string | null
          last_status: Database["public"]["Enums"]["whatsapp_status"] | null
          rto_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          counterparty_e164: string
          created_at?: string
          id?: string
          last_dir?: Database["public"]["Enums"]["whatsapp_direction"] | null
          last_message_at?: string | null
          last_status?: Database["public"]["Enums"]["whatsapp_status"] | null
          rto_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          counterparty_e164?: string
          created_at?: string
          id?: string
          last_dir?: Database["public"]["Enums"]["whatsapp_direction"] | null
          last_message_at?: string | null
          last_status?: Database["public"]["Enums"]["whatsapp_status"] | null
          rto_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_threads_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_threads_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "twilio_senders"
            referencedColumns: ["id"]
          },
        ]
      }
      xero_webhook_events: {
        Row: {
          created_at: string
          event_category: string
          event_date_utc: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          resource_id: string
          rto_id: string
        }
        Insert: {
          created_at?: string
          event_category: string
          event_date_utc: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          resource_id: string
          rto_id: string
        }
        Update: {
          created_at?: string
          event_category?: string
          event_date_utc?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          resource_id?: string
          rto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xero_webhook_events_rto_id_fkey"
            columns: ["rto_id"]
            isOneToOne: false
            referencedRelation: "rtos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      finance_logs_view: {
        Row: {
          amount_due_cents: number | null
          attempts: number | null
          commission_invoice_id: string | null
          commission_payment_id: string | null
          event_type: string | null
          invoice_id: string | null
          invoice_number: string | null
          log_id: string | null
          message: string | null
          occurred_at: string | null
          payment_id: string | null
          program_id: string | null
          program_name: string | null
          rto_id: string | null
          status: string | null
          student_email: string | null
          student_id: string | null
          student_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      compute_student_check_char: { Args: { p_stem: string }; Returns: string }
      create_recurring_classes: {
        Args: {
          p_class_type?: Database["public"]["Enums"]["class_type"]
          p_classroom_id?: string
          p_end_date: string
          p_end_time: string
          p_filter_by_subject_range?: boolean
          p_group_id?: string
          p_location_id?: string
          p_notes?: string
          p_program_plan_subject_id: string
          p_recurrence_pattern: Json
          p_recurrence_type: Database["public"]["Enums"]["recurrence_type"]
          p_start_date: string
          p_start_time: string
          p_trainer_id?: string
        }
        Returns: Json
      }
      create_recurring_classes_batch: {
        Args: {
          p_class_type?: Database["public"]["Enums"]["class_type"]
          p_classroom_id?: string
          p_end_date: string
          p_end_time: string
          p_filter_by_subject_range?: boolean
          p_group_id?: string
          p_location_id?: string
          p_notes?: string
          p_program_plan_id: string
          p_recurrence_pattern: Json
          p_recurrence_type: Database["public"]["Enums"]["recurrence_type"]
          p_start_date: string
          p_start_time: string
          p_subject_ids: string[]
          p_trainer_id?: string
        }
        Returns: Json
      }
      expand_class_template: {
        Args: { p_preserve_edited?: boolean; p_template_id: string }
        Returns: Json
      }
      freeze_application_learning_plan: {
        Args: { app_id: string }
        Returns: {
          inserted_classes: number
          inserted_subjects: number
        }[]
      }
      freeze_application_payment_schedule: {
        Args: { app_id: string }
        Returns: {
          inserted_rows: number
        }[]
      }
      generate_application_display_id: {
        Args: { p_created: string; p_uuid: string }
        Returns: string
      }
      generate_application_student_id: {
        Args: { p_application_id: string }
        Returns: string
      }
      generate_commission_invoice_number: {
        Args: { p_rto_id: string }
        Returns: string
      }
      generate_invoice_number: {
        Args: { p_created: string; p_uuid: string }
        Returns: string
      }
      generate_recurrence_dates:
        | {
            Args: {
              p_blackout_dates: string[]
              p_end_date: string
              p_recurrence_pattern: Json
              p_recurrence_type: Database["public"]["Enums"]["recurrence_type"]
              p_start_date: string
            }
            Returns: {
              generated_date: string
            }[]
          }
        | {
            Args: {
              p_blackout_dates?: string[]
              p_end_date: string
              p_filter_by_subject_range?: boolean
              p_recurrence_pattern: Json
              p_recurrence_type: Database["public"]["Enums"]["recurrence_type"]
              p_start_date: string
              p_subject_end_date?: string
              p_subject_start_date?: string
            }
            Returns: {
              generated_date: string
            }[]
          }
      generate_student_display_id:
        | { Args: { p_created: string; p_uuid: string }; Returns: string }
        | { Args: { p_created: string; p_rto: string }; Returns: string }
      get_my_effective_rto_id: { Args: never; Returns: string }
      get_my_rto_id: { Args: never; Returns: string }
      handle_new_user: {
        Args: {
          first_name?: string
          last_name?: string
          role: string
          rto_id: string
          user_id: string
        }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      mark_overdue_invoices_batch: {
        Args: { p_limit?: number }
        Returns: number
      }
      next_student_seq: {
        Args: { p_rto: string; p_year: number }
        Returns: number
      }
      promote_scheduled_invoices: { Args: never; Returns: undefined }
      record_payment: {
        Args: {
          p_amount_cents: number
          p_invoice_id: string
          p_notes?: string
          p_payment_date: string
        }
        Returns: string
      }
      resolve_payment_anchor: {
        Args: { p_app: Database["public"]["Tables"]["applications"]["Row"] }
        Returns: string
      }
      seed_initial_data: { Args: never; Returns: undefined }
      update_template_issue_date_offset: {
        Args: { p_offset_days: number; p_template_id: string }
        Returns: Json
      }
      upsert_application_learning_plan_draft: {
        Args: { app_id: string }
        Returns: {
          inserted_classes: number
          inserted_subjects: number
        }[]
      }
      upsert_application_payment_schedule_draft: {
        Args: { app_id: string }
        Returns: {
          inserted_rows: number
        }[]
      }
      upsert_enrollment_plan: {
        Args: {
          app_id: string
          proposed_commencement_date: string
          timetable_id: string
        }
        Returns: {
          classes_count: number
          subjects_count: number
        }[]
      }
    }
    Enums: {
      announcement_priority: "LOW" | "NORMAL" | "HIGH" | "URGENT"
      announcement_status: "DRAFT" | "SCHEDULED" | "SENT" | "CANCELLED"
      application_status:
        | "DRAFT"
        | "SUBMITTED"
        | "OFFER_GENERATED"
        | "OFFER_SENT"
        | "ACCEPTED"
        | "REJECTED"
        | "APPROVED"
        | "ARCHIVED"
      class_type:
        | "THEORY"
        | "WORKSHOP"
        | "LAB"
        | "ONLINE"
        | "HYBRID"
        | "ASSESSMENT"
      classroom_status: "AVAILABLE" | "MAINTENANCE" | "DECOMMISSIONED"
      classroom_type:
        | "CLASSROOM"
        | "COMPUTER_LAB"
        | "WORKSHOP"
        | "KITCHEN"
        | "MEETING_ROOM"
        | "OTHER"
      email_participant_type: "TO" | "CC" | "BCC"
      email_status:
        | "QUEUED"
        | "SENT"
        | "DELIVERED"
        | "FAILED"
        | "BOUNCED"
        | "COMPLAINED"
      enrollment_status:
        | "PENDING"
        | "ACTIVE"
        | "COMPLETED"
        | "WITHDRAWN"
        | "DEFERRED"
      internal_payment_status:
        | "UNPAID"
        | "PARTIALLY_PAID"
        | "PAID_INTERNAL"
        | "PAID_CONFIRMED"
      invoice_pdf_generation_status: "pending" | "succeeded" | "failed"
      invoice_status:
        | "DRAFT"
        | "SENT"
        | "PAID"
        | "VOID"
        | "OVERDUE"
        | "SCHEDULED"
      payment_plan_anchor_type:
        | "COMMENCEMENT_DATE"
        | "OFFER_DATE"
        | "CUSTOM_DATE"
      recurrence_type: "once" | "daily" | "weekly" | "monthly" | "custom"
      student_address_type: "street" | "postal"
      student_status: "ACTIVE" | "INACTIVE" | "COMPLETED" | "WITHDRAWN"
      twilio_channel: "whatsapp" | "sms"
      user_role:
        | "ADMISSIONS_OFFICER"
        | "SENIOR_ADMISSIONS_OFFICER"
        | "COMPLIANCE_MANAGER"
        | "ACADEMIC_HEAD"
        | "FINANCE_OFFICER"
        | "ADMIN"
        | "TRAINER"
        | "STUDENT"
      whatsapp_direction: "OUT" | "IN"
      whatsapp_event:
        | "queued"
        | "sending"
        | "sent"
        | "delivered"
        | "read"
        | "undelivered"
        | "failed"
      whatsapp_status:
        | "queued"
        | "sending"
        | "sent"
        | "delivered"
        | "read"
        | "undelivered"
        | "failed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      announcement_priority: ["LOW", "NORMAL", "HIGH", "URGENT"],
      announcement_status: ["DRAFT", "SCHEDULED", "SENT", "CANCELLED"],
      application_status: [
        "DRAFT",
        "SUBMITTED",
        "OFFER_GENERATED",
        "OFFER_SENT",
        "ACCEPTED",
        "REJECTED",
        "APPROVED",
        "ARCHIVED",
      ],
      class_type: [
        "THEORY",
        "WORKSHOP",
        "LAB",
        "ONLINE",
        "HYBRID",
        "ASSESSMENT",
      ],
      classroom_status: ["AVAILABLE", "MAINTENANCE", "DECOMMISSIONED"],
      classroom_type: [
        "CLASSROOM",
        "COMPUTER_LAB",
        "WORKSHOP",
        "KITCHEN",
        "MEETING_ROOM",
        "OTHER",
      ],
      email_participant_type: ["TO", "CC", "BCC"],
      email_status: [
        "QUEUED",
        "SENT",
        "DELIVERED",
        "FAILED",
        "BOUNCED",
        "COMPLAINED",
      ],
      enrollment_status: [
        "PENDING",
        "ACTIVE",
        "COMPLETED",
        "WITHDRAWN",
        "DEFERRED",
      ],
      internal_payment_status: [
        "UNPAID",
        "PARTIALLY_PAID",
        "PAID_INTERNAL",
        "PAID_CONFIRMED",
      ],
      invoice_pdf_generation_status: ["pending", "succeeded", "failed"],
      invoice_status: ["DRAFT", "SENT", "PAID", "VOID", "OVERDUE", "SCHEDULED"],
      payment_plan_anchor_type: [
        "COMMENCEMENT_DATE",
        "OFFER_DATE",
        "CUSTOM_DATE",
      ],
      recurrence_type: ["once", "daily", "weekly", "monthly", "custom"],
      student_address_type: ["street", "postal"],
      student_status: ["ACTIVE", "INACTIVE", "COMPLETED", "WITHDRAWN"],
      twilio_channel: ["whatsapp", "sms"],
      user_role: [
        "ADMISSIONS_OFFICER",
        "SENIOR_ADMISSIONS_OFFICER",
        "COMPLIANCE_MANAGER",
        "ACADEMIC_HEAD",
        "FINANCE_OFFICER",
        "ADMIN",
        "TRAINER",
        "STUDENT",
      ],
      whatsapp_direction: ["OUT", "IN"],
      whatsapp_event: [
        "queued",
        "sending",
        "sent",
        "delivered",
        "read",
        "undelivered",
        "failed",
      ],
      whatsapp_status: [
        "queued",
        "sending",
        "sent",
        "delivered",
        "read",
        "undelivered",
        "failed",
      ],
    },
  },
} as const

