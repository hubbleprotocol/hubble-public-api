import { createLogger, format, transports } from 'winston';
import { StreamOptions } from 'morgan';

const logger = createLogger({
  level: 'info',
  format: format.combine(format.errors({ stack: true }), format.splat(), format.json()),
  defaultMeta: { service: 'hubble-public-api' },
  transports: [
    process.env.NODE_ENV !== 'production'
      ? new transports.Console({
          format: format.combine(
            format.colorize(),
            format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            format.simple()
          ),
        })
      : new transports.Console(),
  ],
});

export const loggingStream: StreamOptions = {
  write: (text: string) => {
    logger.info(text.trim());
  },
};

export const logObject = (obj: Object) => {
  logger.info('%O', obj);
};

export default logger;
