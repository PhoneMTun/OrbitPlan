export const databaseConfig = {
  url: process.env.DATABASE_URL,
};

export const isDatabaseConfigured = () => Boolean(databaseConfig.url);
