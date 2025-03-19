const express = require('express')
const { OpenAI } = require('openai')
const app = express()

// Initialize OpenAI with your API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Make sure to store the API key in .env
})

// Middleware to parse JSON requests
app.use(express.json())

// Function to ask OpenAI to classify a word
const classifyWord = async (word) => {
  try {
    // Send the word to OpenAI to classify based on Cambridge Dictionary standards
    const response = await openai.chat.completions.create({
      model: 'gpt-4', // or 'gpt-3.5-turbo' depending on what you're using
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

    // Extract the classification level from the response
    const level = response.choices[0].message.content.trim()

    // Validate the level, making sure it is one of the allowed levels
    const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'unknown']
    if (!validLevels.includes(level)) {
      return { word, level: 'unknown' } // Default to unknown if the classification is invalid
    }

    return { word, level }
  } catch (error) {
    console.error('Error classifying word:', error)
    return { word, level: 'unknown' } // Return 'unknown' if there's an error
  }
}

// POST route to process words with AI
app.post('/api/process-words', async (req, res) => {
  const wordList = req.body.words

  // Classify each word in the list using OpenAI
  const processedWords = []

  for (const word of wordList) {
    const classifiedWord = await classifyWord(word)
    processedWords.push(classifiedWord) // Push the { word, level } pair
  }

  res.json({ processedWords }) // Return the word-level pairs
})

// Port for the server to listen on
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
