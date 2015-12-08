import { ChildProcess } from 'child_process';
export interface Options {
    cwd?: string;
    stdio?: any;
    custom?: any;
    env?: any;
    detached?: boolean;
}
export interface TerminalChildProcess extends ChildProcess {
    kill2(): Promise<number>;
}
export declare function runInTerminal(command: string, args?: string[], options?: Options): Promise<TerminalChildProcess>;
