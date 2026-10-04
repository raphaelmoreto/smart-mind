import { BaseEntity } from "../../../core/domain/entities/base.entity.js";
import { Entity, Column } from "typeorm";

@Entity("Casa")
export class CasaEntity extends BaseEntity {
    @Column()
    private nome: string;

    @Column()
    private rua: string;

    @Column()
    private bairro: string;

    @Column()
    private cidade: string;

    @Column()
    private numero: string;

    @Column()
    private cep: string;

    @Column()
    private fk_usuario: number;

    constructor() { super(); }

    public static instanciarCasa(nome: string, rua: string, bairro: string, cidade: string, numero: string, cep: string, fk_usuario: number): CasaEntity {
        const casaEntity = new CasaEntity();

        casaEntity.setBairro(bairro);
        casaEntity.setCep(cep);
        casaEntity.setCidade(cidade);
        casaEntity.setFK_Usuario(fk_usuario);
        casaEntity.setNome(nome);
        casaEntity.setNumero(numero);
        casaEntity.setRua(rua);

        return casaEntity;
    }

    public setBairro(bairro: string): void {
        if (!bairro.trim()) {
            this.addNotification("bairro", "bairro não pode ser nulo/vázio");
            return;
        }

        if (bairro === this.bairro)
            return;

        this.bairro = bairro.toUpperCase().trim();
    }

    public setCep(cep: string): void {
        if (!cep.trim()) {
            this.addNotification("cep", "cep não pode ser nulo/vázio");
            return;
        }

        if (cep === this.cep)
            return;

        this.cep = cep;
    }

    public setCidade(cidade: string): void {
        if (!cidade.trim()) {
            this.addNotification("cidade", "cidade não pode ser nulo/vázio");
            return;
        }

        if (cidade === this.cidade)
            return;

        this.cidade = cidade.toUpperCase().trim();
    }

    public setFK_Usuario(fk_usuario: number): void {
        if (fk_usuario <= 0) {
            this.addNotification("fk_usuario", "usuário não pode ser nulo/vázio");
            return;
        }

        if (fk_usuario === this.fk_usuario)
            return;

        this.fk_usuario = fk_usuario;
    }

    public setNome(nome: string): void {
        if (!nome.trim()) {
            this.addNotification("nome", "nome não pode ser nulo/vázio");
            return;
        }

        if (nome === this.nome)
            return;

        this.nome = nome.toUpperCase().trim();
    }

    public setNumero(numero: string): void {
        if (!numero.trim()) {
            this.addNotification("numero", "número não pode ser nulo/vázio");
            return;
        }

        if (numero === this.numero)
            return;

        this.numero = numero;
    }

    public setRua(rua: string): void {
        if (!rua.trim()) {
            this.addNotification("rua", "rua não pode ser nulo/vázio");
            return;
        }

        if (rua === this.rua)
            return;

        this.rua = rua.toUpperCase().trim();
    }

    public getBairro(): string { return this.bairro; }

    public getCep(): string { return this.cep; }

    public getCidade(): string { return this.cidade; }

    public getFK_Usuario(): number { return this.fk_usuario; }

    public getNome(): string { return this.nome; }

    public getNumero(): string { return this.numero; }

    public getRua(): string { return this.rua }
}
