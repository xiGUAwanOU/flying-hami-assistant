const mongodb = require('mongodb')

class MongoConnector {
  constructor (url, collectionName) {
    this.url = url
    this.collectionName = collectionName
  }

  async connect () {
    return (await mongodb.MongoClient.connect(this.url, { useNewUrlParser: true })).db().collection(this.collectionName)
  }
}

module.exports = MongoConnector
