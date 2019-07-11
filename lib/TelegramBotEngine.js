class TelegramBotEngine {
  constructor (telegramClient, config) {
    this.telegramClient = telegramClient
    this.config = config

    this.claimedOffset = 0
    this.commandHandlers = []

    this.interval = null
    this.timerHandlers = []
  }

  addCommandHandler (handler) {
    this.commandHandlers.push(handler)
  }

  addTimerHandler (handler) {
    this.timerHandlers.push(handler)
  }

  async start () {
    this._startHandleTimerEvents()
    this._startHandleCommands()
  }

  async _startHandleTimerEvents () {
    this.interval = setInterval(() => this._handleTimerEvent(), this.config.timerEventInterval)
  }

  _handleTimerEvent () {
    this.timerHandlers.forEach(handler => handler.handle())
  }

  async _startHandleCommands () {
    while (true) {
      const update = await this.telegramClient.getUpdates({
        offset: this.claimedOffset,
        timeout: this.config.getUpdatesTimeout
      })

      if (!update || !update.result || update.result.length === 0) {
        continue
      }

      this._updateOffset(update.result)
      this._handleCommand(update.result)
    }
  }

  _updateOffset (requests) {
    const maxUpdateIdInRequests = Math.max(...requests.map(r => r.update_id))
    this.claimedOffset = (maxUpdateIdInRequests || this.claimedOffset) + 1
    console.log(`Claimed offset: ${this.claimedOffset}`)
  }

  _handleCommand (requests) {
    requests.map(request => {
      if (!request.message || !request.message.text) {
        return
      }

      const parseResult = this._parseCommandAndArgv(request.message.text)
      const suitableHandlers = this.commandHandlers.filter(handler => handler.command === parseResult.command)

      console.log(`Request: ${JSON.stringify(request)}`)
      console.log(`Parse result: ${JSON.stringify(parseResult)}`)
      console.log(`Found ${suitableHandlers.length} suitable handler(s)`)

      suitableHandlers.forEach(handler => handler.handle(request, parseResult.command, parseResult.args))
    })
  }

  _parseCommandAndArgv (text) {
    const parts = text.split(' ')
    const command = parts.shift()
    const args = []

    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith('"')) {
        let matchingQuoteFound = false

        for (let j = i; j < parts.length; j++) {
          if (parts[j].endsWith('"')) {
            matchingQuoteFound = true

            const argWithQuote = parts.slice(i, j + 1).join(' ')
            const argWithoutQuote = argWithQuote.slice(1, argWithQuote.length - 1)
            args.push(argWithoutQuote)

            i = j

            break
          }
        }

        if (!matchingQuoteFound) {
          args.push(parts[i])
        }
      } else {
        args.push(parts[i])
      }
    }

    return { command, args: args.filter((arg) => arg) }
  }
}

module.exports = TelegramBotEngine
