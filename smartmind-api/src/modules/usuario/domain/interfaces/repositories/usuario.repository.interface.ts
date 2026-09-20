import { IDelete } from "../../../../core/domain/interfaces/delete.interface.js";
import { IGetAll } from "../../../../core/domain/interfaces/getAll.interface.js";
import { IGetById } from "../../../../core/domain/interfaces/getById.interface.js";
import { IInsert } from "../../../../core/domain/interfaces/insert.interface.js";
import { IUpdate } from "../../../../core/domain/interfaces/update.interface.js";
import { UsuarioEntity } from "../../entities/usuario.entity.js";
import { UsuarioOutputDto } from "../../dto/usuario.dto.js";

export interface IUsuarioRepository
    extends IDelete<UsuarioEntity>,
            IGetAll<UsuarioOutputDto>,
            IGetById<UsuarioOutputDto>, 
            IInsert<UsuarioEntity>,
            IUpdate<UsuarioEntity>
{
    getUsuarioEntity(id: number): Promise<UsuarioEntity | null>;

    verificarSePerfilUsuarioExiste(id: number): Promise<boolean>;

    verificarSeUsuarioExiste(id: number): Promise<boolean>;

    verificarUsuarioDuplicado(id: number, usuario: string, email: string): Promise<boolean>;
}