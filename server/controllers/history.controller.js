const { createController } = require("awilix-express");
const { authenticate, authorizeRoles } = require("../middleware/authenticate");
const { AppConstants } = require("../server.constants");
const { validateInput } = require("../handlers/validators");
const { idRules } = require("./validation/generic.validation");
const { getCostSettingsDefault } = require("../constants/service.constants");
const { NotImplementedException } = require("../exceptions/runtime.exceptions");
const { ROLES } = require("../constants/authorization.constants");

class HistoryController {
  #serverVersion;
  #settingsStore;
  #historyStore;
  #serverPageTitle;

  constructor({ settingsStore, serverVersion, serverPageTitle, historyStore }) {
    this.#settingsStore = settingsStore;
    this.#historyStore = historyStore;
    this.#serverVersion = serverVersion;
    this.#serverPageTitle = serverPageTitle;
  }

  async getCache(req, res) {
    const { history } = this.#historyStore.getHistoryCache();
    res.send({ history });
  }

  async stats(req, res) {
    const stats = this.#historyStore.generateStatistics();
    res.send({ history: stats });
  }

  async delete(req, res) {
    const { id: historyId } = await validateInput(req.params, idRules);

    await History.findOneAndDelete({ _id: historyId });

    await this.#historyStore.initCache();

    res.send();
  }

  async update(req, res) {
    const { id: historyId } = await validateInput(req.params, idRules);

    // Check required fields
    const latest = req.body;
    const { note } = latest;
    const { filamentId } = latest;
    const history = await History.findOne({ _id: historyId });
    if (history.printHistory.notes != note) {
      history.printHistory.notes = note;
    }
    for (let f = 0; f < filamentId.length; f++) {
      if (Array.isArray(history.printHistory.filamentSelection)) {
        if (
          typeof history.printHistory.filamentSelection[f] !== "undefined" &&
          history.printHistory.filamentSelection[f] !== null &&
          history.printHistory.filamentSelection[f]._id == filamentId
        ) {
          //Skip da save
        } else {
          if (filamentId[f] != 0) {
            const spool = await Spools.findById(filamentId[f]);
            const profile = await Profiles.findById(spool.spools.profile);
            spool.spools.profile = profile.profile;
            history.printHistory.filamentSelection[f] = spool;
          } else {
            filamentId.forEach((id, index) => {
              history.printHistory.filamentSelection[index] = null;
            });
          }
        }
      } else {
        if (
          history.printHistory.filamentSelection !== null &&
          history.printHistory.filamentSelection._id == filamentId
        ) {
          //Skip da save
        } else {
          history.printHistory.filamentSelection = [];
          if (filamentId[f] != 0) {
            const spool = await Spools.findById(filamentId[f]);
            const profile = await Profiles.findById(spool.spools.profile);
            spool.spools.profile = profile.profile;
            history.printHistory.filamentSelection[f] = spool;
          } else {
            filamentId.forEach((id, index) => {
              history.printHistory.filamentSelection[index] = null;
            });
          }
        }
      }
    }
    history.markModified("printHistory");
    history.save().then(() => {
      this.#historyStore().initCache();
    });
    res.send("success");
  }

  /**
   * Get specific printer statistics, although I have no idea why that's related to history
   * @param req
   * @param res
   * @returns {Promise<void>}
   */
  async getPrinterStats(req, res) {
    const params = await validateInput(req.params, idRules);

    // let stats = await PrinterClean.generatePrinterStatistics(params.id);
    // res.send(stats);

    // TODO implement or delete
    throw new NotImplementedException();
  }

  async updateCostSettings(req, res) {
    const params = await validateInput(req.params, idRules);
    const latestHistoryId = params.id;

    // Find history and matching printer ID
    const historyEntity = await History.findOne({ _id: latestHistoryId });
    const printers = await Printers.find({});
    const printer = _.findIndex(printers, function (o) {
      return o.settingsAppearance.name === historyEntity.printHistory.printerName;
    });
    if (printer > -1) {
      historyEntity.printHistory.costSettings = printers[printer].costSettings;
      historyEntity.markModified("printHistory");
      historyEntity.save();
      const send = {
        status: 200,
        printTime: historyEntity.printHistory.printTime,
        costSettings: printers[printer].costSettings
      };
      res.send(send);
    } else {
      historyEntity.printHistory.costSettings = getCostSettingsDefault();
      const send = {
        status: 400,
        printTime: historyEntity.printHistory.printTime,
        costSettings: historyEntity.printHistory.costSettings
      };
      historyEntity.markModified("printHistory");
      historyEntity.save().then(() => {
        this.#historyStore.initCache();
      });

      res.send(send);
    }
  }
}

// prettier-ignore
module.exports = createController(HistoryController)
    .prefix(AppConstants.apiRoute + "/history")
    .before([authenticate(), authorizeRoles([ROLES.ADMIN, ROLES.OPERATOR])])
    .get("/", "getCache")
    .delete("/:id", "delete")
    .put("/:id", "update")
    .get("/stats", "stats")
    .patch("/:id/cost-settings", "updateCostMatch")
    .get("/:id/printer-stats", "getPrinterStats");
