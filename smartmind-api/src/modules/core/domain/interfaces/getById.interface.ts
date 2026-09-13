export interface IGetById<T extends object> {
    getById(id: number): Promise<T | null>;
}