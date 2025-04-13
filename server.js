/*
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { OpenAI } = require('openai')
const fs = require('fs')
const path = require('path')
const app = express()

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

console.log(
  '🔑 OpenAI API Key (first 5 chars):',
  process.env.API_KEY?.slice(0, 5) || 'Not loaded!'
)

const openai = new OpenAI({ apiKey: process.env.API_KEY })
const WORDS_FILE = path.join(__dirname, 'data', 'words.json')
const CLASSIFIED_FILE = path.join(__dirname, 'data', 'classifiedWords.json')

// Read words.json
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

// Read existing classifiedWords.json
const readClassifiedWords = () => {
  try {
    return require(CLASSIFIED_FILE)
  } catch (err) {
    console.log('⚠️ No existing classified words found.')
    return []
  }
}

// Send batch to OpenAI
const classifyWordsBatch = async (words) => {
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

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
    })

    const responseText = response.choices[0]?.message?.content?.trim()
    let result = {}

    try {
      let jsonString = responseText
      const match = responseText.match(/```json\s*([\s\S]*?)\s*```/)
      if (match) jsonString = match[1]
      result = JSON.parse(jsonString)
      console.log(
        `✅ Parsed OpenAI response. Sample:`,
        Object.entries(result).slice(0, 5)
      )
    } catch (parseError) {
      console.warn('⚠️ Failed to parse JSON, falling back to line-by-line.')
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

// Classify all unprocessed words
const classifyAllWords = async () => {
  const allWords = readWordsFromFile().map((item) => item.word)
  if (allWords.length === 0) {
    console.error('❌ ERROR: words.json is empty or missing!')
    return
  }

  let classifiedWords = readClassifiedWords()
  const classifiedSet = new Set(classifiedWords.map((w) => w.word))
  const newWords = allWords.filter((word) => !classifiedSet.has(word))

  if (newWords.length === 0) {
    console.log('✅ No new words to classify. Everything is up to date.')
    return
  }

  console.log(`📦 Found ${newWords.length} new words to classify...`)
  const batchSize = 200

  for (let i = 0; i < newWords.length; i += batchSize) {
    const batch = newWords.slice(i, i + batchSize)
    console.log(`🔄 Processing batch ${i / batchSize + 1}`)

    const classifiedBatch = await classifyWordsBatch(batch)
    classifiedWords.push(...classifiedBatch)

    try {
      fs.writeFileSync(
        CLASSIFIED_FILE,
        JSON.stringify(classifiedWords, null, 2),
        'utf8'
      )
      console.log(`💾 Batch saved successfully to classifiedWords.json`)
    } catch (writeError) {
      console.error('❌ ERROR saving batch:', writeError)
    }
  }

  console.log('🎉 All new words classified and saved!')
}

// POST route (manual trigger)
app.post('/api/classify', async (req, res) => {
  console.log('✅ Received POST request to classify words.')
  await classifyAllWords()
  const classifiedWords = readClassifiedWords()
  res.json({ processedWords: classifiedWords })
})

// Basic GET route
app.get('/', (req, res) => {
  console.log('✅ Backend API was accessed!')
  res.send('Backend API is working!')
})

// Start server and classification
const PORT = process.env.PORT || 8080
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`)
  await classifyAllWords()
})
*/
