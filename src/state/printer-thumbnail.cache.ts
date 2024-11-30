import { KeyDiffCache } from "@/utils/cache/key-diff.cache";
import { PrinterCache } from "@/state/printer.cache";
import { join } from "path";
import { ensureDirExists, superRootPath } from "@/utils/fs.utils";
import { AppConstants } from "@/server.constants";
import { existsSync, rmSync } from "node:fs";
import { createReadStream, readFileSync } from "fs";
import { LoginDto } from "@/services/interfaces/login.dto";
import { OctoprintClient } from "@/services/octoprint/octoprint.client";
import { gcodeScanningChunkSize } from "@/utils/gcode.utils";
import { createInterface } from "node:readline/promises";
import { IdType } from "@/shared.constants";
import { writeFile } from "node:fs/promises";
import { captureException } from "@sentry/node";
import { LoggerService } from "@/handlers/logger";
import { ILoggerFactory } from "@/handlers/logger-factory";

export interface CachedPrinterThumbnail {
  id: string;
  thumbnailBase64: string;
}

export const gcodeMaxLinesToRead = 10000;

export class PrinterThumbnailCache extends KeyDiffCache<CachedPrinterThumbnail> {
  printerCache: PrinterCache;
  octoprintClient: OctoprintClient;
  logger: LoggerService;
  constructor({
    printerCache,
    octoprintClient,
    loggerFactory,
  }: {
    printerCache: PrinterCache;
    octoprintClient: OctoprintClient;
    loggerFactory: ILoggerFactory;
  }) {
    super();
    this.printerCache = printerCache;
    this.octoprintClient = octoprintClient;
    this.logger = loggerFactory(PrinterThumbnailCache.name);
  }

  async loadCache() {
    const printers = await this.printerCache.listCachedPrinters();
    const baseFolder = join(superRootPath(), AppConstants.defaultPrinterThumbnailsStorage);

    Object.keys(this.keyValueStore).forEach((key) => {
      delete this.keyValueStore[key];
    });

    for (const printer of printers) {
      const printerIdStr = printer.id.toString();
      const thumbnailFile = join(baseFolder, printer.id.toString() + ".dat");
      if (existsSync(thumbnailFile)) {
        const data = readFileSync(thumbnailFile, "utf8");
        await this.setPrinterThumbnail(printerIdStr, data);
      }
    }
  }

  async setPrinterThumbnail(id: string, imageData: string) {
    await this.setKeyValue(id, { id: id, thumbnailBase64: imageData });
  }

  async unsetPrinterThumbnail(id: string) {
    await this.deleteKeyValue(id);
  }

  async loadPrinterThumbnailRemote(login: LoginDto, printerId: IdType, file: string) {
    const id = printerId.toString();
    try {
      const thumbnailData = await this.extractRemoteThumbnailBase64(login, file);
      await this.writeThumbnailFile(id, thumbnailData);
      await this.setPrinterThumbnail(id, thumbnailData);

      return thumbnailData;
    } catch (e) {
      this.logger.error("Could not parse thumbnail, clearing printer thumbnail", e);
      captureException(e);
      await this.removeThumbnailFile(id);
      await this.unsetPrinterThumbnail(id);
    }
  }

  async loadPrinterThumbnailLocal(printerId: IdType, file: string) {
    const id = printerId.toString();
    try {
      const thumbnailData = await this.extractThumbnailBase64(file);
      await this.writeThumbnailFile(id, thumbnailData);
      await this.setPrinterThumbnail(id, thumbnailData);

      return thumbnailData;
    } catch (e) {
      this.logger.error("Could not parse thumbnail, clearing printer thumbnail", e);
      captureException(e);
      await this.removeThumbnailFile(id);
      await this.unsetPrinterThumbnail(id);
    }
  }

  private async writeThumbnailFile(printerId: string, thumbnailData: string) {
    if (!thumbnailData?.length) {
      await this.removeThumbnailFile(printerId);
      await this.unsetPrinterThumbnail(printerId);
      return;
    }
    const baseFolder = join(superRootPath(), AppConstants.defaultPrinterThumbnailsStorage);
    const thumbnailPath = join(baseFolder, printerId + ".dat");
    ensureDirExists(baseFolder);
    await writeFile(thumbnailPath, thumbnailData);
  }

