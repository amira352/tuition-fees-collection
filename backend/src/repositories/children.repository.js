import { supabase } from "../config/supabase.js";


export const findChildByStudentCode = async ({
  institutionId,
  studentCode
}) => {
  const { data, error } = await supabase
    .from("children")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("student_code", studentCode)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};


export const createChild = async ({
  parentId,
  institutionId,
  name,
  studentCode
}) => {
  const { data, error } = await supabase
    .from("children")
    .insert({
      parent_id: parentId,
      institution_id: institutionId,
      name,
      student_code: studentCode
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};