import { AppConstants } from "@/server.constants";
import { v4 as uuidv4 } from "uuid";
import {
  CredentialSettingsDto,
  FileCleanSettingsDto,
  FrontendSettingsDto,
  ServerSettingsDto,
  TimeoutSettingsDto,
  WizardSettingsDto,
} from "@/services/interfaces/settings.dto";

export const getDefaultWhitelistIpAddresses = () => ["::12", "127.0.0.1"];

export const wizardSettingKey = "wizard";
export const getDefaultWizardSettings = (): WizardSettingsDto => ({
  wizardCompleted: false,
  wizardCompletedAt: null,
  wizardVersion: 0,
});

export const serverSettingsKey = "server";
export const getDefaultServerSettings = (): ServerSettingsDto => ({
  debugSettings: {
    debugSocketIoEvents: false,
    debugSocketReconnect: false,
    debugSocketRetries: false,
    debugSocketSetup: false,
    debugSocketMessages: false,
    debugSocketIoBandwidth: false,
  },
  sentryDiagnosticsEnabled: false,
  loginRequired: true,
  registration: false,
  whitelistEnabled: false,
  whitelistedIpAddresses: getDefaultWhitelistIpAddresses(),
  experimentalMoonrakerSupport: false,
});

export const credentialSettingsKey = "credentials";
export const getDefaultCredentialSettings = (): CredentialSettingsDto => ({
  // Verification and signing of JWT tokens, can be changed on the fly
  jwtSecret: uuidv4(),
  // Signing only, verification is automatic
  jwtExpiresIn: AppConstants.DEFAULT_JWT_EXPIRES_IN,
  // Verification only, bringing into effect requires updating all stored refresh tokens
  refreshTokenAttempts: AppConstants.DEFAULT_REFRESH_TOKEN_ATTEMPTS,
  // Verification only, bringing into effect requires updating all stored refresh tokens
  refreshTokenExpiry: AppConstants.DEFAULT_REFRESH_TOKEN_EXPIRY,
});

export const frontendSettingKey = "frontend";
export const getDefaultFrontendSettings = (): FrontendSettingsDto => ({
  gridCols: 8,
  gridRows: 8,
  largeTiles: false,
});

export const timeoutSettingKey = "timeout";
export const getDefaultTimeout = (): TimeoutSettingsDto => ({
  apiTimeout: 10000,
});

export const fileCleanSettingKey = "printerFileClean";
export const getDefaultFileCleanSettings = (): FileCleanSettingsDto => ({
  autoRemoveOldFilesBeforeUpload: false,
  autoRemoveOldFilesAtBoot: false,
  autoRemoveOldFilesCriteriumDays: 7,
});

export const getDefaultSettings = () => ({
  [serverSettingsKey]: getDefaultServerSettings(),
  [wizardSettingKey]: getDefaultWizardSettings(),
  [credentialSettingsKey]: getDefaultCredentialSettings(),
  [fileCleanSettingKey]: getDefaultFileCleanSettings(),
  [frontendSettingKey]: getDefaultFrontendSettings(),
  [timeoutSettingKey]: getDefaultTimeout(),
});
