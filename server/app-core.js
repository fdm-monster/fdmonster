const express = require("express");
const flash = require("connect-flash");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const Logger = require("./handlers/logger.js");
const DITokens = require("./container.tokens");
const exceptionHandler = require("./exceptions/exception.handler");
const { configureContainer } = require("./container");
const { scopePerRequest, loadControllers } = require("awilix-express");
const { ServerTasks } = require("./tasks");
const { getViewsPath } = require("./app-env");
const cors = require("cors");
const { NotFoundException } = require("./exceptions/runtime.exceptions");

function setupExpressServer() {
  let app = express();
  let container = configureContainer();

  const userTokenService = container.resolve("userTokenService");
  require("./middleware/passport.js")(passport, userTokenService);

  app.use(
    cors({
      origin: "*",
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE"
    })
  );
  app.use(express.json());

  const viewsPath = getViewsPath();

  if (process.env.NODE_ENV === "production") {
    // TODO fix this
    const { getVueDistPath } = require("@3d-print-farm/client");
    const bundlePath = getVueDistPath();
    app.use("/assets/dist", express.static(bundlePath));
  }

  app.use(express.static(viewsPath));

  app.use("/images", express.static("./images"));
  app.use(cookieParser());
  app.use(express.urlencoded({ extended: false }));
  app.use(
    session({
      secret: "supersecret",
      resave: true,
      saveUninitialized: true
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(passport.authenticate("remember-me")); // Remember Me!
  app.use(flash());
  app.use((req, res, next) => {
    res.locals.success_msg = req.flash("success_msg");
    res.locals.error_msg = req.flash("error_msg");
    res.locals.error = req.flash("error");
    next();
  });

  app.use(scopePerRequest(container));

  return {
    app,
    container
  };
}

async function ensureSystemSettingsInitiated(container) {
  logger.info("Loading Server Settings.");
  const serverSettingsService = container.resolve(DITokens.serverSettingsService);
  await serverSettingsService.probeDatabase();

  const settingsStore = container.resolve(DITokens.settingsStore);
  return await settingsStore.loadSettings();
}

function serveControllerRoutes(app) {
  const routePath = "./controllers";

  app.use(loadControllers(`${routePath}/settings/*.controller.js`, { cwd: __dirname }));
  app.use(loadControllers(`${routePath}/*.controller.js`, { cwd: __dirname }));
  app.use(exceptionHandler);

  app.get("*", function (req, res) {
    const path = req.originalUrl;

    let resource = "MVC";
    if (path.startsWith("/api") || path.startsWith("/plugins")) {
      resource = "API";
    } else if (path.endsWith(".min.js")) {
      resource = "client-bundle";
    }

    logger.error(`${resource} resource at '${path}' was not found`);

    throw new NotFoundException(`${resource} resource was not found`, path);
  });
  app.use(exceptionHandler);
}

async function serveApiNormally(app, container, quick_boot = false) {
  if (!quick_boot) {
    logger.info("Initialising FarmInformation...");

    const printersStore = container.resolve(DITokens.printersStore);
    await printersStore.loadPrintersStore();
    const filesStore = container.resolve(DITokens.filesStore);
    await filesStore.loadFilesStore();
    const currOpsCache = container.resolve(DITokens.currentOperationsCache);
    currOpsCache.generateCurrentOperations();
    const historyCache = container.resolve(DITokens.historyCache);
    await historyCache.initCache();
    const filamentCache = container.resolve(DITokens.filamentCache);
    await filamentCache.initCache();

    // Just validation, job cache is not seeded by database
    container.resolve(DITokens.jobsCache);
    const heatMapCache = container.resolve(DITokens.heatMapCache);
    await heatMapCache.initHeatMap();

    // const api = container.resolve(DITokens.octoPrintApiService);
    // await api
    //   .downloadFile(
    //     {
    //       printerURL: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/",
    //       apiKey: "asd"
    //     },
    //     "BigBuckBunny.mp4",
    //     (resolve, reject) => {
    //       console.log("stream finished");
    //       resolve();
    //     }
    //   )
    //   .then((r) => console.log(r));

    const taskManagerService = container.resolve(DITokens.taskManagerService);
    if (process.env.SAFEMODE_ENABLED !== "true") {
      ServerTasks.BOOT_TASKS.forEach((task) => taskManagerService.registerJobOrTask(task));
    } else {
      logger.warning("Starting in safe mode due to SAFEMODE_ENABLED");
    }

    const influxSetupService = container.resolve(DITokens.influxDbSetupService);
    await influxSetupService.optionalInfluxDatabaseSetup();
  }

  serveControllerRoutes(app);

  return app;
}

const logger = new Logger("Server");

module.exports = {
  setupExpressServer,
  ensureSystemSettingsInitiated,
  serveControllerRoutes,
  serveApiNormally
};
