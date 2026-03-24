export interface Owner {
    id: string
    owner_key: string
    owner_type: 'student' | 'staff'
    full_name: string
    surname?: string
    other_names?: string
    primary_identifier?: string
    photo_url?: string
    created_at: string
    updated_at: string
  }
  
  export interface Student {
    id: string
    owner_id: string
    matric_number: string
    programme_id?: string
    level?: string
    admission_year?: number
    graduation_year?: number
    academic_status?: string
    created_at: string
  }