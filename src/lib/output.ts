export class Output {

    public readonly colors = {
        red: "\x1b[31m",
        green: "\x1b[32m",
        white: "\x1b[37m",
        blue: "\x1b[36m",
        yellow: "\x1b[33m"
    }

    public readonly control = {
        reset: "\x1b[0m",
        bright: "\x1b[1m",
    }

    public error(message: string){
        console.error(`${this.control.bright}${this.colors.red}${message}${this.control.reset}`);
    }

    public info(message: string){
        console.log(`${this.colors.white}${message}${this.control.reset}`);
    }

    public white(message: string){
        console.log(`${this.colors.white}${message}${this.control.reset}`);
    }

    public blue(message: string){
        console.log(`${this.control.bright}${this.colors.blue}${message}${this.control.reset}`);
    }

    public bold(message: string){
        console.log(`${this.control.bright}${this.colors.white}${message}${this.control.reset}`);
    }

    public green(message: string){
        console.log(`${this.control.bright}${this.colors.green}${message}${this.control.reset}`);
    }

    public red(message: string){
        console.log(`${this.control.bright}${this.colors.red}${message}${this.control.reset}`);
    }

    public yellow(message: string){
        console.log(`${this.control.bright}${this.colors.yellow}${message}${this.control.reset}`);
    }
}