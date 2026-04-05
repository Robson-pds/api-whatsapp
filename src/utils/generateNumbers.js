const generateNumbers = () => {
  const min = 100000
  const max = 599999
  return Math.floor(Math.random() * max) + min
}

module.exports = generateNumbers
