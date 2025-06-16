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

const cleanWord = (word) => word.replace(/[^a-zA-Z]/g, '')

const splitIntoSentences = (text) => {
  const result = []
  const seen = new Set()
  let remainingText = text.trim()

  while (remainingText.length > 0) {
    const match = remainingText.match(/[.!?;]/)
    if (match) {
      const idx = match.index
      let sentence = remainingText.slice(0, idx + 1)

      let nextIdx = idx + 1
      while (
        nextIdx < remainingText.length &&
        /[.!?;]/.test(remainingText[nextIdx])
      ) {
        nextIdx++
      }

      while (
        nextIdx < remainingText.length &&
        !/[.!?;]/.test(remainingText[nextIdx]) &&
        remainingText[nextIdx] !== ' '
      ) {
        const nextMatch = remainingText.slice(nextIdx).match(/[.!?;]/)
        if (nextMatch) {
          const relIdx = nextMatch.index
          sentence += remainingText.slice(nextIdx, nextIdx + relIdx + 1)
          nextIdx += relIdx + 1

          while (
            nextIdx < remainingText.length &&
            /[.!?;]/.test(remainingText[nextIdx])
          ) {
            nextIdx++
          }
        } else {
          sentence += remainingText.slice(nextIdx)
          nextIdx = remainingText.length
        }
      }

      const normalized = sentence
        .trim()
        .replace(/[.!?;]+$/, '')
        .toLowerCase()

      if (!seen.has(normalized)) {
        result.push(sentence.trim())
        seen.add(normalized)
      }

      remainingText = remainingText.slice(nextIdx).trim()
    } else {
      const normalized = remainingText
        .trim()
        .replace(/[.!?;]+$/, '')
        .toLowerCase()

      if (!seen.has(normalized)) {
        result.push(remainingText)
        seen.add(normalized)
      }

      break
    }
  }

  return result
}

const levelScores = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
  unknown: 0,
  singleLetter: 0,
}

const classifyWord = (word, levelMap) => {
  const clean = cleanWord(word)
  if (clean.length === 0) return null
  return {
    word: clean,
    level: levelMap.get(clean.toLowerCase()) || 'unknown',
  }
}

const estimateSentenceLevel = (words) => {
  if (words.length === 0) return 'unknown'

  const totalScore = words.reduce(
    (sum, word) => sum + (levelScores[word.level] || 0),
    0
  )

  const avgScore = totalScore / words.length

  if (avgScore === 0) return 'unknown'
  if (avgScore < 1.5) return 'A1'
  if (avgScore < 2.5) return 'A2'
  if (avgScore < 3.5) return 'B1'
  if (avgScore < 4.5) return 'B2'
  if (avgScore < 5.5) return 'C1'
  return 'C2'
}

app.post('/api/classify', (req, res) => {
  const { text } = req.body
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Hey, you need to type something!' }) //implementing new error func
  }

  const classifiedWordsList = readClassifiedWords()
  const levelMap = new Map(
    classifiedWordsList.map(({ word, level }) => [word.toLowerCase(), level])
  )

  const allWords = text
    .trim()
    .split(/\s+/)
    .map((word) => classifyWord(word, levelMap))
    .filter(Boolean)

  const sentences = splitIntoSentences(text)
  const sentenceResults = sentences.map((sentence) => {
    const words = sentence
      .trim()
      .split(/\s+/)
      .map((word) => classifyWord(word, levelMap))
      .filter(Boolean)

    const sentenceLevel = estimateSentenceLevel(words)

    return {
      sentence,
      words,
      sentenceLevel,
    }
  })

  res.json({
    sentences: sentenceResults,
    words: allWords,
  })
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})
