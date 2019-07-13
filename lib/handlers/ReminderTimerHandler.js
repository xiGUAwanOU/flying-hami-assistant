const moment = require('moment-timezone')

class ReminderTimerHandler {
  constructor (telegramClient, reminderConfig, reminderCollection) {
    this.telegramClient = telegramClient
    this.config = reminderConfig
    this.reminderCollection = reminderCollection
  }

  async handle () {
    const currentTime = moment().tz(this.config.timeZone)

    const remindersToRun = await this.reminderCollection.find({ nextExecutionTime: { $lt: currentTime.toDate() } }).toArray()

    const remindersByChatId = {}
    for (const reminder of remindersToRun) {
      if (!remindersByChatId[reminder.chatId]) {
        remindersByChatId[reminder.chatId] = []
      }
      remindersByChatId[reminder.chatId].push(reminder)

      const localExecutionDate = moment(reminder.nextExecutionTime).tz(this.config.timeZone).startOf('day')
      let nextExecutionDate = localExecutionDate.clone()
      let nextExecutionTime
      while (!nextExecutionTime && reminder.frequency) {
        nextExecutionTime = this.config.remindHours
          .map(remindHour => nextExecutionDate.clone().hour(remindHour))
          .find(remindTime => remindTime.isAfter(currentTime))
        nextExecutionDate = nextExecutionDate.clone().add(reminder.frequency.amount, reminder.frequency.unit)
      }

      await this.reminderCollection.updateOne(
        { _id: reminder._id },
        { $set: { nextExecutionTime: nextExecutionTime && nextExecutionTime.toDate() || undefined } }
      )
    }

    for (const chatId in remindersByChatId) {
      let resultText = 'Tasks for today:\n'
      for (const reminder of remindersByChatId[chatId]) {
        resultText += `  - ${reminder.task} (${reminder.user})\n`
      }
      this.telegramClient.sendMessage({
        chatId,
        text: resultText
      })
    }
  }
}

module.exports = ReminderTimerHandler
