export class module {
    static require(path: string): any;
    static exports: any;
}

declare global {
    var module: module;
}