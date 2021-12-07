export abstract class UserDAO {
    public id: number;
    public email: string;
    public picture: string;
    public nickname: string;
    public name: string;
    public open_id: string;
    public created_at: Date;
    public updated_at: Date;
}
