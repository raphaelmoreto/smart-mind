import { HttpStatus } from "@nestjs/common";
import type { Response as ExpressResponse } from 'express';
import { TipoRetorno } from './../../application/enums/eTipoRetorno.js';

export class BaseController {

    protected mapResponse(
        tipoRetorno: TipoRetorno,
        res: ExpressResponse,
        data?: unknown
    ): ExpressResponse {
        switch (tipoRetorno) {
            case TipoRetorno.BadRequest:
                return res.status(HttpStatus.BAD_REQUEST).json(data);

            case TipoRetorno.Conflict:
                return res.status(HttpStatus.CONFLICT).json(data);

            case TipoRetorno.Created:
                return res.status(HttpStatus.CREATED).json(data);
            
            case TipoRetorno.NoContent:
                return res.status(HttpStatus.NO_CONTENT).send();

            case TipoRetorno.NotFound:
                return res.status(HttpStatus.NOT_FOUND).json(data);

            case TipoRetorno.Ok:
                return res.status(HttpStatus.OK).json(data);

            case TipoRetorno.Validation:
                return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json(data);

            default:
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(data);
        }
    }
}