function decodeFlightStrings(html) {
  const regex = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)<\/script>/g
  const parts = []
  let match

  while ((match = regex.exec(html))) {
    parts.push(JSON.parse(`"${match[1]}"`))
  }

  return parts.join('')
}

function extractBalanced(text, startToken, openChar, closeChar) {
  const tokenIndex = text.indexOf(startToken)
  if (tokenIndex < 0) return null

  const startIndex = text.indexOf(openChar, tokenIndex)
  if (startIndex < 0) return null

  let depth = 0
  let inString = false
  let isEscaped = false

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index]

    if (inString) {
      if (isEscaped) {
        isEscaped = false
      } else if (char === '\\') {
        isEscaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === openChar) {
      depth += 1
      continue
    }

    if (char === closeChar) {
      depth -= 1
      if (depth === 0) {
        return text.slice(startIndex, index + 1)
      }
    }
  }

  return null
}

function parsePartnerCarDetail(rawHtml) {
  const decodedFlight = decodeFlightStrings(rawHtml)
  const companyInfoText = extractBalanced(decodedFlight, 'companyInfo', '{', '}')
  const carDetailInfoText = extractBalanced(decodedFlight, 'carDetailInfo', '{', '}')

  if (!companyInfoText) {
    throw new Error('partner detail parser failed: companyInfo not found')
  }

  if (!carDetailInfoText) {
    throw new Error('partner detail parser failed: carDetailInfo not found')
  }

  return {
    companyInfo: JSON.parse(companyInfoText),
    carDetailInfo: JSON.parse(carDetailInfoText),
    decodedFlight,
  }
}

module.exports = {
  decodeFlightStrings,
  parsePartnerCarDetail,
}