  private async removeThumbnailFile(printerId: string) {
    const baseFolder = join(superRootPath(), AppConstants.defaultPrinterThumbnailsStorage);
    const thumbnailPath = join(baseFolder, printerId + ".dat");

    if (existsSync(thumbnailPath)) {
      rmSync(thumbnailPath);
    }
  }

  private async extractRemoteThumbnailBase64(login: LoginDto, file: string): Promise<string> {
    const lines = await this.readRemoteGcodeLines(login, file, gcodeMaxLinesToRead);

    let collecting = false;
    let currentThumbnailBase64 = "";

    // Only PNG is supported, not JPG or QOI (for now)
    let index = 0;
    for (const line of lines) {
      if (line.startsWith("; thumbnail begin")) {
        collecting = true;
        currentThumbnailBase64 = "";
      } else if (collecting && line.startsWith("; thumbnail") && line.includes("end")) {
        collecting = false;

        break;
      } else if (collecting) {
        const trim = line.trim().replace(/^;/, "").trim();
        currentThumbnailBase64 += trim;
      }

      if (index > gcodeMaxLinesToRead) {
        throw new Error("Thumbnail not found (within 10000 lines).");
      }
      index++;
    }

    return currentThumbnailBase64;
  }

  private async readRemoteGcodeLines(
    login: LoginDto,
    file: string,
    numberOfLines: number,
    fromEnd: boolean = false,
    endCondition: string = "; thumbnail end"
  ) {
    const fileData = await this.octoprintClient.getFile(login, file);
    const fileSize = fileData.size;

    let lines: string[] = [];
    let position = fromEnd ? fileSize : 0;
    let iterationsLeft = 5;

    while (lines.length <= numberOfLines && (fromEnd ? position > 0 : position < fileSize)) {
      iterationsLeft--;
      if (iterationsLeft <= 0) {
        // throw new Error("Too many iterations reached, 'readRemoteGcodeLines' aborted");
        return;
      }

      const bytesToRead = Math.min(gcodeScanningChunkSize, fromEnd ? position : fileSize - position);
      const start = fromEnd ? position - bytesToRead : position;
      const end = fromEnd ? position : position + bytesToRead;
      position = fromEnd ? start : end;

      const remoteChunk = await this.octoprintClient.getFileChunk(login, file, start, end);
      const chunkLines = remoteChunk.data.split("\n");
      if (fromEnd) {
        lines = chunkLines.concat(lines);
      } else {
        lines = lines.concat(chunkLines);
      }

      if (endCondition) {
        const endIndex = lines.findIndex((line) => line.includes(endCondition));
        if (endIndex !== -1) {
          lines = lines.slice(0, endIndex + 1); // Cut off lines after the end condition
          break;
        }
      } else if (lines.length >= numberOfLines) {
        break;
      }
    }

    return fromEnd ? lines.slice(-numberOfLines) : lines.slice(0, numberOfLines);
  }

  private async extractThumbnailBase64(gcodePath: string) {
    const fileStream = createReadStream(gcodePath);
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity, // Handles cross-platform line endings
    });

    let collecting = false;
    let currentThumbnailBase64 = "";

    // Only PNG is supported, not JPG or QOI (for now)
    let index = 0;
    for await (const line of rl) {
      if (line.startsWith("; thumbnail begin")) {
        collecting = true;
        currentThumbnailBase64 = "";
      } else if (collecting && line.startsWith("; thumbnail") && line.includes("end")) {
        collecting = false;

        rl.close();
        break;
      } else if (collecting) {
        const trim = line.trim().replace(/^;/, "").trim();
        currentThumbnailBase64 += trim;
      }

      if (index > gcodeMaxLinesToRead) {
        throw new Error("Thumbnail not found (within 10000 lines).");
      }
      index++;
    }

    if (!currentThumbnailBase64?.length) {
      throw new Error("Thumbnail not found (within 10000 lines).");
    }

    // Validation, data unused
    Buffer.from(currentThumbnailBase64, "base64");
    // writeFileSync(thumbnailPath, currentThumbnailBase64);

    return currentThumbnailBase64;
  }
}
