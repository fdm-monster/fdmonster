import { ServerApi } from "@/backend/server.api";
import { BaseService } from "@/backend/base.service";
import { Printer } from "@/models/printers/printer.model";
import {
  CreatePrinter,
  getDefaultCreatePrinter,
  HttpProtocol,
  PreCreatePrinter,
  WebSocketProtocol
} from "@/models/printers/crud/create-printer.model";
import { newRandomNamePair } from "@/constants/noun-adjectives.data";

export class PrintersService extends BaseService {
  static convertPrinterToCreateForm(printer: CreatePrinter) {
    // Inverse transformation
    const newFormData = getDefaultCreatePrinter();

    const printerURL = new URL(printer.printerURL);
    const webSocketURL = new URL(printer.webSocketURL);
    newFormData.id = printer.id;
    newFormData.printerHostPort = parseInt(printerURL.port) || 80;
    newFormData.printerHostName = printerURL.hostname;
    newFormData.printerHostPrefix = printerURL.protocol.replace(":", "") as HttpProtocol;
    newFormData.websocketPrefix = webSocketURL.protocol.replace(":", "") as WebSocketProtocol;
    newFormData.printerName = printer.printerName || newRandomNamePair();
    newFormData.apiKey = printer.apiKey;
    newFormData.groups = printer.groups;
    newFormData.stepSize = printer.stepSize;

    return newFormData;
  }

  static openPrinterURL(printerURL: string) {
    if (!printerURL) return;

    window.open(printerURL);
  }

  static convertCreateFormToPrinter(formData: PreCreatePrinter) {
    const modifiedData: any = { ...formData };

    const { printerHostPrefix, websocketPrefix, printerHostName, printerHostPort } = formData;
    const printerURL = new URL(`${printerHostPrefix}://${printerHostName}:${printerHostPort}`);
    const webSocketURL = new URL(`${websocketPrefix}://${printerHostName}:${printerHostPort}`);

    delete modifiedData.printerHostName;
    delete modifiedData.printerHostPrefix;
    delete modifiedData.websocketPrefix;
    modifiedData.printerURL = printerURL;
    modifiedData.webSocketURL = webSocketURL;

    return modifiedData as CreatePrinter;
  }

  static async getPrinters() {
    const path = ServerApi.printerRoute;

    return (await this.getApi<Printer[]>(path)) as Printer[];
  }

  static async sendPrinterConnectCommand(printerId: string) {
    const path = ServerApi.printerSerialConnectRoute(printerId);

    return await this.postApi(path);
  }

  static async sendPrinterDisconnectCommand(printerId: string) {
    const path = ServerApi.printerSerialDisconnectRoute(printerId);

    return await this.postApi(path);
  }

  static async createPrinter(printer: CreatePrinter) {
    const path = ServerApi.printerRoute;

    return (await this.postApi(path, printer)) as Printer;
  }

  static async batchImportPrinters(printers: CreatePrinter[]) {
    const path = ServerApi.printerBatchRoute;

    return (await this.postApi(path, printers)) as Printer[];
  }

  static async deletePrinter(printerId: string) {
    const path = ServerApi.getPrinterRoute(printerId);

    return await this.deleteApi(path);
  }

  static async updatePrinter(printerId: string, printer: CreatePrinter) {
    const path = ServerApi.getPrinterRoute(printerId);

    return (await this.patchApi(path, printer)) as Printer;
  }

  static async testConnection(printer: CreatePrinter) {
    const path = ServerApi.printerTestConnectionRoute;

    return (await this.postApi(path, printer)) as Printer;
  }

  static async toggleEnabled(printerId: string, enabled: boolean) {
    const path = ServerApi.printerEnabledRoute(printerId);

    return await this.patchApi(path, { enabled });
  }

  static async stopPrintJob(printerId: string) {
    const path = ServerApi.printerStopJobRoute(printerId);

    return await this.postApi(path);
  }
}
