import { supabase } from "../config/supabase.js";


export const findUploadByContentHash = async (
  institutionId,
  contentHash
) => {

  const { data, error } = await supabase
    .from("csv_uploads")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("content_hash", contentHash)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};


export const createCsvUpload = async ({
  institutionId,
  filename,
  contentHash,
  totalRows,
  acceptedRows,
  rejectedRows,
  errors
}) => {

  const { data, error } = await supabase
    .from("csv_uploads")
    .insert({
      institution_id: institutionId,
      filename,
      content_hash: contentHash,
      total_rows: totalRows,
      accepted_rows: acceptedRows,
      rejected_rows: rejectedRows,
      errors_json: errors
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};


export const findCsvUploadById = async (
  uploadId,
  institutionId
) => {

  const { data, error } = await supabase
    .from("csv_uploads")
    .select("*")
    .eq("id", uploadId)
    .eq("institution_id", institutionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};