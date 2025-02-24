export class OctoprintRoutes {
  octoPrintBase = "/";
  apiBase = `${this.octoPrintBase}api`;
  apiVersion = `${this.apiBase}/version`;
  apiServer = `${this.apiBase}/server`;
  apiCurrentUser = `${this.apiBase}/currentuser`;
  apiSettingsPart = `${this.apiBase}/settings`;
  apiFiles = `${this.apiBase}/files`;
  apiFilesLocal = `${this.apiFiles}/local`;
  apiConnection = `${this.apiBase}/connection`;
  apiJob = `${this.apiBase}/job`;
  apiPrinter = `${this.apiBase}/printer`;
  apiPrinterHead = `${this.apiBase}/printer/printhead`;
  apiPrinterBed = `${this.apiPrinter}/bed`;
  apiPrinterCustomCommand = `${this.apiPrinter}/command`;
  apiPrinterProfiles = `${this.apiBase}/printerprofiles`;
  apiSystem = `${this.apiBase}/system`;
  apiSystemInfo = `${this.apiSystem}/info`;
  apiSystemCommands = `${this.apiSystem}/commands`;
  apiServerRestartCommand = `${this.apiSystemCommands}/core/restart`;
  apiUsers = `${this.apiBase}/users`;
  apiLogin = `${this.apiBase}/login?passive=true`;
  apiPluginPiSupport = `${this.apiBase}/plugin/pi_support`;
  apiProfiles = `${this.apiBase}/plugin/printerprofiles`;
  apiTimelapse = `${this.apiBase}/timelapse`;
  apiPlugin = `${this.apiBase}/plugin`;
  apiPluginManager = `${this.apiPlugin}/pluginmanager`; // GET is deprecated, POST is in use

  pluginsBase = `${this.octoPrintBase}plugin`;
  pluginSoftwareUpdate = `${this.pluginsBase}/softwareupdate`;
  pluginSoftwareUpdateCheck = `${this.pluginSoftwareUpdate}/check`; // GET
  pluginSoftwareUpdateUpdate = `${this.pluginSoftwareUpdate}/update`; // POST
  pluginFirmwareUpdater = `${this.pluginsBase}/firmwareupdater`;
  pluginFirmwareUpdaterStatus = `${this.pluginsBase}/firmwareupdater/status`; // GET
  pluginFirmwareUpdaterFlash = `${this.pluginsBase}/firmwareupdater/flash`; // POST
  pluginBackupIndex = `${this.pluginsBase}/backup`;
  pluginBackupEndpoint = `${this.pluginsBase}/backup/backup`;
  pluginBackupFile = (filename: string) => `${this.pluginsBase}/backup/backup/${filename}`;
  pluginBackupFileDownload = (filename: string) => `${this.pluginsBase}/backup/download/${filename}`;
  pluginBackupFileRestore = `${this.pluginsBase}/backup/restore`; // Upload a backup on the fly
  pluginManager = `${this.pluginsBase}/pluginmanager`;
  pluginManagerPlugins = `${this.pluginManager}/plugins`; // Fast
  pluginManagerExport = `${this.pluginManager}/export`;
  pluginManagerOrphans = `${this.pluginManager}/orphans`;

  get disconnectCommand() {
    return { command: "disconnect" };
  }

  get cancelJobCommand() {
    return { command: "cancel" };
  }

  get pauseJobCommand() {
    return { command: "pause", action: "pause" };
  }

  get resumeJobCommand() {
    return { command: "pause", action: "resume" };
  }

  get connectCommand() {
    return { command: "connect" };
  }

  getBedTargetCommand(targetTemperature: number) {
    return { command: "target", target: targetTemperature };
  }

  pluginManagerPlugin = (pluginName: string) => `${this.pluginManager}/${pluginName}`;

  pluginManagerRepository = (refresh = false) => `${this.pluginManager}/repository?refresh=${refresh}`;

  apiPrinterCurrent = (history?: boolean, limit?: number, exclude?: ("temperature" | "sd" | "state")[]) => {
    exclude = exclude?.filter((e) => !!e.length);
    const excludeParam = exclude?.length ? `&exclude=${exclude?.join(",")}` : "";
    const limitParam = !!limit ? `&limit=${limit}` : "";
    return `${this.apiPrinter}?history=${!!history}${limitParam}${excludeParam}`;
  };

  apiFile = (path: string) => `${this.apiFilesLocal}/${path}`;

  downloadFileLocal = (path: string) => `${this.octoPrintBase}downloads/files/local/${path}`;

  apiGetFiles = (recursive = false) => `${this.apiFiles}/local?recursive=${recursive}`;

  apiSoftwareUpdateCheck = (force: boolean) => `${this.octoPrintBase}plugin/softwareupdate/check${force ? "?force=true" : ""}`;

  selectCommand(print = false) {
    return { command: "select", print };
  }

  moveFileCommand(destination: string) {
    return { command: "move", destination };
  }

  printerNameSetting(name: string) {
    return {
      appearance: {
        name: name,
      },
    };
  }

  gcodeAnalysisSetting(enabled: boolean) {
    return {
      gcodeAnalysis: {
        runAt: enabled ? "idle" : "never",
      },
    };
  }

  pluginFirmwareUpdaterSettings(subsettings: any) {
    return {
      plugins: {
        firmwareupdater: subsettings,
      },
    };
  }

  pluginManagerCommand(command: string, url: string) {
    return {
      command,
      url,
    };
  }
}
