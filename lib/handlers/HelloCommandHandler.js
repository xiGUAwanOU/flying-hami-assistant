class HelloCommandHandler {
  constructor (telegramClient) {
    this.telegramClient = telegramClient
    this.command = '/hello'
  }

  handle (request) {
    const chatId = request.message.chat.id
    const from = request.message.from.username
    const messageId = request.message.message_id
    this.telegramClient.sendMessage({ chatId, text: `@${from} Hello!`, replyToMessageId: messageId })
  }
}

module.exports = HelloCommandHandler
