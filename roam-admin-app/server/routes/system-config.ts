import { Request, Response } from "express";
import { supabase } from "../lib/supabase.js";

export async function handleSystemConfig(req: Request, res: Response) {
  try {
    const { keys } = req.query;

    let query = supabase
      .from("system_config")
      .select("config_key, config_value")
      .eq("is_public", true);

    // Filter by specific keys if provided
    if (keys && typeof keys === "string") {
      const keyArray = keys.split(",").map((k) => k.trim());
      query = query.in("config_key", keyArray);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching system config:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch system configuration" });
    }

    res.json(data || []);
  } catch (error) {
    console.error("System config API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
