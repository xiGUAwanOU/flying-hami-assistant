const axios = require('axios')

const ALLOWED_UPDATES = ['message']

class TelegramClient {
  constructor (config) {
    this.token = config.token
  }

  async getMe () {
    return this._sendHttpQuery('getMe')
  }

  async getUpdates ({ offset, limit, timeout }) {
    const result = await this._sendHttpQuery('getUpdates', { offset, limit, timeout, ALLOWED_UPDATES })
    return result
  }

  async sendMessage ({ chatId, text, replyToMessageId, parseMode }) {
    await this._sendHttpQuery('sendMessage', {
      chat_id: chatId,
      text,
      reply_to_message_id:
        replyToMessageId,
      parse_mode: parseMode
    })
  }

  async _sendHttpQuery (command, parameters) {
    try {
      return (await axios.post(this._buildQueryUrl(command), parameters)).data
    } catch (err) {
      console.error('Some error occurs while connecting to Telegram server', err)
    }
  }

  _buildQueryUrl (command) {
    return `https://api.telegram.org/bot${this.token}/${command}`
  }
}

module.exports = TelegramClient
