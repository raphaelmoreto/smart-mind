import { IDelete } from '../../../../core/domain/interfaces/delete.interface.js';
import { IGetAll } from '../../../../core/domain/interfaces/getAll.interface.js';
import { IGetById } from '../../../../core/domain/interfaces/getById.interface.js';
import { IInsert } from '../../../../core/domain/interfaces/insert.interface.js';
import { IUpdate } from '../../../../core/domain/interfaces/update.interface.js';
import { DispositivoOutputDto, TipoDispositivoOutputDto } from '../../dto/dispositivo.dto.js';
import { DispositivoEntity } from '../../entities/dispositivo.entity.js';

export interface IDispositivoRepository
    extends IDelete<DispositivoEntity>,
        IGetAll<DispositivoOutputDto>,
        IGetById<DispositivoOutputDto>,
        IInsert<DispositivoEntity>,
        IUpdate<DispositivoEntity> {
    getAllByCasa(casaId: number): Promise<DispositivoOutputDto[]>;
    getTipos(): Promise<TipoDispositivoOutputDto[]>;
    alterarEstado(id: number, ligado: boolean): Promise<boolean>;
    getDispositivoEntity(id: number): Promise<DispositivoEntity | null>;
    verificarSeDispositivoExiste(id: number): Promise<boolean>;
    verificarSeCasaExiste(id: number): Promise<boolean>;
    verificarSeTipoDispositivoExiste(id: number): Promise<boolean>;
    verificarSeAmbienteDaCasa(ambienteId: number, casaId: number): Promise<boolean>;
}