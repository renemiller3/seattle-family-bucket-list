export type ActivityType = 'activity' | 'event'
export type PlanItemType = 'activity' | 'life_block' | 'custom' | 'restaurant'
export type AgeRange = 'All Ages' | 'Toddler' | '3-5' | '5+' | '8+' | '12+'
export type Area = 'Seattle' | 'Eastside' | 'North' | 'South' | 'Tacoma'
export type Cost = 'Free' | '$' | '$$' | '$$$'
export type Vibe = 'Chill / Easy' | 'Burn Energy' | 'Outdoor / Nature' | 'Rainy Day' | 'Special / Treat' | 'Quick Outing'
export type Recurrence = 'one-time' | 'seasonal' | 'annual'

export interface NearbyFood {
  name: string
  description: string
}

export interface Activity {
  id: string
  title: string
  description: string
  location_text: string
  location_url: string
  lat: number | null
  lng: number | null
  type: ActivityType
  age_range: AgeRange[]
  area: Area
  cost: Cost
  vibes: Vibe[]
  why_its_worth_it: string
  what_to_watch_out_for: string[]
  tips: string | null
  nearby_food: NearbyFood[]
  start_date: string | null
  end_date: string | null
  recurrence: Recurrence | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  created_at: string
}

export interface PlanItem {
  id: string
  user_id: string
  activity_id: string | null
  type: PlanItemType
  title: string | null
  date: string
  start_time: string | null
  end_time: string | null
  duration_minutes: number | null
  travel_time_before: number | null
  travel_time_after: number | null
  sort_order: number
  notes: string | null
  is_completed: boolean
  created_at: string
  updated_at: string
  activity?: Activity
}

export interface PlanNote {
  id: string
  user_id: string
  content: string
  updated_at: string
}

export interface SharedPlan {
  id: string
  user_id: string
  slug: string
  title: string | null
  is_active: boolean
  created_at: string
}

export interface ActivityPhoto {
  id: string
  user_id: string
  activity_id: string
  plan_item_id: string | null
  photo_url: string
  date_completed: string
  created_at: string
}

export interface SavedActivity {
  user_id: string
  activity_id: string
  created_at: string
}

// Supabase Database type for typed client
export interface Database {
  public: {
    Tables: {
      activities: {
        Row: Activity
        Insert: Omit<Activity, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Activity, 'id' | 'created_at' | 'updated_at'>>
      }
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      plan_items: {
        Row: PlanItem
        Insert: Omit<PlanItem, 'id' | 'created_at' | 'updated_at' | 'activity'>
        Update: Partial<Omit<PlanItem, 'id' | 'created_at' | 'updated_at' | 'activity'>>
      }
      plan_notes: {
        Row: PlanNote
        Insert: Omit<PlanNote, 'id' | 'updated_at'>
        Update: Partial<Omit<PlanNote, 'id' | 'updated_at'>>
      }
      shared_plans: {
        Row: SharedPlan
        Insert: Omit<SharedPlan, 'id' | 'created_at'>
        Update: Partial<Omit<SharedPlan, 'id' | 'created_at'>>
      }
      activity_photos: {
        Row: ActivityPhoto
        Insert: Omit<ActivityPhoto, 'id' | 'created_at'>
        Update: Partial<Omit<ActivityPhoto, 'id' | 'created_at'>>
      }
      saved_activities: {
        Row: SavedActivity
        Insert: Omit<SavedActivity, 'created_at'>
        Update: never
      }
    }
  }
}
