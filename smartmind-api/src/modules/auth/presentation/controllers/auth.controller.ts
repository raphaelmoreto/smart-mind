import { BaseController } from "../../../core/presentation/controllers/base.controller.js";
import { Body, Controller, HttpStatus, Post, Res } from "@nestjs/common";
import { LoginInputDto } from "../../domain/dto/login.dto.js";
import type { Response as ExpressResponse } from 'express';
import { ValidarLoginUseCase } from "../../application/use-cases/validar-login.js";

@Controller("api/login")
export class AuthController extends BaseController {

    constructor (
        private readonly validarLoginUseCase: ValidarLoginUseCase
    ) { super(); }

    @Post()
    async post(@Res() res: ExpressResponse, @Body() dto: LoginInputDto): Promise<ExpressResponse> {
        const result = await this.validarLoginUseCase.validarLogin(dto);

        return this.mapResponse(HttpStatus.OK, res, result);
    }
}