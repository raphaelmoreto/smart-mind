import { IDelete } from "../../../../core/domain/interfaces/delete.interface.js";
import { IGetAll } from "../../../../core/domain/interfaces/getAll.interface.js";
import { IGetById } from "../../../../core/domain/interfaces/getById.interface.js";
import { IInsert } from "../../../../core/domain/interfaces/insert.interface.js";
import { IUpdate } from "../../../../core/domain/interfaces/update.interface.js";
import { UsuarioEntity } from "../../entities/usuario.entity.js";

export interface IUsuarioRepository
    extends IDelete<UsuarioEntity>,
            IGetAll<UsuarioEntity>,
            IGetById<UsuarioEntity>, 
            IInsert<UsuarioEntity>,
            IUpdate<UsuarioEntity>
{

}