import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://postgres:changeme123@localhost:5432/mozambique_procurement',
  jwtSecret: process.env.JWT_SECRET ?? 'dev_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
  openAiApiKey: process.env.OPENAI_API_KEY ?? '',
  openAiModel: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
  vatRate: Number(process.env.VAT_RATE ?? 0.17),
  beneficialOwnershipThreshold: Number(process.env.BENEFICIAL_OWNERSHIP_THRESHOLD ?? 60000000),
  localContentMarginWorks: Number(process.env.LOCAL_CONTENT_MARGIN_WORKS ?? 0.15),
  localContentMarginGoods: Number(process.env.LOCAL_CONTENT_MARGIN_GOODS ?? 0.20),
  invoiceRetentionYears: Number(process.env.INVOICE_RETENTION_YEARS ?? 10)
};
