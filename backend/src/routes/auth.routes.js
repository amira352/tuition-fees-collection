import express from "express";

import { loginUser } from "../controllers/auth.controller.js";


const router = express.Router();


router.post("/loginUser", loginUser);


export default router;