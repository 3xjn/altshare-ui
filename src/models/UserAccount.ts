export type Account = {
    email: string
    username: string
    password: string
}

export type AccountLoginDto = Omit<Account, "username"> 

export type AccountCreationDto = Account & {
    passwordConfirmation: string
}

export type RegisterData = AccountCreationDto & {
    masterKeyEncrypted: string;
    iv: string;
    salt: string;
    tag: string;
}

export type RegisterResponse = {
    token: string;
    masterKeyEncrypted: string;
    masterKeyIv: string;
    salt: string;
    tag?: string;
}