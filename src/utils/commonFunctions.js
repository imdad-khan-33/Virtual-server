function extractJson(text) {
    const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
    const match = text.match(jsonRegex);
    return match ? match[1].trim() : null;
  }

  function cleanResponse(text) {
  return text
    .replace(/[*_`]+/g, '')              // remove markdown chars (*, _, `)
    .replace(/\n{2,}/g, '\n\n')          // normalize multiple line breaks
    .replace(/^\s+|\s+$/g, '')           // trim leading/trailing whitespace
    .replace(/[ ]{2,}/g, ' ');           // normalize multiple spaces
}



export {extractJson, cleanResponse}