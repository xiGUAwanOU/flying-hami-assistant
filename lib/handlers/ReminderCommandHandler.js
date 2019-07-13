const moment = require('moment-timezone')
const shortid = require('shortid')

class ReminderCommandHandler {
  constructor (telegramClient, reminderConfig, reminderCollection) {
    this.telegramClient = telegramClient
    this.config = reminderConfig
    this.reminderCollection = reminderCollection
    this.command = '/reminder'
  }

  handle (request, _command, args) {
    const chatId = request.message.chat.id
    const replyToMessageId = request.message.message_id
    const action = args.shift()

    if (action === 'list') {
      this._handleList(args, chatId, replyToMessageId)
    } else if (action === 'add') {
      this._handleAdd(args, chatId, replyToMessageId)
    } else if (action === 'info') {
      this._handleInfo(args, chatId, replyToMessageId)
    } else if (action === 'remove') {
      this._handleRemove(args, chatId, replyToMessageId)
    } else {
      this.telegramClient.sendMessage({ chatId, replyToMessageId, text: 'Unknown action of reminder' })
    }
  }

  async _handleList (args, chatId, replyToMessageId) {
    const reminders = await this.reminderCollection.find({ chatId }).toArray()

    if (reminders.length === 0) {
      this.telegramClient.sendMessage({ chatId, replyToMessageId, text: 'Currently no reminder created' })
      return
    }

    const reminderText = reminders
      .map(reminder => `[${reminder._id}] [${reminder.user.slice(1)}] ${reminder.task}`)
      .join('\n')

    this.telegramClient.sendMessage({
      chatId,
      replyToMessageId,
      text: reminderText
    })
  }

  async _handleAdd (args, chatId, replyToMessageId) {
    const user = args[0]
    const task = args[1]
    const startDate = args[2]
    const frequency = args[3]

    if (!user || !user.startsWith('@')) {
      this.telegramClient.sendMessage({ chatId, replyToMessageId, text: 'You must at a user' })
      return
    }

    if (!task) {
      this.telegramClient.sendMessage({ chatId, replyToMessageId, text: 'You must specify a task' })
      return
    }

    if (!startDate ||
      !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(startDate) ||
      !moment(startDate).tz(this.config.timeZone).isValid()
    ) {
      this.telegramClient.sendMessage({ chatId, replyToMessageId, text: 'You must specify a valid start date' })
      return
    }

    if (frequency && !/^[0-9]+[dwm]$/.test(frequency)) {
      this.telegramClient.sendMessage({ chatId, replyToMessageId, text: 'You must specify a valid frequency' })
      return
    }

    const currentTime = moment().tz(this.config.timeZone)
    const localStartDate = moment(startDate).tz(this.config.timeZone).startOf('day')

    const lastExecutionTimeInStartDate =
      localStartDate.clone().hour(this.config.remindHours[this.config.remindHours.length - 1])
    if (!lastExecutionTimeInStartDate.isSameOrAfter(currentTime)) {
      this.telegramClient.sendMessage({ chatId, replyToMessageId, text: 'You must specify a start date in the future' })
      return
    }

    let frequencyObject
    if (frequency) {
      frequencyObject = {}
      frequencyObject.amount = parseInt(frequency.slice(0, frequency.length - 1))
      if (frequency.endsWith('d')) {
        frequencyObject.unit = 'days'
      } else if (frequency.endsWith('w')) {
        frequencyObject.unit = 'weeks'
      } else if (frequency.endsWith('m')) {
        frequencyObject.unit = 'months'
      }
    }

    const firstExecutionTime = this.config.remindHours
      .map(remindHour => localStartDate.clone().hour(remindHour))
      .find(executionTime => executionTime.isAfter(currentTime))

    const newReminder = {
      _id: shortid.generate(),
      chatId,
      user,
      task,
      startDate: localStartDate.toDate(),
      frequency: frequencyObject,
      nextExecutionTime: firstExecutionTime.toDate()
    }

    this.reminderCollection.insertOne(newReminder)

    this.telegramClient.sendMessage({
      chatId,
      replyToMessageId,
      text: `Ok, I'll remind you ${firstExecutionTime.fromNow()} of ${task}`
    })
  }

  async _handleInfo (args, chatId, replyToMessageId) {
    if (!args[0]) {
      this.telegramClient.sendMessage({ chatId, replyToMessageId, text: 'You must specify a reminder ID' })
      return
    }

    const reminderId = args[0]
    const reminder = await this.reminderCollection.findOne({ _id: reminderId })

    if (!reminder) {
      this.telegramClient.sendMessage({ chatId, replyToMessageId, text: 'Cannot find reminder with this ID' })
      return
    }

    let resultText = ''
    resultText += `ID: ${reminder._id}\n`
    resultText += `User: ${reminder.user.slice(1)}\n`
    resultText += `Task: ${reminder.task}\n`
    resultText += `Start Date: ${moment(reminder.startDate).tz(this.config.timeZone).format('YYYY-MM-DD')}\n`
    if (reminder.frequency) {
      resultText += `Frequency: ${reminder.frequency.amount} ${reminder.frequency.unit}\n`
    }
    if (reminder.nextExecutionTime) {
      resultText += `Next Time: ${moment(reminder.nextExecutionTime).tz(this.config.timeZone).format('YYYY-MM-DD HH:mm')}\n`
    }

    this.telegramClient.sendMessage({ chatId, replyToMessageId, text: resultText })
  }

  async _handleRemove (args, chatId, replyToMessageId) {
    if (args.length === 0) {
      this.telegramClient.sendMessage({ chatId, replyToMessageId, text: 'You must specify a reminder ID' })
      return
    }

    await Promise.all(args.map(reminderId => this.reminderCollection.deleteOne({ _id: reminderId })))

    this.telegramClient.sendMessage({
      chatId,
      replyToMessageId,
      text: 'One or more reminders are successfully removed'
    })
  }
}

module.exports = ReminderCommandHandler
