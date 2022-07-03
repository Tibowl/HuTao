import log4js from "log4js"

const Logger = log4js.getLogger("ready")

export function handle(sweep: string): void {
    Logger.debug(sweep)
}
