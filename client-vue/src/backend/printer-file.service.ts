import { BaseService } from "@/backend/base.service";
import { ServerApi } from "@/backend/server.api";
import { FileUploadCommands } from "@/models/printers/file-upload-commands.model";
import { PrinterFileCache } from "@/models/printers/printer-file-cache.model";
import { PrinterFile } from "@/models/printers/printer-file.model";

export class PrinterFileService extends BaseService {
  static async getFiles(printerId: string, recursive = false) {
    const path = `${ServerApi.printerFilesRoute}/${printerId}/?recursive=${recursive}`;

    return (await this.getApi(path)) as PrinterFileCache;
  }

  /**
   * A nice alternative for offline or disabled printers
   * @param printerId
   */
  static async getFileCache(printerId: any) {
    const path = `${ServerApi.printerFilesCacheRoute(printerId)}`;

    return (await this.getApi(path)) as PrinterFileCache;
  }

  static async selectAndPrintFile(printerId: string, fullPath: string, print = true) {
    const path = ServerApi.printerFilesSelectAndPrintRoute(printerId);

    return await this.postApi(path, { fullPath, print });
  }

  static async uploadStubFile(printerId: string, files: File[]) {
    const path = ServerApi.printerFilesUploadStubRoute;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files[" + i + "]", files[i]);
    }

    return this.postUploadApi(
      path,
      formData,
      {
        onUploadProgress: this.uploadUpdateProgress
      },
      { unwrap: false }
    );
  }

  static uploadUpdateProgress(progress: any) {
    console.log(progress);
  }

  static async uploadFiles(
    printerId: string,
    files: File[],
    commands: FileUploadCommands = { select: true, print: true }
  ) {
    const path = ServerApi.printerFilesUploadRoute(printerId);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files[" + i + "]", files[i]);
    }

    // Cant print more than 1 file at a time
    if (files.length === 1) {
      if (commands.select) {
        formData.append("select", "true");
      }
      if (commands.print) {
        formData.append("print", "true");
      }
    }
    // TODO more than 1 will now fail due to API validation

    return this.postUploadApi(
      path,
      formData,
      {
        onUploadProgress: this.uploadUpdateProgress
      },
      { unwrap: false }
    );
  }

  static async clearFiles(printerId: string) {
    const path = `${ServerApi.printerFilesClearRoute(printerId)}`;

    return this.postApi(path);
  }

  static async purgeFiles() {
    const path = `${ServerApi.printerFilesPurgeRoute}`;

    return this.postApi(path);
  }

  static async deleteFile(printerId: string, fullPath: string) {
    const path = `${ServerApi.printerFilesRoute}/${printerId}/?fullPath=${fullPath}`;

    return this.deleteApi(path);
  }

  static downloadFile(file: PrinterFile) {
    window.location.href = file.refs.download;
  }
}
