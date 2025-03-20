require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { OpenAI } = require('openai')
const app = express()

app.use(cors())

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

app.use(express.json())

// Function to classify a batch of words
const classifyWordsBatch = async (words) => {
  try {
    const messages = [
      {
        role: 'system',
        content:
          'You are a language classification AI. You are tasked with classifying English words into levels based on the Common European Framework of Reference for Languages (CEFR). The levels are A1, A2, B1, B2, C1, C2. If the word does not exist in the dictionary, assign the level "unknown". Please return each word with its respective level as a key-value pair.',
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

    const levels = response.choices[0].message.content.trim().split('\n')
    const classifiedWords = words.map((word, index) => {
      const level = levels[index] || 'unknown'
      return { word, level }
    })

    return classifiedWords
  } catch (error) {
    console.error('Error classifying words batch:', error)
    return words.map((word) => ({ word, level: 'unknown' }))
  }
}

// This route processes a list of words by batching them and classifying them in chunks
app.post('/api/process-words', async (req, res) => {
  const wordList = req.body.words

  const processedWords = []

  // Process the words in batches of 50
  const batchSize = 50
  for (let i = 0; i < wordList.length; i += batchSize) {
    const batch = wordList.slice(i, i + batchSize)
    const classifiedBatch = await classifyWordsBatch(batch)
    processedWords.push(...classifiedBatch)
  }

  res.json({ processedWords })
})

app.get('/', (req, res) => {
  res.send('Backend API is working!')
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
