const express = require('express')
const app = express()

app.get('/api/words', (req, res) => {
  const wordList = ['apple', 'banana', 'cherry']
  res.json(wordList)
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
