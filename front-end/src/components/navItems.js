export const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard" },
  { key: "browse", label: "Browse", path: "/browse" },
  { key: "history", label: "Transaction History", path: "/history" },
  { key: "receipts", label: "Receipts", path: "/receipts" },
  {
    key: "institution-management",
    label: "Institution Management",
    path: "/admin/institutions",
    roles: ["admin"],
  },
  {
    key: "back-office-management",
    label: "Back Office Management",
    path: "/admin/back-office",
    roles: ["admin"],
  },
];
