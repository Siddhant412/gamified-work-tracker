export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          avatar_url: string | null;
          timezone: string;
          tracking_started_on: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string;
          avatar_url?: string | null;
          timezone?: string;
          tracking_started_on?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          display_name?: string;
          avatar_url?: string | null;
          timezone?: string;
          tracking_started_on?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_application_counts: {
        Row: {
          user_id: string;
          activity_date: string;
          count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          activity_date: string;
          count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: 'pending' | 'accepted' | 'declined' | 'blocked';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          addressee_id: string;
          status?: 'pending' | 'accepted' | 'declined' | 'blocked';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'pending' | 'accepted' | 'declined' | 'blocked';
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          notes: string;
          status: 'todo' | 'doing' | 'done';
          priority: 'low' | 'medium' | 'high';
          due_date: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          notes?: string;
          status?: 'todo' | 'doing' | 'done';
          priority?: 'low' | 'medium' | 'high';
          due_date?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          notes?: string;
          status?: 'todo' | 'doing' | 'done';
          priority?: 'low' | 'medium' | 'high';
          due_date?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      adjust_today_application_count: {
        Args: { delta: number };
        Returns: number;
      };
      find_profile_by_email: {
        Args: { search_email: string };
        Returns: {
          id: string;
          email: string;
          display_name: string;
          avatar_url: string | null;
        }[];
      };
      send_friend_request: {
        Args: { target_user_id: string };
        Returns: string;
      };
      respond_friend_request: {
        Args: { request_id: string; action: 'accepted' | 'declined' | 'blocked' };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
