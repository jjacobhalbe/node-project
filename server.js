require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { OpenAI } = require('openai')
const fs = require('fs')
const path = require('path')
const app = express()

app.use(cors())
app.use(express.json())

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Function to read words from words.json
const readWordsFromFile = () => {
  const filePath = path.join(__dirname, 'data', 'words.json')
  const rawData = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(rawData)
}

// Function to classify a batch of words via OpenAI
const classifyWordsBatch = async (words) => {
  try {
    const messages = [
      {
        role: 'system',
        content:
          'You are a language classification AI. You are tasked with classifying English words into levels based on the Common European Framework of Reference for Languages (CEFR). The levels are A1, A2, B1, B2, C1, C2. If the word does not exist in the dictionary, assign the level "unknown". Please return each word with its respective level as a key-value pair, one per line.',
      },
      {
        role: 'user',
        content: `Classify the following words based on the Cambridge Dictionary: ${words.join(
          ', '
        )}`,
      },
    ]

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
    })

    // Split the output by new lines; each line should correspond to one word's classification
    const levels = response.choices[0].message.content.trim().split('\n')

    // Map each word to its corresponding classification (or 'unknown' if missing)
    const classifiedWords = words.map((word, index) => {
      const level = levels[index] ? levels[index].trim() : 'unknown'
      return { word, level }
    })

    return classifiedWords
  } catch (error) {
    console.error('Error classifying words batch:', error)
    // If there's an error (like rate limit), return all words with "unknown" level
    return words.map((word) => ({ word, level: 'unknown' }))
  }
}

// POST endpoint: Process words in batches
app.post('/api/process-words', async (req, res) => {
  // In this implementation, we ignore any words sent in the request body
  // and instead read the full list from words.json
  const wordsData = readWordsFromFile()
  // Assuming words.json is an array of objects like { "word": "apple" },
  // extract the word strings:
  const words = wordsData.map((item) => item.word || item)
  const processedWords = []
  const batchSize = 50
  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize)
    const classifiedBatch = await classifyWordsBatch(batch)
    processedWords.push(...classifiedBatch)
  }
  res.json({ processedWords })
})

// Root endpoint for testing
app.get('/', (req, res) => {
  res.send('Backend API is working!')
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
