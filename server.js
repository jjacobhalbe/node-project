require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { OpenAI } = require('openai')
const fs = require('fs')
const path = require('path')

const app = express()

// CORS Configuration
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// Debug: Log API key status
console.log(
  '🔑 OpenAI API Key (first 5 chars):',
  process.env.API_KEY?.slice(0, 5) || 'Not loaded!'
)

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.API_KEY })

const WORDS_FILE = path.join(__dirname, 'data', 'words.json')
const CLASSIFIED_FILE = path.join(__dirname, 'data', 'classifiedWords.json')

// Read words from file
const readWordsFromFile = () => {
  try {
    const words = JSON.parse(fs.readFileSync(WORDS_FILE, 'utf8'))
    console.log(`✅ Loaded ${words.length} words from words.json`)
    return words
  } catch (err) {
    console.error('❌ ERROR: Unable to read words.json:', err)
    return []
  }
}

// Read already classified words
const readClassifiedWords = () => {
  try {
    return require(CLASSIFIED_FILE)
  } catch (err) {
    console.log('⚠️ No existing classified words found.')
    return []
  }
}

// Classify words batch with OpenAI
const classifyWordsBatch = async (words) => {
  try {
    console.log(`📤 Sending batch of ${words.length} words to OpenAI`)

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

    console.log('✅ OpenAI response received.')

    const responseText = response.choices[0]?.message?.content?.trim()
    let result = {}

    try {
      result = JSON.parse(responseText)
      console.log(
        `✅ Parsed OpenAI response. Sample:`,
        Object.entries(result).slice(0, 5)
      )
    } catch (parseError) {
      console.warn(
        '⚠️ Failed to parse OpenAI response as JSON. Using fallback.'
      )
      console.log('📜 Raw OpenAI response:', responseText)

      const lines = responseText.split('\n')
      words.forEach((word, index) => {
        result[word] = lines[index] ? lines[index].trim() : 'unknown'
      })
    }

    return words.map((word) => ({ word, level: result[word] || 'unknown' }))
  } catch (error) {
    console.error('❌ ERROR: OpenAI classification failed:', error)
    return words.map((word) => ({ word, level: 'unknown' }))
  }
}

// Endpoint to classify words
app.post('/api/classify', async (req, res) => {
  console.log('✅ Received request to classify words.')

  const allWords = readWordsFromFile().map((item) => item.word)
  console.log(`✅ Loaded ${allWords.length} words from words.json`)

  if (allWords.length === 0) {
    console.error('❌ ERROR: words.json is empty or not loaded!')
    return res.status(500).json({ error: 'words.json is empty or missing' })
  }

  let classifiedWords = readClassifiedWords()
  const classifiedSet = new Set(classifiedWords.map((w) => w.word))

  const newWords = allWords.filter((word) => !classifiedSet.has(word))

  if (newWords.length === 0) {
    console.log('✅ No new words to classify. Returning existing data.')
    return res.json({ processedWords: classifiedWords })
  }

  console.log(`📦 Sending ${newWords.length} words to OpenAI...`)

  const batchSize = 50
  for (let i = 0; i < newWords.length; i += batchSize) {
    const batch = newWords.slice(i, i + batchSize)
    console.log(`📤 Processing batch:`, batch)
    const classifiedBatch = await classifyWordsBatch(batch)
    classifiedWords.push(...classifiedBatch)
  }

  try {
    fs.writeFileSync(
      CLASSIFIED_FILE,
      JSON.stringify(classifiedWords, null, 2),
      'utf8'
    )
    console.log(`✅ Successfully saved classified words to ${CLASSIFIED_FILE}`)
  } catch (writeError) {
    console.error('❌ ERROR: Failed to write classifiedWords.json:', writeError)
  }

  res.json({ processedWords: classifiedWords })
})

// Simple API check
app.get('/', (req, res) => {
  console.log('✅ Backend API was accessed!')
  res.send('Backend API is working!')
})

// Start server
const PORT = process.env.PORT || 8080
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))
