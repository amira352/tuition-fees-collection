import multer from "multer";

const storage = multer.memoryStorage();

export const uploadXlsx = multer({
  storage,

  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Only XLSX files are allowed"));
    }

    cb(null, true);
  },

  limits: {
    fileSize: 5 * 1024 * 1024
  }
});