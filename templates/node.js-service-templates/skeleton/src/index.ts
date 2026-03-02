import express from "express";
import cors from "cors";
import helmet from "helmet";

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/ready", (_req, res) => {
  res.status(200).json({ ready: true });
});

app.get("/", (_req, res) => {
  res.json({
    service: "{{ name }}",
    version: "{{ api_version }}",
    description: "{{ description }}"
  });
});

const PORT = process.env.PORT || {{ port_number }};

app.listen(PORT, () => {
  console.log(`Service running on port ${PORT}`);
});