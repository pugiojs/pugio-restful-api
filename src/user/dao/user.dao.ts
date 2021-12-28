export abstract class UserDAO {
    public id: number;
    public open_id: string;
    public email: string;
    public picture: string;
    public full_name: string;
    public first_name: string;
    public middle_name: string;
    public last_name: string;
    public active: boolean;
    public verified: boolean;
}
