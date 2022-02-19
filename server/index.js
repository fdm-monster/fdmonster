import {major} from "semver";
import {serveNode12Fallback} from "./server.fallback.js";

/**
 * Safety check for Node 12
 */
let majorVersion = major(process.version, false);
if (!!majorVersion && majorVersion < 14) {
    // Dont require this in the normal flow (or NODE_ENV can not be fixed before start)

    serveNode12Fallback(server);

    process.exit(1);
}

import {setupEnvConfig} from "./server.env.js";
import {setupNormalServer} from "./server.core.js";

/**
 * Intermediate server when booting
 */
setupEnvConfig();
// ... TODO
/**
 * Actual server operation
 */

const {httpServer, container} = setupNormalServer();
container
    .resolve("serverHost")
    .boot(httpServer)
    .catch((e) => {
        console.error("Server has crashed unintentionally - please report this", e);
    });
