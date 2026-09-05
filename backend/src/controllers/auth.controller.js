import { loginBankEmployee } from "../services/auth.service.js";


export const login = async (req, res, next) => {

  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "email and password are required"
      });
    }

    const result = await loginBankEmployee(
      email,
      password
    );

    return res.status(200).json({
      message: "Login successful",
      data: result
    });

  } catch (error) {
    next(error);
  }
};