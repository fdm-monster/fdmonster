const DITokens = {
  // Values
  serverVersion: "serverVersion",
  defaultRole: "defaultRole",
  // Instances
  serverHost: "serverHost",
  loggerFactory: "loggerFactory",
  httpClient: "httpClient",
  socketIoGateway: "socketIoGateway",
  simpleGitService: "simpleGitService",
  multerService: "multerService",
  configService: "configService",
  taskManagerService: "taskManagerService",
  toadScheduler: "toadScheduler",
  eventEmitter2: "eventEmitter2",
  cacheManager: "cacheManager",
  printerService: "printerService",
  printCompletionService: "printCompletionService",
  floorService: "floorService",
  yamlService: "yamlService",
  settingsService: "settingsService",
  serverReleaseService: "serverReleaseService",
  monsterPiService: "monsterPiService",
  serverUpdateService: "serverUpdateService",
  githubService: "githubService",
  octokitService: "octokitService",
  clientBundleService: "clientBundleService",
  userTokenService: "userTokenService",
  userService: "userService",
  permissionService: "permissionService",
  roleService: "roleService",
  octoPrintApiService: "octoPrintApiService",
  socketFactory: "socketFactory",
  batchCallService: "batchCallService",
  pluginRepositoryCache: "pluginRepositoryCache",
  pluginFirmwareUpdateService: "pluginFirmwareUpdateService",
  influxDbV2BaseService: "influxDbV2BaseService",
  systemInfoBundleService: "systemInfoBundleService",
  printerFilesService: "printerFilesService",
  customGCodeService: "customGCodeService",
  // Stores/states
  settingsStore: "settingsStore",
  printerCache: "printerCache",
  printerSocketStore: "printerSocketStore",
  octoPrintLogsCache: "printerTickerStore",
  filesStore: "filesStore",
  octoPrintSockIoAdapter: "octoPrintSockIoAdapter",
  // Caches
  floorStore: "floorStore",
  jobsCache: "jobsCache",
  fileCache: "fileCache",
  fileUploadTrackerCache: "fileUploadTrackerCache",
  // Tasks
  serverTasks: "serverTasks",
  bootTask: "bootTask",
  softwareUpdateTask: "softwareUpdateTask",
  clientDistDownloadTask: "clientDistDownloadTask",
  socketIoTask: "socketIoTask",
  printCompletionSocketIoTask: "printCompletionSocketIoTask",
  printerWebsocketTask: "printerWebsocketTask",
  printerWebsocketRestoreTask: "printerWebsocketRestoreTask",
  printerFileCleanTask: "printerFileCleanTask",
};

module.exports = DITokens;
