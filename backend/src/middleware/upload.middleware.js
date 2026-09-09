import multer from "multer";

const storage = multer.memoryStorage();

export const uploadCsv = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {

    const isCsv =
      file.mimetype === "text/csv" ||
      file.originalname
        .toLowerCase()
        .endsWith(".csv");

    if (!isCsv) {
      return cb(
        new Error("Only CSV files are allowed")
      );
    }

    cb(null, true);
  }
});