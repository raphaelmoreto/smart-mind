import { CasaEntity } from "../../entities/casa.entity.js";
import { CasaOutputDto, TarifaInputDto, TarifaOutputDto } from "../../dto/casa.dto.js";
import { IDelete } from "../../../../core/domain/interfaces/delete.interface.js";
import { IGetAll } from "../../../../core/domain/interfaces/getAll.interface.js";
import { IGetById } from "../../../../core/domain/interfaces/getById.interface.js";
import { IInsert } from "../../../../core/domain/interfaces/insert.interface.js";
import { IUpdate } from "../../../../core/domain/interfaces/update.interface.js";


export interface ICasaRepository
    extends IDelete<CasaEntity>,
            IGetAll<CasaOutputDto>,
            IGetById<CasaOutputDto>,
            IInsert<CasaEntity>,
            IUpdate<CasaEntity>
{
    getByUsuario(usuarioId: number): Promise<CasaOutputDto[]>;

    getCasaEntity(id: number): Promise<CasaEntity | null>;

    getTarifaVigente(casaId: number): Promise<TarifaOutputDto | null>;

    inserirTarifa(casaId: number, dto: TarifaInputDto): Promise<boolean>;    

    verificarSeCasaExiste(id: number): Promise<boolean>;
}