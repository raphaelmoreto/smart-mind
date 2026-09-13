export interface IGetAll<T extends object> {
    getAll(): Promise<T[]>;
}