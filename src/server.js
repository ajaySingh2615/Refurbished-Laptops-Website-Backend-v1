import "dotenv/config";
import pino from "pino";
import pinoPretty from "pino-pretty";
import app from "./app.js";

const logger = pino(
  pinoPretty({ translateTime: "SYS:standard", ignore: "pid, hostname" })
);

const port = Number(process.env.PORT) || 8080;

app.listen(port, () => {
  logger.info(`Backend listening on http://localhost:${port}`);
});
