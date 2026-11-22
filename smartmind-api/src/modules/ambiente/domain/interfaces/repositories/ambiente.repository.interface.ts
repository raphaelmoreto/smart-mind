import { IDelete } from '../../../../core/domain/interfaces/delete.interface.js';
import { IGetById } from '../../../../core/domain/interfaces/getById.interface.js';
import { IInsert } from '../../../../core/domain/interfaces/insert.interface.js';
import { IUpdate } from '../../../../core/domain/interfaces/update.interface.js';
import { AmbienteOutputDto } from '../../dto/ambiente.dto.js';
import { AmbienteEntity } from '../../entities/ambiente.entity.js';

export interface IAmbienteRepository
    extends IDelete<AmbienteEntity>,
        IGetById<AmbienteOutputDto>,
        IInsert<AmbienteEntity>,
        IUpdate<AmbienteEntity> {
    getAllByCasa(casaId: number): Promise<AmbienteOutputDto[]>;
    getAmbienteEntity(id: number): Promise<AmbienteEntity | null>;
    contarDispositivos(id: number): Promise<number>;
    verificarSeCasaExiste(casaId: number): Promise<boolean>;
    verificarNomeDuplicado(casaId: number, nome: string, ignorarId?: number): Promise<boolean>;
}