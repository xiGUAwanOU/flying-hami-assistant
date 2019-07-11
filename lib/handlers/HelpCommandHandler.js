const helpText = `Flying Hami Assistant v0.0.1

Commands:
  /help
    Display this manual.

  /hello
    Say hello to this bot.

  /reminder add at_user task start_date [frequency]
    Remind someone of some one-off or recurrent tasks.

  /reminder list
    List all the reminders.

  /reminder remove reminder_id
    Remove a reminder.
`

class HelpCommandHandler {
  constructor (telegramClient) {
    this.telegramClient = telegramClient
    this.command = '/help'
  }

  handle (request) {
    const chatId = request.message.chat.id
    this.telegramClient.sendMessage({ chatId, text: helpText })
  }
}

module.exports = HelpCommandHandler
