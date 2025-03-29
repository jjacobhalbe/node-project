require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { OpenAI } = require('openai')
const fs = require('fs')
const path = require('path')

const app = express()

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

const openai = new OpenAI({ apiKey: process.env.API_KEY })

const WORDS_FILE = path.join(__dirname, 'data', 'words.json')
const CLASSIFIED_FILE = path.join(__dirname, 'data', 'classifiedWords.json')

const readWordsFromFile = () => {
  try {
    const words = JSON.parse(fs.readFileSync(WORDS_FILE, 'utf8'))
    console.log(`Loaded ${words.length} words from words.json`)
    return words
  } catch (err) {
    console.error('Error reading words.json:', err)
    return []
  }
}

const readClassifiedWords = () => {
  try {
    return require(CLASSIFIED_FILE)
  } catch (err) {
    console.log('No existing classified words found.')
    return []
  }
}

const classifyWordsBatch = async (words) => {
  try {
    console.log(`Sending batch of ${words.length} words to OpenAI`)

    const messages = [
      {
        role: 'system',
        content:
          'You are a language classification AI. Your task is to classify English words into CEFR levels: A1, A2, B1, B2, C1, C2. If a word is not found in the dictionary, assign "unknown". Return a JSON object where keys are words and values are levels.',
      },
      {
        role: 'user',
        content: `Classify these words: ${words.join(', ')}`,
      },
    ]

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages,
    })

    console.log('OpenAI response received:', response)

    const responseText = response.choices[0]?.message?.content?.trim()
    let result = {}

    try {
      result = JSON.parse(responseText)
      console.log(
        `Parsed OpenAI response successfully. Sample:`,
        Object.entries(result).slice(0, 5)
      )
    } catch (parseError) {
      console.warn('Failed to parse OpenAI response as JSON. Using fallback.')
      console.log('Raw OpenAI response:', responseText)

      const lines = responseText.split('\n')
      words.forEach((word, index) => {
        result[word] = lines[index] ? lines[index].trim() : 'unknown'
      })
    }

    return words.map((word) => ({ word, level: result[word] || 'unknown' }))
  } catch (error) {
    console.error('Error classifying words batch:', error)
    return words.map((word) => ({ word, level: 'unknown' }))
  }
}

app.post('/api/classify', async (req, res) => {
  console.log('Received request to classify words')

  const allWords = readWordsFromFile().map((item) => item.word)
  console.log(`Total words loaded: ${allWords.length}`)

  let classifiedWords = readClassifiedWords()
  console.log(`Previously classified words loaded: ${classifiedWords.length}`)

  const classifiedSet = new Set(classifiedWords.map((w) => w.word))
  const newWords = allWords.filter((word) => !classifiedSet.has(word))

  if (newWords.length === 0) {
    console.log('No new words to classify. Returning existing data.')
    return res.json({ processedWords: classifiedWords })
  }

  console.log(`Classifying ${newWords.length} new words...`)

  const batchSize = 50
  for (let i = 0; i < newWords.length; i += batchSize) {
    const batch = newWords.slice(i, i + batchSize)
    console.log(
      `Processing batch ${i / batchSize + 1} of ${Math.ceil(
        newWords.length / batchSize
      )}`
    )
    const classifiedBatch = await classifyWordsBatch(batch)
    classifiedWords.push(...classifiedBatch)
  }

  try {
    fs.writeFileSync(
      CLASSIFIED_FILE,
      JSON.stringify(classifiedWords, null, 2),
      'utf8'
    )
    console.log(`Updated classified words saved to ${CLASSIFIED_FILE}`)
  } catch (writeError) {
    console.error('Error writing classified words:', writeError)
  }

  res.json({ processedWords: classifiedWords })
})

app.get('/', (req, res) => res.send('Backend API is working!'))

const PORT = process.env.PORT || 8080
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
