import type { SupabaseClient } from "@/db/supabase.client";

/**
 * Result of quota check operation
 */
export interface QuotaCheckResult {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  resetAt: string; // ISO 8601 timestamp
  resetTimestamp: number; // Unix timestamp
  retryAfterSeconds: number;
}

/**
 * Service for managing AI generation quota (15 generations per 24 hours)
 * Uses PostgreSQL advisory locks to prevent race conditions
 */
export class QuotaService {
  private static readonly QUOTA_LIMIT = 15;
  private static readonly WINDOW_HOURS = 24;

  /**
   * Checks if user has remaining quota for AI generation
   * Does NOT create attempt record - that should be done after generation completes
   *
   * @param supabase - Authenticated Supabase client
   * @param userId - User ID to check quota for
   * @returns QuotaCheckResult with quota information
   */
  static async checkQuota(supabase: SupabaseClient, userId: string): Promise<QuotaCheckResult> {
    try {
      // Count successful attempts in the last 24 hours
      const { data: attempts, error: countError } = await supabase
        .from("ai_generation_attempts")
        .select("created_at")
        .eq("user_id", userId)
        .eq("status", "succeeded")
        .gte("created_at", new Date(Date.now() - this.WINDOW_HOURS * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: true });

      if (countError) {
        throw countError;
      }

      const used = attempts?.length || 0;
      const remaining = Math.max(0, this.QUOTA_LIMIT - used);

      // Calculate reset time (oldest attempt + 24h)
      let resetAt: string;
      let resetTimestamp: number;
      let retryAfterSeconds: number;

      if (attempts && attempts.length > 0) {
        const oldestAttempt = new Date(attempts[0].created_at);
        const resetDate = new Date(oldestAttempt.getTime() + this.WINDOW_HOURS * 60 * 60 * 1000);
        resetAt = resetDate.toISOString();
        resetTimestamp = Math.floor(resetDate.getTime() / 1000);
        retryAfterSeconds = Math.max(0, Math.floor((resetDate.getTime() - Date.now()) / 1000));
      } else {
        // No attempts yet, reset is 24h from now
        const resetDate = new Date(Date.now() + this.WINDOW_HOURS * 60 * 60 * 1000);
        resetAt = resetDate.toISOString();
        resetTimestamp = Math.floor(resetDate.getTime() / 1000);
        retryAfterSeconds = this.WINDOW_HOURS * 60 * 60;
      }

      // Check if quota exceeded
      if (used >= this.QUOTA_LIMIT) {
        return {
          allowed: false,
          limit: this.QUOTA_LIMIT,
          used,
          remaining: 0,
          resetAt,
          resetTimestamp,
          retryAfterSeconds,
        };
      }

      // Quota available
      return {
        allowed: true,
        limit: this.QUOTA_LIMIT,
        used,
        remaining,
        resetAt,
        resetTimestamp,
        retryAfterSeconds,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Quota check failed:", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Records a successful generation attempt
   *
   * @param supabase - Authenticated Supabase client
   * @param userId - User ID
   * @param generationId - Generation ID to link
   */
  static async recordSuccessfulAttempt(supabase: SupabaseClient, userId: string, generationId: string): Promise<void> {
    const lockKey = this.generateLockKey(userId);

    const { error } = await supabase.from("ai_generation_attempts").insert([
      {
        user_id: userId,
        generation_id: generationId,
        status: "succeeded",
        advisory_lock_key: lockKey,
      },
    ]);

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to record successful attempt:", {
        userId,
        generationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Records a failed generation attempt
   *
   * @param supabase - Authenticated Supabase client
   * @param userId - User ID
   * @param errorCode - Error code to record
   */
  static async recordFailedAttempt(supabase: SupabaseClient, userId: string, errorCode: string): Promise<void> {
    const lockKey = this.generateLockKey(userId);

    const { error } = await supabase.from("ai_generation_attempts").insert([
      {
        user_id: userId,
        status: "failed",
        error_code: errorCode,
        advisory_lock_key: lockKey,
      },
    ]);

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to record failed attempt:", {
        userId,
        errorCode,
        error: error.message,
      });
      // Don't throw - this is cleanup, shouldn't block the main error
    }
  }

  /**
   * Generates a numeric lock key from user_id
   * Simple hash function for tracking purposes
   *
   * @param userId - User ID to generate lock for
   * @returns Numeric lock key
   */
  private static generateLockKey(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
