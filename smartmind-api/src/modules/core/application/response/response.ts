import { Notification } from "../../domain/notifications/notification.js";
import { TipoRetorno } from "../enums/eTipoRetorno.js";

export class Response {

    private constructor (
        public readonly tipoRetorno: TipoRetorno,
        public readonly sucesso: boolean,
        public readonly mensagem: string,
        public readonly notificacoes: Notification[]
    ) { }

    static erro(tipoRetorno: TipoRetorno, mensagem: string, notificacoes: Notification[] = []): Response {
        return new Response(
            tipoRetorno,
            false,
            mensagem.toUpperCase(),
            notificacoes
        );
    }

    static ok(mensagem: string): Response {
        return new Response(
            TipoRetorno.Ok,
            true,
            mensagem.toUpperCase(),
            []
        );
    }
}