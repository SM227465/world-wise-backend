const pino = require('pino');

const transport = pino.transport({
  target: 'pino-pretty',
  options: { colorize: true },
});

const logger = pino({ base: { pid: false } }, transport);

module.exports = logger;
