import test from "node:test";
import assert from "node:assert/strict";
import { mergeFeeTypeCasing } from "../src/services/report.service.js";

test("mergeFeeTypeCasing: folds fee types that differ only by case or whitespace into one row", () => {
  const rows = mergeFeeTypeCasing([
    { fee_type: "Tuition", payments_count: 3, total_collected: "1500", total_outstanding: "250000" },
    { fee_type: "transportation", payments_count: 1, total_collected: "0", total_outstanding: "4000" },
    { fee_type: "Transportation ", payments_count: 2, total_collected: "200", total_outstanding: "6500" }
  ]);

  assert.equal(rows.length, 2);
  const transport = rows.find((r) => r.fee_type === "Transportation");
  assert.ok(transport, "keeps the capitalised label");
  assert.equal(transport.payments_count, 3);
  assert.equal(transport.total_collected, 200);
  assert.equal(transport.total_outstanding, 10500);
});

test("mergeFeeTypeCasing: prefers the capitalised label even when the lowercase one comes first", () => {
  const [row] = mergeFeeTypeCasing([
    { fee_type: "books", payments_count: 0, total_collected: 0, total_outstanding: 10 },
    { fee_type: "Books", payments_count: 0, total_collected: 0, total_outstanding: 5 }
  ]);
  assert.equal(row.fee_type, "Books");
  assert.equal(row.total_outstanding, 15);
});

test("mergeFeeTypeCasing: leaves distinct fee types alone and coerces numeric strings", () => {
  const rows = mergeFeeTypeCasing([
    { fee_type: "Tuition", payments_count: "2", total_collected: "10", total_outstanding: "20" },
    { fee_type: "Uniform", payments_count: "1", total_collected: "5", total_outstanding: "0" }
  ]);
  assert.deepEqual(rows.map((r) => r.fee_type), ["Tuition", "Uniform"]);
  assert.equal(rows[0].payments_count, 2);
  assert.equal(rows[0].total_collected, 10);
});
