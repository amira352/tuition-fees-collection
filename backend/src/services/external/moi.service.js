import axios from "axios";

const moiClient = axios.create({
  baseURL: process.env.MOI_BASE_URL,
  headers: {
    "X-API-Key": process.env.MOI_API_KEY,
    "Content-Type": "application/json"
  },
  timeout: 10000
});


export const validateNationalIdWithMOI = async (
  nationalId
) => {
  try {

    const response = await moiClient.post(
      "/api/v1/moi/validate",
      {
        national_id: nationalId
      }
    );

    return response.data;

  } catch (error) {

    console.error(
      "MOI service error:",
      error.response?.data || error.message
    );

    const serviceError = new Error(
      "Unable to validate National ID with MOI"
    );

    serviceError.statusCode = 502;

    throw serviceError;
  }
};