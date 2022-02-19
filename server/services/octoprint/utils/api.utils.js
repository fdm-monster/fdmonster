import octoprintService from "../constants/octoprint-service.constants";
import runtime from "../../../exceptions/runtime.exceptions";
const { jsonContentType, contentTypeHeaderKey, apiKeyHeaderKey, OPClientErrors } = octoprintService;
const { ValidationException } = runtime;
function validatePrinter(printer) {
    if (!printer.apiKey || !printer.printerURL) {
        throw new ValidationException(OPClientErrors.printerValidationErrorMessage);
    }
    return {
        apiKey: printer.apiKey,
        printerURL: printer.printerURL
    };
}
function constructHeaders(apiKey, contentType = jsonContentType) {
    return {
        [contentTypeHeaderKey]: contentType,
        [apiKeyHeaderKey]: apiKey
    };
}
/**
 * Process an Axios response (default)
 * @param response
 * @param options
 * @returns {{data, status}|*}
 */
function processResponse(response, options = { unwrap: true }) {
    if (options.unwrap) {
        return response.data;
    }
    if (options.simple) {
        return { status: response.status, data: response.data };
    }
    return response;
}
/**
 * Process a Got based request
 * @param response
 * @param options
 * @returns {{data, status}|*}
 */
async function processGotResponse(response, options = { unwrap: true }) {
    if (options.unwrap) {
        return JSON.parse(response.body);
    }
    if (options.simple) {
        const data = JSON.parse(response.body);
        return { status: response.statusCode, data };
    }
    return response;
}
export { validatePrinter };
export { constructHeaders };
export { processResponse };
export { processGotResponse };
export default {
    validatePrinter,
    constructHeaders,
    processResponse,
    processGotResponse
};
