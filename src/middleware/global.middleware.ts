import { inject } from "awilix-express";
import { serverSettingsKey } from "@/constants/server-settings.constants";
import { ForbiddenError } from "@/exceptions/runtime.exceptions";
import { NextFunction, Request, Response } from "express";
import { SettingsStore } from "@/state/settings.store";
import { ILoggerFactory } from "@/handlers/logger-factory";
import { IConfigService } from "@/services/core/config.service";

export const validateWizardCompleted = inject(
  ({
      configService,
      settingsStore,
      loggerFactory,
    }: {
      configService: IConfigService;
      settingsStore: SettingsStore;
      loggerFactory: ILoggerFactory;
    }) =>
    async (req: Request, res: Response, next: NextFunction) => {
      const logger = loggerFactory(validateWizardCompleted.name);
      const isDemoMode = configService.isDemoMode();
      if (isDemoMode || !!settingsStore.getWizardSettings()?.wizardCompleted) {
        next();
        return;
      }

      const allowedPaths = [
        "/api/first-time-setup/complete",
        "/api/first-time-setup/validate",
        "/api/test",
        "/api/auth/login-required",
      ];
      if (allowedPaths.includes(req.path) || !req.path.startsWith("/api")) {
        next();
        return;
      } else {
        logger.error("Wizard not completed", req.path);
        throw new ForbiddenError(`First-time-setup not completed, these api paths are enabled: ${allowedPaths.join(", ")}`);
      }
    }
);

export const interceptRoles = inject(
  ({ settingsStore, roleService, isTypeormMode }) =>
    async (req: Request, res: Response, next: NextFunction) => {
      const serverSettings = await settingsStore.getSettings();

      if (isTypeormMode) {
        req.roles = req.user?.roles.map((r) => r.roleId);
      } else {
        req.roles = req.user?.roles;
      }

      // If server settings are not set, we can't determine the default role
      if (serverSettings && !req.user) {
        const roleName = await roleService.getAppDefaultRole();
        req.roles = [roleName];
      }

      next();
    }
);
