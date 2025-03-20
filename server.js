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

const classifyWord = async (word) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a language classification AI. You are tasked with classifying English words into levels based on the Common European Framework of Reference for Languages (CEFR). The levels are A1, A2, B1, B2, C1, C2. If the word does not exist in the dictionary, assign the level "unknown". Please return the word and its level as a key-value pair.',
        },
        {
          role: 'user',
          content: `Classify the word "${word}" based on the Cambridge Dictionary.`,
        },
      ],
    })

    const level = response.choices[0].message.content.trim()

    const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'unknown']
    if (!validLevels.includes(level)) {
      return { word, level: 'unknown' }
    }

    return { word, level }
  } catch (error) {
    console.error('Error classifying word:', error)
    return { word, level: 'unknown' }
  }
}

app.post('/api/process-words', async (req, res) => {
  const wordList = req.body.words

  const processedWords = []

  for (const word of wordList) {
    const classifiedWord = await classifyWord(word)
    processedWords.push(classifiedWord)
  }

  res.json({ processedWords })
})

app.get('/', (req, res) => {
  res.send('Backend API is working!')
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
