import { HttpStatus } from "@nestjs/common";
import type { Response as ExpressResponse } from 'express';

export class BaseController {

    protected mapResponse(
        statusCode: number,
        res: ExpressResponse,
        data?: unknown
    ): ExpressResponse {
        switch (statusCode) {
            case 400:
                return res.status(HttpStatus.BAD_REQUEST).json(data);

            case 409:
                return res.status(HttpStatus.CONFLICT).json(data);

            case 201:
                return res.status(HttpStatus.CREATED).json(data);
            
            case 204:
                return res.status(HttpStatus.NO_CONTENT).send();

            case 404:
                return res.status(HttpStatus.NOT_FOUND).json(data);

            case 200:
                return res.status(HttpStatus.OK).json(data);

            case 422:
                return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json(data);

            default:
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(data);
        }
    }
}