const path = require('path')

const TelegramClient = require('./lib/TelegramClient')
const TelegramBotEngine = require('./lib/TelegramBotEngine')
const MongoConnector = require('./lib/MongoConnector')

const HelpCommandHandler = require('./lib/handlers/HelpCommandHandler')
const HelloCommandHandler = require('./lib/handlers/HelloCommandHandler')
const ReminderCommandHandler = require('./lib/handlers/ReminderCommandHandler')

const ReminderTimerHandler = require('./lib/handlers/ReminderTimerHandler')

async function main () {
  const configPath = process.argv[2]
  if (!configPath) {
    console.error('You must specify a configuration file path')
    return
  }

  const absoluteConfigPath = path.resolve(configPath)
  const config = require(absoluteConfigPath)

  const reminderCollection = await new MongoConnector(config.database.url, 'reminders').connect()

  const telegramClient = new TelegramClient(config.bot)
  const telegramBotEngine = new TelegramBotEngine(telegramClient, config.bot)

  const helpCommandHandler = new HelpCommandHandler(telegramClient)
  const helloCommandHandler = new HelloCommandHandler(telegramClient)
  const reminderCommandHandler = new ReminderCommandHandler(telegramClient, config.reminder, reminderCollection)

  telegramBotEngine.addCommandHandler(helpCommandHandler)
  telegramBotEngine.addCommandHandler(helloCommandHandler)
  telegramBotEngine.addCommandHandler(reminderCommandHandler)

  const reminderTimerHandler = new ReminderTimerHandler(telegramClient, config.reminder, reminderCollection)

  telegramBotEngine.addTimerHandler(reminderTimerHandler)

  telegramBotEngine.start()
}

main()
