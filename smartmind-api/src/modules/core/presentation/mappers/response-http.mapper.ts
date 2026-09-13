import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Response } from "../..//application/response/response.js";
import { TipoRetorno } from "../../application/enums/eTipoRetorno.js";

export class ResponseHttpMapper {
    static map(response: Response): Response {
        if (response.sucesso) {
            return response;
        }

        switch (response.tipoRetorno) {
            case TipoRetorno.Conflict:
                throw new ConflictException(response);

            case TipoRetorno.NotFound:
                throw new NotFoundException(response);

            default:
                throw new BadRequestException(response);
        }
    }
}