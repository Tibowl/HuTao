import log4js from "log4js"

import client from "../main"
import config from "../data/config.json"

const Logger = log4js.getLogger("TimerManager")

export default class TimerManager {
    activityTimer: NodeJS.Timeout | undefined = undefined

    init(): void {
        const updateActivity = (): void => {
            if (client.user == undefined) {
                this.activityTimer = setTimeout(updateActivity, 10000)
                return
            }

            client.user.setActivity(config.activity, {
                type: "LISTENING"
            })
        }

        if (this.activityTimer == undefined)
            setTimeout(updateActivity, 10000)
    }
}
