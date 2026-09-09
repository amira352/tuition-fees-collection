import { supabase } from "../config/supabase.js";

export const getDailyReportData = async (institutionId, date) => {
  const { data, error } = await supabase.rpc("get_daily_report", {
    p_institution_id: institutionId,
    p_date: date,
    p_timezone: process.env.REPORT_TIMEZONE || "Africa/Cairo"
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
