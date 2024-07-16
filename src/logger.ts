import winston from "winston";

const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.colorize({ level: true }),
    winston.format.metadata({}),
    winston.format.printf(({ level, metadata, message }) => {
      return `${level}: ${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
