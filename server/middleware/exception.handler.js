import {
    AuthenticationError,
    AuthorizationError,
    ExternalServiceError,
    InternalServerException,
    NotFoundException,
    ValidationException
} from "../exceptions/runtime.exceptions.js";
import {AppConstants} from "../server.constants.js";

export function exceptionHandler(err, req, res, next) {
    // https://dev.to/rajajaganathan/express-scalable-way-to-handle-errors-1kd6
    const isTest = process.env.NODE_ENV === AppConstants.defaultTestEnv;
    if (!isTest) {
        console.error("[API Exception Handler]", err.stack);
    }
    if (err.isAxiosError) {
        const code = err.response?.status;
        return res.status(code).send({
            error: "External API call failed",
            type: "axios-error",
            data: err.response?.data
        });
    }
    if (err instanceof AuthenticationError) {
        const code = err.statusCode || 401;
        return res.status(code).send({error: err.message});
    }
    if (err instanceof AuthorizationError) {
        const code = err.statusCode || 403;
        return res.status(code).send({error: err.message});
    }
    if (err instanceof NotFoundException) {
        const code = err.statusCode || 404;
        return res.status(code).send({error: err.message});
    }
    if (err instanceof ValidationException) {
        const code = err.statusCode || 400;
        return res.status(code).send({
            error: "API could not accept this input",
            type: err.name,
            errors: err.errors
        });
    }
    if (err instanceof InternalServerException) {
        const code = err.statusCode || 500;
        return res.status(code).send({
            error: err.message,
            type: err.name,
            stack: err.stack
        });
    }
    if (err instanceof ExternalServiceError) {
        const code = err.error.statusCode || 500;
        return res.status(code).send(err.error);
    }
    if (!!err) {
        const code = err.statusCode || 500;
        return res.status(code).send({
            error: "Server experienced an internal error",
            type: err.name,
            stack: err.stack
        });
    }
    // Will result in not found on API level
    next();
}
