import dotenv from "dotenv";

dotenv.config();

import { supabase } from "../config/supabase.js";

import {
  createNationalIdHmac
} from "../utils/hmac.js";

import {
  encryptNationalId
} from "../utils/encryption.js";


const seedData = async () => {

  try {

    console.log("Starting seed...");


    // =====================================
    // PARENT 1
    // MOI TEST DATA
    // =====================================

    const monaNationalId =
      "29805150101023";

    const monaHmac =
      createNationalIdHmac(
        monaNationalId
      );

    const monaEncrypted =
      encryptNationalId(
        monaNationalId
      );


    const {
      data: monaParent,
      error: monaError
    } = await supabase
      .from("parents")
      .insert({
        national_id_hmac: monaHmac,
        national_id_encrypted: monaEncrypted,
        name: "Mona Samir Abdelrahman",
        is_cib_customer: false
      })
      .select()
      .single();


    if (monaError) {
      throw monaError;
    }


    console.log(
      "Parent Mona created:",
      monaParent.id
    );


    // =====================================
    // GET INSTITUTIONS
    // =====================================

    const {
      data: institutions,
      error: institutionsError
    } = await supabase
      .from("institutions")
      .select("id, name");


    if (institutionsError) {
      throw institutionsError;
    }


    const school =
      institutions.find(
        (institution) =>
          institution.name ===
          "Cairo International School"
      );


    const university =
      institutions.find(
        (institution) =>
          institution.name ===
          "Ain Shams University"
      );


    if (!school || !university) {
      throw new Error(
        "Required institutions not found"
      );
    }


    // =====================================
    // CHILD 1
    // =====================================

    const {
      data: child1,
      error: child1Error
    } = await supabase
      .from("children")
      .insert({
        parent_id: monaParent.id,
        institution_id: school.id,
        name: "Ahmed Mohamed",
        student_code: "STU001"
      })
      .select()
      .single();


    if (child1Error) {
      throw child1Error;
    }


    // =====================================
    // CHILD 2
    // =====================================

    const {
      data: child2,
      error: child2Error
    } = await supabase
      .from("children")
      .insert({
        parent_id: monaParent.id,
        institution_id: university.id,
        name: "Sara Mohamed",
        student_code: "STU002"
      })
      .select()
      .single();


    if (child2Error) {
      throw child2Error;
    }


    // =====================================
    // FEES FOR CHILD 1
    // =====================================

    const {
      error: fees1Error
    } = await supabase
      .from("fees")
      .insert([
        {
          child_id: child1.id,
          fee_type: "Transportation",
          period: "Semester 1",
          amount: 500,
          outstanding_amount: 500,
          currency: "EGP",
          status: "unpaid"
        },
        {
          child_id: child1.id,
          fee_type: "Semester Fees",
          period: "Semester 1",
          amount: 20000,
          outstanding_amount: 20000,
          currency: "EGP",
          status: "unpaid"
        }
      ]);


    if (fees1Error) {
      throw fees1Error;
    }


    // =====================================
    // FEES FOR CHILD 2
    // =====================================

    const {
      error: fees2Error
    } = await supabase
      .from("fees")
      .insert([
        {
          child_id: child2.id,
          fee_type: "Semester Fees",
          period: "Semester 1",
          amount: 30000,
          outstanding_amount: 30000,
          currency: "EGP",
          status: "unpaid"
        }
      ]);


    if (fees2Error) {
      throw fees2Error;
    }


    console.log(
      "Seed completed successfully"
    );

  } catch (error) {

    console.error(
      "Seed failed:",
      error.message
    );

  }

};


seedData();