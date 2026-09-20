import { BaseEntity } from "../../../core/domain/entities/base.entity.js";
import { Entity, Column } from "typeorm";

@Entity("Usuario")
export class UsuarioEntity extends BaseEntity {

    @Column()
    private nome: string;

    @Column()
    private usuario: string;

    @Column()
    private email: string;

    @Column()
    private senha: string;

    ///private data_cadastro: Date = new Date(); //RECEBE A DATA E HORA ATUAL

    @Column()
    private fk_perfil: number;

    constructor () {
        super();
    }

    public static instanciarUsuario(nome: string, usuario: string, email: string, senha: string, fk_perfil: number): UsuarioEntity {
        const usuarioEntity = new UsuarioEntity();

        usuarioEntity.setEmail(email);
        usuarioEntity.setFK_Perfil(fk_perfil);
        usuarioEntity.setNome(nome);
        usuarioEntity.setSenha(senha);
        usuarioEntity.setUsuario(usuario);

        return usuarioEntity;
    };

    public setEmail(email: string): void {
        if (!email?.trim()) {
            this.addNotification("email", "email não pode ser nulo/vázio");
            return;
        }

        if (email === this.email)
            return;

        this.email = email.trim();
    }

    public setFK_Perfil(fk_perfil: number) {
        if (fk_perfil <= 0) {
            this.addNotification("fk_categoria", "perfil de usuário não pode ser nulo/vázio");
            return;
        }

        if (fk_perfil === this.fk_perfil)
            return;

        this.fk_perfil = fk_perfil;
    }

    public setNome(nome: string): void {
        if (!nome?.trim()) {
            this.addNotification("nome", "nome não pode ser nulo/vázio");
            return;
        }

        if (nome === this.nome)
            return;

        this.nome = nome.toUpperCase().trim();
    }

    public setSenha(senha: string): void {
        if (!senha?.trim()) {
            this.addNotification("senha", "senha não pode ser nulo/vázio");
            return;
        }

        if (senha === this.senha)
            return;

        this.senha = senha.trim();
    }

    public setUsuario(usuario: string): void {
        if (!usuario?.trim()) {
            this.addNotification("usuario", "usuário não pode ser nulo/vázio");
            return;
        }

        if (usuario === this.usuario)
            return;

        this.usuario = usuario.trim();
    }

    // public getDtCadastro(): Date { return this.data_cadastro; }

    public getEmail(): string { return this.email; }

    public getFK_Perfil(): number { return this.fk_perfil; }

    public getNome(): string { return this.nome; }

    public getSenha(): string { return this.senha; }

    public getUsuario(): string { return this.usuario; }
}
