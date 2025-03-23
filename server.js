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
  try {
    const rawData = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(rawData)
  } catch (err) {
    console.error('Error reading words.json:', err)
    return []
  }
}

// Function to classify a batch of words using OpenAI
const classifyWordsBatch = async (words) => {
  try {
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
      model: 'gpt-3.5-turbo',
      messages,
    })

    // Try parsing the response as JSON.
    let result = {}
    const responseText = response.choices[0].message.content.trim()
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      // If parsing fails, fallback to splitting by newlines.
      const lines = responseText.split('\n')
      words.forEach((word, index) => {
        result[word] = lines[index] ? lines[index].trim() : 'unknown'
      })
    }

    // Map each word to its classification
    return words.map((word) => ({ word, level: result[word] || 'unknown' }))
  } catch (error) {
    console.error('Error classifying words batch:', error)
    return words.map((word) => ({ word, level: 'unknown' }))
  }
}

// New endpoint: Process all words and save classified results
app.post('/api/classify-all', async (req, res) => {
  // We ignore any payload; instead, read from words.json
  const wordsData = readWordsFromFile()
  // Expecting wordsData to be an array of objects with a "word" property (or simple strings)
  const words = wordsData.map((item) =>
    typeof item === 'string' ? item : item.word
  )

  const processedWords = []
  const batchSize = 50 // Adjust as needed to manage API usage

  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize)
    const classifiedBatch = await classifyWordsBatch(batch)
    processedWords.push(...classifiedBatch)
  }

  // Save classified words to a file (optional)
  const outputPath = path.join(__dirname, 'data', 'classifiedWords.json')
  try {
    fs.writeFileSync(
      outputPath,
      JSON.stringify(processedWords, null, 2),
      'utf8'
    )
    console.log(`Classified words saved to ${outputPath}`)
  } catch (writeError) {
    console.error('Error writing classified words:', writeError)
  }

  res.json({ processedWords })
})

// A simple endpoint to check that the backend is up
app.get('/', (req, res) => {
  res.send('Backend API is working!')
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
