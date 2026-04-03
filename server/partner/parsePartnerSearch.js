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

function extractAllObjects(text, marker) {
  const results = []
  let offset = 0

  while (offset < text.length) {
    const foundIndex = text.indexOf(marker, offset)
    if (foundIndex < 0) break

    const objectText = extractBalanced(text.slice(foundIndex), marker, '{', '}')
    if (!objectText) break

    results.push(JSON.parse(objectText))
    offset = foundIndex + marker.length + objectText.length
  }

  return results
}

function parseTotalCount(decodedFlight) {
  const match = decodedFlight.match(/"children":\["총 ",(\d+),"대"\]/)
  return match ? Number(match[1]) : 0
}

function parsePartnerSearch(rawHtml) {
  const decodedFlight = decodeFlightStrings(rawHtml)
  const companyInfoText = extractBalanced(decodedFlight, 'companyInfo', '{', '}')

  if (!companyInfoText) {
    throw new Error('partner parser failed: companyInfo not found')
  }

  const companyInfo = JSON.parse(companyInfoText)
  const carInfos = extractAllObjects(decodedFlight, 'carInfo')
  const totalCount = parseTotalCount(decodedFlight)

  return {
    companyInfo,
    carInfos,
    totalCount,
    decodedFlight,
  }
}

module.exports = {
  decodeFlightStrings,
  parsePartnerSearch,
}
