const EventSource = require("eventsource");
const dbHandler = require("../db-handler");
const getEndpoints = require("express-list-endpoints");
const { setupTestApp } = require("../test-server");
const DITokens = require("../../server/container.tokens");

let request;
let container;
let httpServer;
let sseTask;
const routeBase = "/api/printer/";
const ssePath = "sse";

beforeAll(async () => {
  await dbHandler.connect();
  ({ request, container, httpServer } = await setupTestApp(true));

  sseTask = container.resolve(DITokens.printerSseTask);

  const endpoints = getEndpoints(httpServer);
  expect(endpoints).toContainEqual({
    methods: ["GET"],
    middlewares: ["anonymous", "anonymous", "memberInvoker"],
    path: routeBase + ssePath
  });
});

describe("SSE-printers", () => {
  it("should be able to be called with an EventSource", async () => {
    const getRequest = request.get(routeBase + ssePath);
    const url = getRequest.url;
    expect(url).toBeTruthy();

    let firedEvent = false;

    await new Promise(async (resolve) => {
      const es = new EventSource(url);

      es.onmessage = (e) => {
        firedEvent = true;

        let parsedMsg = JSON.parse(e.data);
        expect(parsedMsg).toEqual({
          printers: [],
          printerGroups: [],
          trackedUploads: []
        });
        es.close();
        resolve();
      };

      await sseTask.run();
    });

    expect(firedEvent).toBeTruthy();
  }, 10000);
});
