import { LoginInputDto } from "../../dto/login.dto.js";
import { LoginOutputDto } from "../../dto/login.dto.js";

export interface IAuthRepository {
    validarLogin(login: LoginInputDto): Promise<LoginOutputDto | null>;
}