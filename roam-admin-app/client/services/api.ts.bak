import { supabase } from "@/lib/supabase";

// Generic API service class
export class ApiService {
  // Auth methods
  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  static async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  // Generic database methods
  static async select<T>(
    table: string,
    columns = "*",
    filters?: Record<string, any>,
  ): Promise<T[]> {
    let query = supabase.from(table).select(columns);

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as T[];
  }

  static async insert<T>(table: string, data: Partial<T>) {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result as T;
  }

  static async update<T>(table: string, id: string, data: Partial<T>) {
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return result as T;
  }

  static async delete(table: string, id: string) {
    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) throw error;
  }

  // Specific service methods can be added here for each entity
  // Example: Users, Bookings, Promotions, etc.
}

// Export specific service methods for different entities
export const UserService = {
  async getAll() {
    return ApiService.select("users");
  },

  async getById(id: string) {
    const users = await ApiService.select("users", "*", { id });
    return users[0] || null;
  },

  async create(userData: any) {
    return ApiService.insert("users", userData);
  },

  async update(id: string, userData: any) {
    return ApiService.update("users", id, userData);
  },

  async delete(id: string) {
    return ApiService.delete("users", id);
  },
};

export const BookingService = {
  async getAll() {
    return ApiService.select("bookings");
  },

  async getById(id: string) {
    const bookings = await ApiService.select("bookings", "*", { id });
    return bookings[0] || null;
  },

  async create(bookingData: any) {
    return ApiService.insert("bookings", bookingData);
  },

  async update(id: string, bookingData: any) {
    return ApiService.update("bookings", id, bookingData);
  },

  async delete(id: string) {
    return ApiService.delete("bookings", id);
  },
};

export const PromotionService = {
  async getAll() {
    return ApiService.select("promotions");
  },

  async getById(id: string) {
    const promotions = await ApiService.select("promotions", "*", { id });
    return promotions[0] || null;
  },

  async create(promotionData: any) {
    return ApiService.insert("promotions", promotionData);
  },

  async update(id: string, promotionData: any) {
    return ApiService.update("promotions", id, promotionData);
  },

  async delete(id: string) {
    return ApiService.delete("promotions", id);
  },
};
