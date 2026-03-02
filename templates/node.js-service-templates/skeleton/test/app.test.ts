import request from "supertest";
import express from "express";

const app = express();

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

describe("Health endpoint", () => {
  it("should return 200", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
  });
});