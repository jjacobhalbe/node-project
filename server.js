const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const app = express()

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

const CLASSIFIED_FILE = path.join(__dirname, 'data', 'classifiedWords.json')

const readClassifiedWords = () => {
  try {
    const data = JSON.parse(fs.readFileSync(CLASSIFIED_FILE, 'utf8'))
    console.log(`✅ Loaded ${data.length} words from classifiedWords.json`)
    return data
  } catch (err) {
    console.error('❌ ERROR: Unable to read classifiedWords.json:', err)
    return []
  }
}
const splitIntoSentences = (text) => {
  return (
    text.match(/[^\.!\?]+[\.!\?]+/g)?.map((sentence) => sentence.trim()) || []
  )
}

app.post('/api/classify', (req, res) => {
  const { text } = req.body
  if (!text || typeof text !== 'string') {
    return res
      .status(400)
      .json({ error: 'Invalid input. Expected text string.' })
  }
  const words = text.split(/\s+/)
  const sentences = splitIntoSentences(text)
  const classifiedWords = readClassifiedWords()
  const levelMap = new Map(
    classifiedWords.map(({ word, level }) => [word.toLowerCase(), level])
  )

  const classified = words
    .filter((word) => word.trim() !== '')
    .map((word) => ({
      word,
      level: levelMap.get(word.toLowerCase()) || 'unknown',
    }))

  console.log(
    `🔍 Processed text: ${words.length} words, ${sentences.length} sentences.`
  )

  res.json({
    sentences,
    classifiedWords: classified,
  })
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})
